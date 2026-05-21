const pool = require('../src/config/db');

(async () => {
  try {
    const invCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position");
    const payCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position");
    console.log('INVOICES:', invCols.rows.map((r) => r.column_name).join(', '));
    console.log('PAYMENTS:', payCols.rows.map((r) => r.column_name).join(', '));
    const oneInv = await pool.query('SELECT invoice_id, tenant_id, billing_month, period_month, period_year, total_amount FROM invoices LIMIT 1');
    console.log('SAMPLE INV ROW:', oneInv.rows[0]);
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
  } finally {
    await pool.end();
  }
})();
