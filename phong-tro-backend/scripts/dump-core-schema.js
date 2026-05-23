const pool = require('../src/config/db');

const CORE_TABLES = [
  'users',
  'tenants',
  'rooms',
  'room_hold_requests',
  'contracts',
  'invoices',
  'payments',
  'services',
  'utility_readings',
  'tenant_service_subscriptions',
  'tenant_fee_subscriptions',
  'incidents',
  'notifications',
  'assets',
];

async function main() {
  const cols = await pool.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1)
     ORDER BY table_name, ordinal_position`,
    [CORE_TABLES]
  );

  const fks = await pool.query(
    `SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = ANY($1)`,
    [CORE_TABLES]
  );

  const pks = await pool.query(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = ANY($1)`,
    [CORE_TABLES]
  );

  const tables = {};
  for (const t of CORE_TABLES) {
    tables[t] = { columns: [], pk: [], fks: [] };
  }
  for (const r of cols.rows) {
    if (tables[r.table_name]) tables[r.table_name].columns.push(r);
  }
  for (const r of pks.rows) {
    if (tables[r.table_name]) tables[r.table_name].pk.push(r.column_name);
  }
  for (const r of fks.rows) {
    if (tables[r.table_name]) {
      tables[r.table_name].fks.push({
        column: r.column_name,
        ref: `${r.foreign_table_name}.${r.foreign_column_name}`,
      });
    }
  }

  console.log(JSON.stringify(tables, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
