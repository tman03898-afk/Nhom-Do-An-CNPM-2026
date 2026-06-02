const pool = require('../src/config/db');

async function main() {
  const r = await pool.query(`
    SELECT u.user_id, u.full_name, u.email, t.tenant_id, t.room_id, r.room_number,
           c.contract_id, c.start_date, c.end_date, c.rent_price, c.deposit, c.status, c.notes
    FROM tenants t
    JOIN users u ON u.user_id = t.user_id
    LEFT JOIN rooms r ON r.room_id = t.room_id
    LEFT JOIN contracts c ON c.tenant_id = t.tenant_id
    WHERE r.room_number = '404' OR u.full_name ILIKE '%Tô Văn%'
    ORDER BY c.contract_id DESC NULLS LAST
    LIMIT 10
  `);
  console.log(JSON.stringify(r.rows, null, 2));

  const active = await pool.query(`
    SELECT c.* FROM contracts c
    JOIN tenants t ON t.tenant_id = c.tenant_id
    JOIN users u ON u.user_id = t.user_id
    JOIN rooms r ON r.room_id = t.room_id
    WHERE r.room_number = '404' AND c.status = 'ACTIVE'
  `);
  console.log('\nACTIVE contracts for room 404:', active.rowCount);
  console.log(JSON.stringify(active.rows, null, 2));

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
