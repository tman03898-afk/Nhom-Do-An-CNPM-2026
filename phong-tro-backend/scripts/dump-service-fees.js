const pool = require('../src/config/db');
pool
  .query(
    `SELECT column_name, data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'service_fees'
     ORDER BY ordinal_position`
  )
  .then((r) => {
    console.log(JSON.stringify(r.rows, null, 2));
    return pool.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
