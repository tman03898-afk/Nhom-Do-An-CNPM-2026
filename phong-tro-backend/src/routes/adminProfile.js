const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureUsersTable } = require('./_dbHelpers');
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
const OTP_TTL_MIN = 10;

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

async function ensureAdminProfileSchema() {
  await ensureUsersTable();
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);

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
}

async function loadAdminUser(userId) {
  const r = await pool.query(
    `SELECT user_id, full_name, email, password_hash, role, is_active, avatar_url, created_at, updated_at
     FROM users WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (r.rowCount === 0) return null;
  const u = r.rows[0];
  if (String(u.role || '').toUpperCase() !== 'ADMIN') return null;
  return u;
}

async function verifyCurrentPassword(user, password) {
  return bcrypt.compare(String(password || ''), user.password_hash);
}

const avatarUploadDir = path.join(__dirname, '../../uploads/admin-avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `admin-${req.auth.sub}-${Date.now()}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP'));
  },
});

router.get('/admin/profile/me', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminProfileSchema();
    const user = await loadAdminUser(req.auth.sub);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'admin not found' });
    }
    return res.json({ ok: true, user: toPublicUser(user) });
  } catch (err) {
    console.error('Admin profile me error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Cập nhật họ tên / email — yêu cầu mật khẩu hiện tại. */
router.post('/admin/profile/update', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminProfileSchema();
    const user = await loadAdminUser(req.auth.sub);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'admin not found' });
    }

    const { full_name, email, current_password } = req.body || {};
    if (!current_password) {
      return res.status(400).json({ ok: false, message: 'current_password is required' });
    }
    if (!(await verifyCurrentPassword(user, current_password))) {
      return res.status(401).json({ ok: false, message: 'current password is incorrect' });
    }

    const updates = [];
    const vals = [];
    let idx = 1;

    if (full_name != null && String(full_name).trim() !== '') {
      const name = String(full_name).trim();
      if (name !== user.full_name) {
        updates.push(`full_name = $${idx++}`);
        vals.push(name);
      }
    }

    if (email != null && String(email).trim() !== '') {
      const normalized = normalizeEmail(email);
      if (normalized !== normalizeEmail(user.email)) {
        const dup = await pool.query(`SELECT user_id FROM users WHERE LOWER(email) = $1 AND user_id <> $2 LIMIT 1`, [
          normalized,
          user.user_id,
        ]);
        if (dup.rowCount > 0) {
          return res.status(409).json({ ok: false, message: 'email already exists' });
        }
        updates.push(`email = $${idx++}`);
        vals.push(normalized);
        updates.push(`username = $${idx++}`);
        vals.push(usernameFromEmail(normalized));
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, message: 'no changes to apply' });
    }

    updates.push(`updated_at = NOW()`);
    vals.push(user.user_id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${idx}
       RETURNING user_id, full_name, email, role, is_active, avatar_url, created_at, updated_at`,
      vals
    );

    return res.json({ ok: true, user: toPublicUser(result.rows[0]) });
  } catch (err) {
    console.error('Admin profile update error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/profile/change-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminProfileSchema();
    const user = await loadAdminUser(req.auth.sub);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'admin not found' });
    }

    const { current_password, new_password, password_confirm } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ ok: false, message: 'current_password and new_password are required' });
    }
    if (String(new_password) !== String(password_confirm || '')) {
      return res.status(400).json({ ok: false, message: 'password confirmation does not match' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ ok: false, message: 'new password must be at least 8 characters' });
    }
    if (!(await verifyCurrentPassword(user, current_password))) {
      return res.status(401).json({ ok: false, message: 'current password is incorrect' });
    }

    const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
    await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`, [
      hash,
      user.user_id,
    ]);

    return res.json({ ok: true, message: 'password updated' });
  } catch (err) {
    console.error('Admin change password error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Gửi mã OTP khôi phục mật khẩu tới email đăng ký (khi đã đăng nhập). */
router.post('/admin/profile/password-recovery/request', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminProfileSchema();
    const user = await loadAdminUser(req.auth.sub);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'admin not found' });
    }

    const ip = clientIp(req);
    const attempt = registerAttempt(`admin-pw-recovery:${ip}`);
    if (!attempt.ok) {
      return res.status(429).json({ ok: false, message: attempt.message || 'too many requests' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
    await pool.query(
      `INSERT INTO password_reset_otps (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.user_id, codeHash, expiresAt]
    );

    try {
      await sendPasswordResetOtpEmail(user.email, code, user.full_name);
    } catch (mailErr) {
      console.error('Admin recovery mail error:', mailErr);
      await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
      return res.status(500).json({ ok: false, message: 'cannot send recovery email' });
    }

    const payload = {
      ok: true,
      message: `Đã gửi mã xác nhận tới ${user.email}.`,
    };
    if (process.env.OTP_DEBUG === 'true') {
      payload.debug_otp = code;
    }
    return res.json(payload);
  } catch (err) {
    console.error('Admin password recovery request error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/profile/password-recovery/apply', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminProfileSchema();
    const user = await loadAdminUser(req.auth.sub);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'admin not found' });
    }

    const { code, new_password, password_confirm } = req.body || {};
    const otp = String(code || '').trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ ok: false, message: 'invalid verification code' });
    }
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ ok: false, message: 'new password must be at least 8 characters' });
    }
    if (String(new_password) !== String(password_confirm || '')) {
      return res.status(400).json({ ok: false, message: 'password confirmation does not match' });
    }

    const ip = clientIp(req);
    const failKey = `admin-pw-recovery-fail:${ip}`;
    try {
      await assertNotBlocked(failKey);
    } catch (e) {
      return res.status(429).json({ ok: false, message: e.message || 'too many attempts' });
    }

    const codeHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpRow = await pool.query(
      `SELECT code_hash, expires_at FROM password_reset_otps WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.user_id]
    );
    if (otpRow.rowCount === 0) {
      registerFailure(failKey);
      return res.status(400).json({ ok: false, message: 'no recovery code requested' });
    }
    const row = otpRow.rows[0];
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
      registerFailure(failKey);
      return res.status(400).json({ ok: false, message: 'verification code expired' });
    }
    if (row.code_hash !== codeHash) {
      registerFailure(failKey);
      return res.status(400).json({ ok: false, message: 'invalid verification code' });
    }

    const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
    await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`, [
      hash,
      user.user_id,
    ]);
    await pool.query(`DELETE FROM password_reset_otps WHERE user_id = $1`, [user.user_id]);
    clearRateLimit(failKey);

    return res.json({ ok: true, message: 'password updated' });
  } catch (err) {
    console.error('Admin password recovery apply error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post(
  '/admin/profile/avatar',
  requireAuth,
  requireAdmin,
  avatarUpload.single('avatar'),
  async (req, res) => {
    try {
      await ensureAdminProfileSchema();
      if (!req.file) {
        return res.status(400).json({ ok: false, message: 'avatar file is required' });
      }
      const avatarUrl = `/uploads/admin-avatars/${req.file.filename}`;
      const result = await pool.query(
        `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2 AND role = 'ADMIN'
         RETURNING user_id, full_name, email, role, is_active, avatar_url, created_at, updated_at`,
        [avatarUrl, req.auth.sub]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ ok: false, message: 'admin not found' });
      }
      return res.json({ ok: true, user: toPublicUser(result.rows[0]) });
    } catch (err) {
      console.error('Admin avatar upload error:', err);
      return res.status(500).json({ ok: false, message: err.message || 'internal error' });
    }
  }
);

module.exports = router;
