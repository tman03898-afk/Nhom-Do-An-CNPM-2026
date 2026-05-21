const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const pool = require('../config/db');
const { requireAuth, requireTenant } = require('../middleware/auth');
const { ensureTenantsTable, ensureUsersTable } = require('./_dbHelpers');
const { once } = require('./_schemaCache');
const { sendProfileOtpSms, sendPasswordRecoverySms } = require('../services/sms');
const { sendTenantEmailVerificationCode, sendTenantPasswordRecoveryEmail } = require('../services/mail');
const {
  assertNotBlocked,
  registerFailure,
  clearRateLimit,
  registerAttempt,
  clientIp,
} = require('../utils/sensitiveRateLimit');

const router = express.Router();
const OTP_TTL_MIN = 10;
const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

async function ensureTenantProfileSchema() {
  return once('schema:tenant_profile', async () => {
    await ensureUsersTable();
    await ensureTenantsTable();

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd VARCHAR(30)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_profile_otps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenant_profile_otps_user_id ON tenant_profile_otps(user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_email_verifications (
        user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        new_email VARCHAR(255) NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_password_recovery_otps (
        user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        channel VARCHAR(10) NOT NULL CHECK (channel IN ('SMS', 'EMAIL')),
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });
}

const avatarUploadDir = path.join(__dirname, '../../uploads/tenant-avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `tenant-${req.auth.sub}-${Date.now()}${safeExt}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP'));
  },
});

async function getTenantPhoneForUser(userId) {
  const r = await pool.query(`SELECT t.phone FROM tenants t WHERE t.user_id = $1 LIMIT 1`, [userId]);
  const raw = r.rows[0]?.phone;
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 9 ? raw : null;
}

function maskPhone(p) {
  const s = String(p || '').replace(/\D/g, '');
  if (s.length < 6) return '***';
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
}

