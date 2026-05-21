#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function usernameFromEmail(email) {
  return String(email).split('@')[0];
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

async function main() {
  const [, , fullNameArg, emailArg, passwordArg] = process.argv;

  const full_name = String(fullNameArg || '').trim();
  const email = normalizeEmail(emailArg);
  const password = String(passwordArg || '');

  if (!full_name || !email || !password) {
    console.error('Usage: node scripts/bootstrap-admin.js "Admin Name" admin@example.com NewPass123!');
    process.exit(1);
  }

  try {
    await ensureUsersTable();

    const adminCheck = await pool.query(`SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (adminCheck.rowCount > 0) {
      console.error('Admin already exists. Use reset-admin-password.js to change password.');
      await pool.end();
      process.exit(2);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const username = usernameFromEmail(email);

    const result = await pool.query(
      `INSERT INTO users (username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ADMIN')
       RETURNING user_id, full_name, email, role, is_active, created_at, updated_at`,
      [username, full_name, email, passwordHash]
    );

    console.log('Admin created:', result.rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    if (err && err.code === '23505') {
      console.error('Email already exists.');
      try {
        await pool.end();
      } catch (e) {}
      process.exit(3);
    }
    console.error('Error creating admin:', err);
    try {
      await pool.end();
    } catch (e) {}
    process.exit(1);
  }
}

main();

