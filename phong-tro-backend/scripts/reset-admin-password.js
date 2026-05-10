#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/reset-admin-password.js admin@example.com NewPass123!');
    process.exit(1);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const hash = await bcrypt.hash(String(password), 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING user_id, email, role`,
      [hash, normalizedEmail]
    );

    if (result.rowCount === 0) {
      console.error('No user found with that email.');
      await pool.end();
      process.exit(2);
    }

    console.log('Password updated for:', result.rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error updating password:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