/** OTP SMS tới SĐT đăng ký (tenant.phone). Twilio hoặc fallback log (dev). */
router.post('/tenant/profile/request-otp', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantProfileSchema();

    const phone = await getTenantPhoneForUser(req.auth.sub);
    if (!phone || String(phone).replace(/\D/g, '').length < 9) {
      return res.status(400).json({
        ok: false,
        message: 'Tài khoản chưa có số điện thoại đăng ký hợp lệ. Liên hệ ban quản lý để cập nhật.',
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 8);

    await pool.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);
    await pool.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
    await pool.query(
      `INSERT INTO tenant_profile_otps (user_id, code_hash, expires_at)
       VALUES ($1, $2, NOW() + $3::interval)`,
      [req.auth.sub, codeHash, `${OTP_TTL_MIN} minutes`]
    );

    let sent;
    try {
      sent = await sendProfileOtpSms(phone, code);
      console.log(`[OTP SMS] user_id=${req.auth.sub} provider=${sent.provider} target=${sent.to}`);
    } catch (sendErr) {
      console.error('SMS send failed:', sendErr);
      await pool.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);
      const msg =
        sendErr?.message === 'INVALID_PHONE'
          ? 'Số điện thoại không hợp lệ để gửi SMS.'
          : sendErr?.message?.includes('SMS_NOT_CONFIGURED')
            ? 'Bật Twilio trong .env hoặc bỏ SMS_REQUIRE_REAL=1 để dùng chế độ demo (mã trong terminal/API).'
            : 'Không gửi được tin nhắn SMS. Thử lại sau.';
      return res.status(503).json({ ok: false, message: msg });
    }

    const payload = {
      ok: true,
      message:
        sent.provider === 'twilio'
          ? `Đã gửi mã OTP qua tin nhắn tới số ${maskPhone(phone)}.`
          : `Đã tạo mã OTP (chưa gửi SMS — chưa cấu hình Twilio). Xem mã trong cửa sổ chạy backend hoặc ô demo_otp bên dưới.`,
      expires_in_seconds: OTP_TTL_MIN * 60,
      masked_phone: maskPhone(phone),
      sms_provider: sent.provider,
    };

    if (process.env.OTP_DEBUG === '1') {
      payload.debug_otp = code;
    }
    if (sent.provider === 'log') {
      payload.demo_otp = code;
    }

    return res.json(payload);
  } catch (err) {
    console.error('Request profile OTP error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Gửi mã 6 số tới email mới (để xác nhận trước khi đổi email). */
router.post('/tenant/profile/request-email-code', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantProfileSchema();

    const raw = req.body?.new_email ?? req.body?.email;
    const normalized = normalizeEmail(raw);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ ok: false, message: 'Email không hợp lệ.' });
    }

    const userRes = await pool.query(`SELECT email, full_name FROM users WHERE user_id = $1`, [
      req.auth.sub,
    ]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản.' });
    }
    const currentEmail = normalizeEmail(userRes.rows[0].email);
    if (normalized === currentEmail) {
      return res.status(400).json({ ok: false, message: 'Trùng với email hiện tại.' });
    }

    const dup = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(TRIM(email)) = $1 AND user_id <> $2 LIMIT 1`,
      [normalized, req.auth.sub]
    );
    if (dup.rowCount > 0) {
      return res.status(400).json({ ok: false, message: 'Email đã được sử dụng bởi tài khoản khác.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 8);

    await pool.query(`DELETE FROM tenant_email_verifications WHERE user_id = $1`, [req.auth.sub]);
    await pool.query(
      `INSERT INTO tenant_email_verifications (user_id, new_email, code_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + $4::interval)`,
      [req.auth.sub, normalized, codeHash, `${OTP_TTL_MIN} minutes`]
    );

    try {
      await sendTenantEmailVerificationCode(normalized, code, userRes.rows[0].full_name);
    } catch (mailErr) {
      console.error('Email verification send failed:', mailErr);
      await pool.query(`DELETE FROM tenant_email_verifications WHERE user_id = $1`, [req.auth.sub]);
      const msg = mailErr?.message?.includes('MAIL_NOT_CONFIGURED')
        ? 'Chưa cấu hình gửi email (SMTP). Kiểm tra SMTP_HOST, SMTP_USER, SMTP_PASS trong .env.'
        : 'Không gửi được email. Kiểm tra cấu hình SMTP.';
      return res.status(503).json({ ok: false, message: msg });
    }

    const payload = {
      ok: true,
      message: `Đã gửi mã xác nhận tới ${maskEmailUi(normalized)}.`,
      masked_email: maskEmailUi(normalized),
      expires_in_seconds: OTP_TTL_MIN * 60,
    };

    if (process.env.OTP_DEBUG === '1') {
      payload.debug_email_code = code;
    }

    return res.json(payload);
  } catch (err) {
    console.error('Request email code error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Bước 1 đổi mật khẩu: chỉ kiểm tra mật khẩu hiện tại (không tạo OTP). */
router.post('/tenant/profile/verify-current-password', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantProfileSchema();
    const { current_password } = req.body || {};
    const cur = String(current_password || '');
    if (!cur) {
      return res.status(400).json({ ok: false, message: 'Nhập mật khẩu hiện tại.' });
    }

    const key = `tenant-verify-cur:${req.auth.sub}`;
    const nb = assertNotBlocked(key);
    if (nb.blocked) {
      return res.status(429).json({
        ok: false,
        message: `Thử quá nhiều lần. Vui lòng chờ ${nb.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: nb.retryAfterSec,
      });
    }

    const r = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.auth.sub]);
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản.' });
    }

    const match = await bcrypt.compare(cur, String(r.rows[0].password_hash || ''));
    if (!match) {
      const fr = registerFailure(key);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Nhập sai mật khẩu quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Mật khẩu hiện tại không đúng.' });
    }

    clearRateLimit(key);
    return res.json({ ok: true, message: 'Xác nhận mật khẩu hiện tại thành công.' });
  } catch (err) {
    console.error('Verify current password error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Quên mật khẩu (đã đăng nhập): gửi mã 6 số qua SMS hoặc email đăng ký. */
router.post('/tenant/profile/password-recovery/request', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantProfileSchema();
    const rawCh = String(req.body?.channel || '').trim().toUpperCase();
    if (rawCh !== 'SMS' && rawCh !== 'EMAIL') {
      return res.status(400).json({ ok: false, message: 'channel phải là sms hoặc email.' });
    }

    const ip = clientIp(req);
    const gate = registerAttempt(`tenant-pw-rec-req:${req.auth.sub}:${ip}`);
    if (!gate.ok) {
      return res.status(429).json({
        ok: false,
        message: `Yêu cầu mã quá nhiều lần. Vui lòng chờ ${gate.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: gate.retryAfterSec,
      });
    }

    const userRes = await pool.query(
      `SELECT u.user_id, u.email, u.full_name FROM users u WHERE u.user_id = $1`,
      [req.auth.sub]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản.' });
    }
    const u = userRes.rows[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 8);

    await pool.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
    await pool.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);

    if (rawCh === 'SMS') {
      const phone = await getTenantPhoneForUser(req.auth.sub);
      if (!phone || String(phone).replace(/\D/g, '').length < 9) {
        return res.status(400).json({
          ok: false,
          message: 'Tài khoản chưa có số điện thoại đăng ký hợp lệ.',
        });
      }
      await pool.query(
        `INSERT INTO tenant_password_recovery_otps (user_id, channel, code_hash, expires_at)
         VALUES ($1, 'SMS', $2, NOW() + $3::interval)`,
        [req.auth.sub, codeHash, `${OTP_TTL_MIN} minutes`]
      );
      try {
        const sent = await sendPasswordRecoverySms(phone, code);
        const payload = {
          ok: true,
          message:
            sent.provider === 'twilio'
              ? `Đã gửi mã tới số ${maskPhone(phone)}.`
              : `Đã tạo mã (chưa gửi SMS — xem backend hoặc demo_otp).`,
          channel: 'SMS',
          masked_phone: maskPhone(phone),
          expires_in_seconds: OTP_TTL_MIN * 60,
          sms_provider: sent.provider,
        };
        if (process.env.OTP_DEBUG === '1') payload.debug_otp = code;
        if (sent.provider === 'log') payload.demo_otp = code;
        return res.json(payload);
      } catch (sendErr) {
        await pool.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
        const msg =
          sendErr?.message === 'INVALID_PHONE'
            ? 'Số điện thoại không hợp lệ.'
            : sendErr?.message?.includes('SMS_NOT_CONFIGURED')
              ? 'Cấu hình Twilio hoặc bỏ SMS_REQUIRE_REAL=1 khi dev.'
              : 'Không gửi được SMS.';
        return res.status(503).json({ ok: false, message: msg });
      }
    }

    const emailTo = normalizeEmail(u.email);
    await pool.query(
      `INSERT INTO tenant_password_recovery_otps (user_id, channel, code_hash, expires_at)
       VALUES ($1, 'EMAIL', $2, NOW() + $3::interval)`,
      [req.auth.sub, codeHash, `${OTP_TTL_MIN} minutes`]
    );
    try {
      await sendTenantPasswordRecoveryEmail(emailTo, code, u.full_name);
    } catch (mailErr) {
      await pool.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
      const msg = mailErr?.message?.includes('MAIL_NOT_CONFIGURED')
        ? 'Chưa cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS).'
        : 'Không gửi được email.';
      return res.status(503).json({ ok: false, message: msg });
    }

    const payload = {
      ok: true,
      message: `Đã gửi mã tới ${maskEmailUi(emailTo)}.`,
      channel: 'EMAIL',
      masked_email: maskEmailUi(emailTo),
      expires_in_seconds: OTP_TTL_MIN * 60,
    };
    if (process.env.OTP_DEBUG === '1') payload.debug_email_code = code;
    return res.json(payload);
  } catch (err) {
    console.error('Password recovery request error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Áp dụng mã quên mật khẩu + mật khẩu mới (không cần mật khẩu cũ). */
router.post('/tenant/profile/password-recovery/apply', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTenantProfileSchema();
    const { channel, code, new_password, password_confirm } = req.body || {};
    const rawCh = String(channel || '').trim().toUpperCase();
    const codeStr = String(code || '').trim();
    const pw = String(new_password || '');
    const pw2 = String(password_confirm != null ? password_confirm : new_password || '');

    if (rawCh !== 'SMS' && rawCh !== 'EMAIL') {
      return res.status(400).json({ ok: false, message: 'channel phải là sms hoặc email.' });
    }
    if (!/^\d{6}$/.test(codeStr)) {
      return res.status(400).json({ ok: false, message: 'Mã gồm 6 chữ số.' });
    }
    if (pw.length < 8) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu mới tối thiểu 8 ký tự.' });
    }
    if (pw !== pw2) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu xác nhận không khớp.' });
    }

    const failKey = `tenant-pw-rec-fail:${req.auth.sub}`;
    const nb = assertNotBlocked(failKey);
    if (nb.blocked) {
      return res.status(429).json({
        ok: false,
        message: `Thử quá nhiều lần. Vui lòng chờ ${nb.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: nb.retryAfterSec,
      });
    }

    await client.query('BEGIN');
    const rowRes = await client.query(
      `SELECT channel, code_hash, expires_at
       FROM tenant_password_recovery_otps
       WHERE user_id = $1
       FOR UPDATE`,
      [req.auth.sub]
    );
    if (rowRes.rowCount === 0) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Chưa có mã. Bấm gửi mã SMS hoặc Gmail trước.' });
    }

    const row = rowRes.rows[0];
    if (String(row.channel).toUpperCase() !== rawCh) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Kênh xác thực không khớp với mã đã gửi.' });
    }

    if (new Date(row.expires_at) < new Date()) {
      await client.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
      await client.query('COMMIT');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Mã đã hết hạn. Gửi mã mới.' });
    }

    const ok = await bcrypt.compare(codeStr, String(row.code_hash || ''));
    if (!ok) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Nhập sai mã quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Mã không đúng.' });
    }

    const hash = await bcrypt.hash(pw, SALT_ROUNDS);
    await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`, [
      hash,
      req.auth.sub,
    ]);
    await client.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [req.auth.sub]);
    await client.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);
    await client.query('COMMIT');

    clearRateLimit(failKey);
    clearRateLimit(`tenant-pw:${req.auth.sub}`);
    clearRateLimit(`tenant-verify-cur:${req.auth.sub}`);

    const fresh = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.is_active,
         u.avatar_url,
         u.cccd,
         u.date_of_birth,
         t.tenant_id,
         t.phone,
         r.room_id,
         r.room_number,
         r.status AS room_status
       FROM users u
       LEFT JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [req.auth.sub]
    );

    return res.json({
      ok: true,
      message: 'Đã đặt lại mật khẩu.',
      tenant: fresh.rows[0],
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Password recovery apply error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

function maskEmailUi(email) {
  const s = String(email);
  const at = s.indexOf('@');
  if (at < 2) return '***';
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

/** Upload ảnh đại diện (không cần OTP) */
router.post(
  '/tenant/profile/avatar',
  requireAuth,
  requireTenant,
  (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          ok: false,
          message: err.message || 'Không tải được ảnh.',
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      await ensureTenantProfileSchema();
      if (!req.file) {
        return res.status(400).json({ ok: false, message: 'Chọn file ảnh (JPG, PNG, GIF, WebP).' });
      }

      const publicPath = `/uploads/tenant-avatars/${req.file.filename}`;

      const prevRes = await pool.query(`SELECT avatar_url FROM users WHERE user_id = $1`, [
        req.auth.sub,
      ]);
      const prevUrl = prevRes.rows[0]?.avatar_url;

      await pool.query(`UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2`, [
        publicPath,
        req.auth.sub,
      ]);

      try {
        if (
          prevUrl &&
          typeof prevUrl === 'string' &&
          prevUrl.startsWith('/uploads/tenant-avatars/')
        ) {
          const base = path.basename(prevUrl);
          const absOld = path.join(avatarUploadDir, base);
          if (fs.existsSync(absOld) && absOld.startsWith(avatarUploadDir) && absOld !== req.file.path) {
            fs.unlinkSync(absOld);
          }
        }
      } catch (unlinkErr) {
        console.warn('Remove old avatar:', unlinkErr);
      }

      const fresh = await pool.query(
        `SELECT
           u.user_id,
           u.full_name,
           u.email,
           u.role,
           u.is_active,
           u.avatar_url,
           u.cccd,
           u.date_of_birth,
           t.tenant_id,
           t.phone,
           r.room_id,
           r.room_number,
           r.status AS room_status
         FROM users u
         LEFT JOIN tenants t ON t.user_id = u.user_id
         LEFT JOIN rooms r ON r.room_id = t.room_id
         WHERE u.user_id = $1
         LIMIT 1`,
        [req.auth.sub]
      );

      return res.json({
        ok: true,
        message: 'Đã cập nhật ảnh đại diện.',
        tenant: fresh.rows[0],
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (e) {}
      return res.status(500).json({ ok: false, message: 'internal error' });
    }
  }
);

/**
 * Xác nhận OTP SMS + (nếu đổi email) mã email; cập nhật users/tenants.
 */
router.post('/tenant/profile/update', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTenantProfileSchema();

    const {
      otp,
      phone: newPhoneRaw,
      email: newEmailRaw,
      email_otp: emailOtpRaw,
      full_name,
      cccd,
      date_of_birth,
      new_password,
      current_password,
    } = req.body || {};

    const otpStr = String(otp || '').trim();
    if (!/^\d{6}$/.test(otpStr)) {
      return res.status(400).json({ ok: false, message: 'Mã OTP SMS gồm 6 chữ số.' });
    }

    const profileRes = await client.query(
      `SELECT u.user_id, u.password_hash, u.full_name, u.email, u.cccd, u.date_of_birth,
              t.phone AS tenant_phone
       FROM users u
       LEFT JOIN tenants t ON t.user_id = u.user_id
       WHERE u.user_id = $1`,
      [req.auth.sub]
    );
    if (profileRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'user not found' });
    }
    const prof = profileRes.rows[0];
    const currentEmail = normalizeEmail(prof.email);
    const nextEmail =
      newEmailRaw != null && String(newEmailRaw).trim() !== ''
        ? normalizeEmail(newEmailRaw)
        : null;
    const emailChanging = Boolean(nextEmail && nextEmail !== currentEmail);

    const currentPhone = prof.tenant_phone != null ? String(prof.tenant_phone).trim() : '';
    const nextPhone =
      newPhoneRaw != null && String(newPhoneRaw).trim() !== ''
        ? String(newPhoneRaw).trim()
        : null;

    const nameChanging =
      full_name != null && String(full_name).trim() !== '' && String(full_name).trim() !== String(prof.full_name || '').trim();
    const phoneChanging =
      Boolean(nextPhone) &&
      String(nextPhone).replace(/\D/g, '') !== String(currentPhone || '').replace(/\D/g, '');

    const rowEx = prof;
    const cccdChanged =
      cccd != null && String(cccd).trim() !== String(rowEx.cccd || '').trim();
    const dobChanged =
      date_of_birth != null &&
      String(date_of_birth).trim() !== '' &&
      String(date_of_birth).trim() !== toIsoDateStr(rowEx.date_of_birth);

    const hasChanges =
      nameChanging ||
      phoneChanging ||
      cccdChanged ||
      dobChanged ||
      (new_password != null && String(new_password).length > 0) ||
      emailChanging;

    if (!hasChanges) {
      return res.status(400).json({ ok: false, message: 'Chưa có thay đổi nào để lưu.' });
    }

    const hasNewPassword = new_password != null && String(new_password).length > 0;
    if (hasNewPassword) {
      const nb = assertNotBlocked(`tenant-pw:${req.auth.sub}`);
      if (nb.blocked) {
        return res.status(429).json({
          ok: false,
          message: `Đổi mật khẩu thử quá nhiều lần. Vui lòng chờ ${nb.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: nb.retryAfterSec,
        });
      }
    }

    if (emailChanging) {
      const dup = await client.query(
        `SELECT 1 FROM users WHERE LOWER(TRIM(email)) = $1 AND user_id <> $2 LIMIT 1`,
        [nextEmail, req.auth.sub]
      );
      if (dup.rowCount > 0) {
        return res.status(400).json({ ok: false, message: 'Email đã được sử dụng.' });
      }

      const emailOtp = String(emailOtpRaw || '').trim();
      if (!/^\d{6}$/.test(emailOtp)) {
        return res.status(400).json({
          ok: false,
          message: 'Đổi email cần mã xác nhận gửi tới email mới (6 chữ số).',
        });
      }

      const evRes = await client.query(
        `SELECT new_email, code_hash, expires_at FROM tenant_email_verifications WHERE user_id = $1`,
        [req.auth.sub]
      );
      if (evRes.rowCount === 0) {
        return res.status(400).json({
          ok: false,
          message: 'Chưa có mã email. Bấm \"Gửi mã tới email\" trước khi lưu.',
        });
      }
      const ev = evRes.rows[0];
      if (normalizeEmail(ev.new_email) !== nextEmail) {
        return res.status(400).json({
          ok: false,
          message: 'Email không khớp với mã đã gửi. Gửi lại mã hoặc nhập đúng email đã xác nhận.',
        });
      }
      if (new Date(ev.expires_at) < new Date()) {
        await client.query(`DELETE FROM tenant_email_verifications WHERE user_id = $1`, [
          req.auth.sub,
        ]);
        return res.status(400).json({ ok: false, message: 'Mã email đã hết hạn. Gửi lại mã mới.' });
      }
      const emailOk = await bcrypt.compare(emailOtp, ev.code_hash);
      if (!emailOk) {
        return res.status(400).json({ ok: false, message: 'Mã xác nhận email không đúng.' });
      }
    }

    const otpRow = await client.query(
      `SELECT id, code_hash, expires_at FROM tenant_profile_otps WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [req.auth.sub]
    );
    if (otpRow.rowCount === 0) {
      return res.status(400).json({ ok: false, message: 'Chưa có mã OTP SMS. Bấm \"Gửi mã OTP\".' });
    }
    const row = otpRow.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await client.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);
      return res.status(400).json({ ok: false, message: 'Mã OTP SMS đã hết hạn. Gửi lại mã mới.' });
    }

    const okOtp = await bcrypt.compare(otpStr, row.code_hash);
    if (!okOtp) {
      return res.status(400).json({ ok: false, message: 'Mã OTP SMS không đúng.' });
    }

    if (new_password != null && String(new_password).length > 0) {
      const cur = String(current_password || '');
      if (!cur) {
        return res.status(400).json({ ok: false, message: 'Nhập mật khẩu hiện tại để đổi mật khẩu.' });
      }
      const match = await bcrypt.compare(cur, String(prof.password_hash || ''));
      if (!match) {
        const fr = registerFailure(`tenant-pw:${req.auth.sub}`);
        if (!fr.ok) {
          return res.status(429).json({
            ok: false,
            message: `Nhập sai mật khẩu hiện tại quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
            retry_after_sec: fr.retryAfterSec,
          });
        }
        return res.status(400).json({ ok: false, message: 'Mật khẩu hiện tại không đúng.' });
      }
      if (String(new_password).length < 8) {
        return res.status(400).json({ ok: false, message: 'Mật khẩu mới tối thiểu 8 ký tự.' });
      }
    }

    if (date_of_birth != null && String(date_of_birth).trim() !== '') {
      const d = String(date_of_birth).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return res.status(400).json({ ok: false, message: 'Ngày sinh định dạng YYYY-MM-DD.' });
      }
      const t = Date.parse(`${d}T12:00:00`);
      if (Number.isNaN(t)) {
        return res.status(400).json({ ok: false, message: 'Ngày sinh không hợp lệ.' });
      }
    }

    await client.query('BEGIN');

    try {
      const updatesUser = [];
      const valsUser = [];
      let idx = 1;

      if (nameChanging) {
        updatesUser.push(`full_name = $${idx++}`);
        valsUser.push(String(full_name).trim());
      }
      if (cccdChanged && cccd != null && String(cccd).trim()) {
        updatesUser.push(`cccd = $${idx++}`);
        valsUser.push(String(cccd).trim());
      }
      if (dobChanged && date_of_birth != null && String(date_of_birth).trim()) {
        const d = String(date_of_birth).trim();
        updatesUser.push(`date_of_birth = $${idx++}::date`);
        valsUser.push(d);
      }
      if (emailChanging) {
        updatesUser.push(`email = $${idx++}`);
        valsUser.push(nextEmail);
      }
      if (new_password != null && String(new_password).length > 0) {
        const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
        updatesUser.push(`password_hash = $${idx++}`);
        valsUser.push(hash);
      }

      if (updatesUser.length > 0) {
        updatesUser.push(`updated_at = NOW()`);
        const userIdParam = idx;
        valsUser.push(req.auth.sub);
        await client.query(
          `UPDATE users SET ${updatesUser.join(', ')} WHERE user_id = $${userIdParam}`,
          valsUser
        );
      }

      if (phoneChanging && nextPhone) {
        const normalized = String(nextPhone).trim();
        const digits = normalized.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) {
          await client.query('ROLLBACK');
          return res.status(400).json({ ok: false, message: 'Số điện thoại không hợp lệ.' });
        }
        await client.query(`UPDATE tenants SET phone = $1, updated_at = NOW() WHERE user_id = $2`, [
          normalized,
          req.auth.sub,
        ]);
      }

      await client.query(`DELETE FROM tenant_profile_otps WHERE user_id = $1`, [req.auth.sub]);
      if (emailChanging) {
        await client.query(`DELETE FROM tenant_email_verifications WHERE user_id = $1`, [
          req.auth.sub,
        ]);
      }
      await client.query(`DELETE FROM tenant_password_recovery_otps WHERE user_id = $1`, [
        req.auth.sub,
      ]);

      await client.query('COMMIT');

      if (new_password != null && String(new_password).length > 0) {
        clearRateLimit(`tenant-pw:${req.auth.sub}`);
      }
    } catch (innerErr) {
      try {
        await client.query('ROLLBACK');
      } catch (e) {}
      throw innerErr;
    }

    const fresh = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.is_active,
         u.avatar_url,
         u.cccd,
         u.date_of_birth,
         t.tenant_id,
         t.phone,
         r.room_id,
         r.room_number,
         r.status AS room_status
       FROM users u
       LEFT JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [req.auth.sub]
    );

    return res.json({
      ok: true,
      message: 'Đã cập nhật thông tin.',
      tenant: fresh.rows[0],
    });
  } catch (err) {
    console.error('Tenant profile update error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

function toIsoDateStr(pgDate) {
  if (!pgDate) return '';
  if (typeof pgDate === 'string') return pgDate.slice(0, 10);
  const d = new Date(pgDate);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = {
  router,
  ensureTenantProfileSchema,
};
