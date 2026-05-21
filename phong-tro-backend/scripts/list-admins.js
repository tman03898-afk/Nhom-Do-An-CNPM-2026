#!/usr/bin/env node
const pool = require('../src/config/db');

async function main() {
  try {
    const result = await pool.query(`SELECT user_id, email, full_name, role, is_active, created_at FROM users WHERE role = 'ADMIN'`);
    if (result.rowCount === 0) {
      console.log('No admin users found.');
    } else {
      console.log('Admins:');
      console.table(result.rows);
    }
    await pool.end();
  } catch (err) {
    console.error('Error listing admins:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
