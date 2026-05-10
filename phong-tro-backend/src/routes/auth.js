const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureTenantsTable } = require('./tenants');

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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TENANT')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    UPDATE users
    SET role = 'TENANT'
    WHERE role IS NULL
  `);

  await pool.query(`
    UPDATE users
    SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), email)
    WHERE full_name IS NULL OR TRIM(full_name) = ''
  `);

  await pool.query(`
    UPDATE users
    SET username = COALESCE(NULLIF(TRIM(username), ''), SPLIT_PART(email, '@', 1))
    WHERE username IS NULL OR TRIM(username) = ''
  `);
}

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
      `SELECT user_id, full_name, email, password_hash AS password_value, role, is_active, created_at, updated_at
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
      `SELECT user_id, full_name, email, role, is_active, created_at, updated_at
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
      [createdUser.user_id, String(phone).trim(), room.room_id]
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
        phone: String(phone).trim(),
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
