#!/usr/bin/env node
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0] || '51';
  const password = args[1] || '123456';
  const SALT_ROUNDS = 10;

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('Computed hash:', hash);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2 RETURNING user_id, email, full_name, password_hash',
      [hash, userId]
    );

    if (result.rowCount === 0) {
      console.log('No user updated (user not found).');
    } else {
      console.log('Updated user:');
      console.table(result.rows);
    }

    await pool.end();
  } catch (err) {
    console.error('Error updating admin password:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
