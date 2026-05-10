#!/usr/bin/env node
const pool = require('../src/config/db');

async function main() {
  try {
    const res = await pool.query(`SELECT contract_id, tenant_id, room_id, start_date, end_date, created_at FROM contracts ORDER BY contract_id DESC LIMIT 20`);
    if (res.rowCount === 0) {
      console.log('No contracts found.');
    } else {
      console.table(res.rows);
    }
    await pool.end();
  } catch (err) {
    console.error('Error listing contracts:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
