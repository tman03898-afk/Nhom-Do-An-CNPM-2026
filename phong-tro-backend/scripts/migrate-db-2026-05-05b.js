#!/usr/bin/env node
/* eslint-disable no-console */
const pool = require('../src/config/db');

async function columnExists(table, column) {
  const r = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
  `.trim(),
    [table, column]
  );
  return r.rowCount > 0;
}

async function main() {
  console.log('Starting DB migration 2026-05-05b...');

  if (await columnExists('contracts', 'monthly_rent')) {
    console.log('Dropping contracts.monthly_rent');
    await pool.query(`ALTER TABLE contracts DROP COLUMN IF EXISTS monthly_rent`);
  } else {
    console.log('Skipping contracts.monthly_rent drop: column not found.');
  }

  if (await columnExists('users', 'password_hash')) {
    const nullCheck = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE password_hash IS NULL
    `.trim()
    );
    const nullCount = nullCheck.rows[0]?.count ?? 0;

    if (nullCount > 0) {
      throw new Error(`Cannot set users.password_hash NOT NULL because ${nullCount} row(s) still have NULL values.`);
    }

    console.log('Setting users.password_hash NOT NULL');
    await pool.query(`ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`);
  } else {
    console.log('Skipping users.password_hash update: column not found.');
  }

  console.log('DB migration 2026-05-05b done.');
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await pool.end();
    } catch (e) {}
    process.exitCode = 1;
  });

