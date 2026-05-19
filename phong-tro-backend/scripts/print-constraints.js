#!/usr/bin/env node
const pool = require('../src/config/db');

async function main() {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: node scripts/print-constraints.js chk_users_full_name chk_users_email');
    process.exit(1);
  }

  const result = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conname = ANY($1::text[])
     ORDER BY conname ASC`,
    [names]
  );

  console.log(result.rows);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch (e) {}
  process.exit(1);
});



