const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');
const { once } = require('./_schemaCache');
const { isValidPhoneNumber } = require('../utils/phone');
const { sendPasswordResetOtpEmail } = require('../services/mail');
const {
  clientIp,
  registerAttempt,
  registerFailure,
  assertNotBlocked,
  clearRateLimit,
} = require('../utils/sensitiveRateLimit');

const router = express.Router();
const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function usernameFromEmail(email) {
  return String(email).split('@')[0];
}

function toPublicUser(row) {
  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex');
}

async function ensurePasswordResetTokensTable() {
  return once('schema:password_reset_tokens', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash)`
    );
  });
}

const FORGOT_PASSWORD_OTP_TTL_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_SESSION_TTL_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_RESEND_COOLDOWN_MS = 60 * 1000;

async function ensurePasswordResetOtpsTable() {
  return once('schema:password_reset_otps', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps (user_id)`
    );
  });
}

async function ensurePasswordResetSessionsTable() {
  return once('schema:password_reset_sessions', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_password_reset_sessions_user_token ON password_reset_sessions (user_id, token_hash)`
    );
  });
}

const FORGOT_PASSWORD_OK_MESSAGE =
  'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được mã 6 số qua email.';

async function issuePasswordResetOtp(user) {
  await ensurePasswordResetOtpsTable();
  await ensurePasswordResetTokensTable();
  await ensurePasswordResetSessionsTable();
  await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.user_id]);
  await pool.query(`DELETE FROM password_reset_sessions WHERE user_id = $1`, [user.user_id]);

  const plainCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(plainCode, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + FORGOT_PASSWORD_OTP_TTL_MS);

  await pool.query(
    `INSERT INTO password_reset_otps (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.user_id, codeHash, expiresAt]
  );

  await sendPasswordResetOtpEmail(user.email, plainCode, user.full_name);
}

