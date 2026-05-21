require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');
const { ensureUsersTable } = require('../src/routes/_dbHelpers');

async function main() {
  await ensureUsersTable();
  const r = await pool.query(
    "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'chk_users_email'"
  );
  console.log('chk_users_email:', r.rows[0]?.def || '(none)');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
