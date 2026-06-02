const pool = require('../src/config/db');
const email = 'thuvnak24414h@st.uel.edu.vn';

async function main() {
  const constraints = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND contype = 'c'
  `);
  console.log('Constraints on users:');
  constraints.rows.forEach((r) => console.log(' -', r.conname, ':', r.def));

  try {
    await pool.query(
      `SELECT $1::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' AS ok`,
      [email]
    ).then((r) => console.log('\nRegex test in PostgreSQL:', r.rows[0].ok));
  } catch (e) {
    console.error(e.message);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