router.post('/auth/forgot-password', async (req, res) => {
  try {
    await ensureUsersTable();
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ ok: false, message: 'email is required' });
    }

    const ip = clientIp(req);
    const attempt = registerAttempt(`forgot-pw:${ip}`);
    if (!attempt.ok) {
      return res.status(429).json({
        ok: false,
        message: `Quá nhiều lần yêu cầu quên mật khẩu. Vui lòng chờ ${attempt.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: attempt.retryAfterSec,
      });
    }

    const result = await pool.query(
      `SELECT user_id, full_name, email, is_active
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.json({ ok: true, message: FORGOT_PASSWORD_OK_MESSAGE });
    }

    const user = result.rows[0];

    try {
      await issuePasswordResetOtp(user);
    } catch (mailErr) {
      console.error('Forgot-password mail error:', mailErr);
      await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
      return res.status(503).json({
        ok: false,
        message:
          'Không gửi được email. Kiểm tra cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) hoặc bật MAIL_FALLBACK_LOG=1 khi phát triển.',
      });
    }

    return res.json({ ok: true, message: FORGOT_PASSWORD_OK_MESSAGE });
  } catch (err) {
    console.error('Forgot-password error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Gửi lại mã 6 số (chờ tối thiểu 60 giây giữa hai lần gửi). */
router.post('/auth/forgot-password-resend', async (req, res) => {
  try {
    await ensureUsersTable();
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ ok: false, message: 'email is required' });
    }

    const ip = clientIp(req);
    const attempt = registerAttempt(`forgot-resend:${ip}`);
    if (!attempt.ok) {
      return res.status(429).json({
        ok: false,
        message: `Gửi lại mã quá nhiều lần. Vui lòng chờ ${attempt.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: attempt.retryAfterSec,
      });
    }

    const result = await pool.query(
      `SELECT user_id, full_name, email, is_active
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.json({ ok: true, message: FORGOT_PASSWORD_OK_MESSAGE });
    }

    const user = result.rows[0];
    await ensurePasswordResetOtpsTable();
    await ensurePasswordResetSessionsTable();

    const otpRes = await pool.query(
      `SELECT id, created_at, expires_at
       FROM password_reset_otps
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [user.user_id]
    );

    let lastSendAt = null;
    if (otpRes.rowCount > 0) {
      const row = otpRes.rows[0];
      if (new Date(row.expires_at) < new Date()) {
        await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
        await pool.query(`DELETE FROM password_reset_sessions WHERE user_id = $1`, [user.user_id]);
        return res.status(400).json({
          ok: false,
          message: 'Mã đã hết hạn. Quay lại bước nhập email để nhận mã mới.',
        });
      }
      lastSendAt = new Date(row.created_at).getTime();
    } else {
      const sessRes = await pool.query(
        `SELECT created_at FROM password_reset_sessions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [user.user_id]
      );
      if (sessRes.rowCount === 0) {
        return res.status(400).json({
          ok: false,
          message: 'Chưa có mã đang chờ. Nhập email và bấm gửi mã trước.',
        });
      }
      lastSendAt = new Date(sessRes.rows[0].created_at).getTime();
    }

    const elapsed = Date.now() - lastSendAt;
    if (elapsed < FORGOT_PASSWORD_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((FORGOT_PASSWORD_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        ok: false,
        message: `Vui lòng chờ ${waitSec} giây rồi gửi lại mã.`,
        retry_after_sec: waitSec,
      });
    }

    try {
      await issuePasswordResetOtp(user);
    } catch (mailErr) {
      console.error('Forgot-password-resend mail error:', mailErr);
      await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
      await pool.query(`DELETE FROM password_reset_sessions WHERE user_id = $1`, [user.user_id]);
      return res.status(503).json({
        ok: false,
        message:
          'Không gửi được email. Kiểm tra cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) hoặc bật MAIL_FALLBACK_LOG=1 khi phát triển.',
      });
    }

    return res.json({ ok: true, message: 'Đã gửi lại mã tới email của bạn.' });
  } catch (err) {
    console.error('Forgot-password-resend error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Xác nhận đúng mã 6 số → trả token bước đặt mật khẩu (ngắn hạn). */
router.post('/auth/forgot-password-verify-code', async (req, res) => {
  let client = null;
  try {
    await ensureUsersTable();
    await ensurePasswordResetOtpsTable();
    await ensurePasswordResetSessionsTable();

    const { email, code } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const codeStr = String(code || '').trim();

    if (!normalizedEmail || !codeStr) {
      return res.status(400).json({ ok: false, message: 'email và mã là bắt buộc.' });
    }

    if (!/^\d{6}$/.test(codeStr)) {
      return res.status(400).json({ ok: false, message: 'Mã gồm đúng 6 chữ số.' });
    }

    const ip = clientIp(req);
    const failKey = `forgot-otp-fail:${ip}:${normalizedEmail}`;
    const blocked = assertNotBlocked(failKey);
    if (blocked.blocked) {
      return res.status(429).json({
        ok: false,
        message: `Nhập sai mã quá nhiều lần. Vui lòng chờ ${blocked.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: blocked.retryAfterSec,
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT user_id, full_name, email, is_active
       FROM users
       WHERE email = $1
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Email hoặc mã không đúng.' });
    }

    const user = userRes.rows[0];

    const otpRes = await client.query(
      `SELECT id, code_hash, expires_at
       FROM password_reset_otps
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [user.user_id]
    );

    if (otpRes.rowCount === 0) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Không có mã đang chờ. Gửi mã từ email trước.' });
    }

    const otpRow = otpRes.rows[0];
    if (new Date(otpRow.expires_at) < new Date()) {
      await client.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
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

    const codeOk = await bcrypt.compare(codeStr, String(otpRow.code_hash || ''));
    if (!codeOk) {
      await client.query('ROLLBACK');
      const fr = registerFailure(failKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Nhập sai mã quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Mã xác nhận không đúng.' });
    }

    await client.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
    await client.query(`DELETE FROM password_reset_sessions WHERE user_id = $1`, [user.user_id]);

    const rawSession = crypto.randomBytes(24).toString('hex');
    const sessionHash = hashResetToken(rawSession);
    const sessionExpires = new Date(Date.now() + FORGOT_PASSWORD_SESSION_TTL_MS);

    await client.query(
      `INSERT INTO password_reset_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.user_id, sessionHash, sessionExpires]
    );

    await client.query('COMMIT');
    clearRateLimit(failKey);
    return res.json({
      ok: true,
      message: 'Mã đúng. Đặt mật khẩu mới ở bước tiếp theo.',
      reset_session_token: rawSession,
    });
  } catch (err) {
    try {
      if (client) await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore
    }
    console.error('Forgot-password-verify-code error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

/** Đặt mật khẩu mới sau khi đã xác nhận mã (dùng reset_session_token). */
router.post('/auth/forgot-password-set-password', async (req, res) => {
  let client = null;
  try {
    await ensureUsersTable();
    await ensurePasswordResetSessionsTable();

    const { email, reset_session_token, password, password_confirm } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const rawSession = String(reset_session_token || '').trim();
    const newPassword = String(password || '');
    const confirmPassword = String(password_confirm != null ? password_confirm : password || '');

    if (!normalizedEmail || !rawSession || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: 'email, reset_session_token và password là bắt buộc.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu mới tối thiểu 8 ký tự.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu xác nhận không khớp.' });
    }

    const ip = clientIp(req);
    const sessionFailKey = `forgot-session-fail:${ip}:${normalizedEmail}`;
    const blocked = assertNotBlocked(sessionFailKey);
    if (blocked.blocked) {
      return res.status(429).json({
        ok: false,
        message: `Thử quá nhiều lần. Vui lòng chờ ${blocked.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: blocked.retryAfterSec,
      });
    }

    const sessionHash = hashResetToken(rawSession);

    client = await pool.connect();
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT user_id, email, is_active
       FROM users
       WHERE email = $1
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
      await client.query('ROLLBACK');
      const fr = registerFailure(sessionFailKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'Phiên đặt lại mật khẩu không hợp lệ.' });
    }

    const user = userRes.rows[0];

    const sessRes = await client.query(
      `SELECT id
       FROM password_reset_sessions
       WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [user.user_id, sessionHash]
    );

    if (sessRes.rowCount === 0) {
      await client.query('ROLLBACK');
      const fr = registerFailure(sessionFailKey);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({
        ok: false,
        message: 'Phiên đặt lại mật khẩu hết hạn hoặc không hợp lệ. Xác nhận mã lại từ đầu.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`, [
      passwordHash,
      user.user_id,
    ]);
    await client.query(`DELETE FROM password_reset_sessions WHERE user_id = $1`, [user.user_id]);
    await client.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.user_id]);

    await client.query('COMMIT');
    clearRateLimit(sessionFailKey);
    clearRateLimit(`forgot-otp-fail:${ip}:${normalizedEmail}`);
    clearRateLimit(`reset-pw:${ip}`);
    return res.json({ ok: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' });
  } catch (err) {
    try {
      if (client) await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore
    }
    console.error('Forgot-password-set-password error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

router.post('/auth/reset-password', async (req, res) => {
  let client = null;
  try {
    await ensureUsersTable();
    await ensurePasswordResetTokensTable();
    const { token, password } = req.body || {};
    const rawToken = String(token || '').trim();
    const newPassword = String(password || '');

    if (!rawToken || !newPassword) {
      return res.status(400).json({ ok: false, message: 'token and password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, message: 'password must be at least 8 characters' });
    }

    const ip = clientIp(req);
    const blocked = assertNotBlocked(`reset-pw:${ip}`);
    if (blocked.blocked) {
      return res.status(429).json({
        ok: false,
        message: `Thử đặt lại mật khẩu quá nhiều lần. Vui lòng chờ ${blocked.retryAfterSec} giây rồi thử lại.`,
        retry_after_sec: blocked.retryAfterSec,
      });
    }

    const tokenHash = hashResetToken(rawToken);

    client = await pool.connect();
    await client.query('BEGIN');
    const rowResult = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (rowResult.rowCount === 0) {
      await client.query('ROLLBACK');
      const fr = registerFailure(`reset-pw:${ip}`);
      if (!fr.ok) {
        return res.status(429).json({
          ok: false,
          message: `Liên kết không hợp lệ hoặc hết hạn; bạn đã thử quá nhiều lần. Vui lòng chờ ${fr.retryAfterSec} giây rồi thử lại.`,
          retry_after_sec: fr.retryAfterSec,
        });
      }
      return res.status(400).json({ ok: false, message: 'invalid or expired reset link' });
    }

    const { id: tokenId, user_id: userId } = rowResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [passwordHash, userId]
    );
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2`, [
      userId,
      tokenId,
    ]);

    await client.query('COMMIT');
    clearRateLimit(`reset-pw:${ip}`);
    return res.json({ ok: true, message: 'password updated successfully' });
  } catch (err) {
    try {
      if (client) await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore
    }
    console.error('Reset-password error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

router.post('/auth/bootstrap-admin', async (req, res) => {
  try {
    await ensureUsersTable();
    const { full_name, email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!full_name || !normalizedEmail || !password) {
      return res.status(400).json({ ok: false, message: 'full_name, email, password are required' });
    }

    const adminCheck = await pool.query(`SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (adminCheck.rowCount > 0) {
      return res.status(409).json({ ok: false, message: 'admin already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const username = usernameFromEmail(normalizedEmail);

    const result = await pool.query(
      `INSERT INTO users (username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ADMIN')
       RETURNING user_id, full_name, email, role, is_active, created_at, updated_at`,
      [username, String(full_name).trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      ok: true,
      message: 'admin account created',
      user: toPublicUser(result.rows[0]),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'email already exists' });
    }
    console.error('Bootstrap admin error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    await ensureUsersTable();
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ ok: false, message: 'email and password are required' });
    }

    const result = await pool.query(
      `SELECT user_id, full_name, email, password_hash AS password_value, role, is_active, avatar_url, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ ok: false, message: 'invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ ok: false, message: 'account has been deactivated' });
    }

    const isValidPassword = await bcrypt.compare(String(password), String(user.password_value || ''));
    if (!isValidPassword) {
      return res.status(401).json({ ok: false, message: 'invalid email or password' });
    }

    const token = jwt.sign(
      {
        sub: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({ ok: true, token, user: toPublicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/auth/logout', (req, res) => {
  return res.json({ ok: true, message: 'logged out successfully' });
});

router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    await ensureUsersTable();
    const result = await pool.query(
      `SELECT user_id, full_name, email, role, is_active, avatar_url, created_at, updated_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.auth.sub]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ ok: false, message: 'user not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ ok: false, message: 'account has been deactivated' });
    }

    return res.json({ ok: true, user: toPublicUser(user) });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/auth/users/tenant', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureTenantsTable();
    const { full_name, email, password, phone, room_number } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!full_name || !normalizedEmail || !password || !phone || !room_number) {
      return res.status(400).json({
        ok: false,
        message: 'full_name, email, password, phone, room_number are required',
      });
    }

    const normalizedPhone = String(phone).trim();
    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({
        ok: false,
        message: 'Số điện thoại sai định dạng',
      });
    }

    await client.query('BEGIN');

    const roomResult = await client.query(
      `SELECT room_id, room_number, status
       FROM rooms
       WHERE room_number = $1
       LIMIT 1`,
      [String(room_number).trim()]
    );

    if (roomResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'room not found' });
    }

    const room = roomResult.rows[0];
    if (room.status !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'room is not available' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const username = usernameFromEmail(normalizedEmail);
    const userResult = await client.query(
      `INSERT INTO users (username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'TENANT')
       RETURNING user_id, full_name, email, role, is_active, created_at, updated_at`,
      [username, String(full_name).trim(), normalizedEmail, passwordHash]
    );

    const createdUser = userResult.rows[0];

    await client.query(
      `INSERT INTO tenants (user_id, phone, room_id)
       VALUES ($1, $2, $3)`,
      [createdUser.user_id, normalizedPhone, room.room_id]
    );

    await client.query(
      `UPDATE rooms
       SET status = 'RENTED'::room_status, updated_at = NOW()
       WHERE room_id = $1`,
      [room.room_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'tenant account created by admin',
      user: toPublicUser(createdUser),
      tenant: {
        phone: normalizedPhone,
        room_id: room.room_id,
        room_number: room.room_number,
        room_status: 'RENTED',
      },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore
    }
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'email already exists' });
    }
    console.error('Create tenant account error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

module.exports = router;
