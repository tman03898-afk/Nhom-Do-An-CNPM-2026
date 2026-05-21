#!/usr/bin/env node
const pool = require('../src/config/db');

async function main() {
  try {
    // try common column names
    const preferCols = ['invoice_id','tenant_id','contract_id','room_id','period_month','period_year','billing_month','billing_year','total_amount','due_date','status','created_at'];
    const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`);
    const cols = colsRes.rows.map(r=>r.column_name);
    const usedCols = preferCols.filter(c=>cols.includes(c)).slice(0,8);
    const selectCols = usedCols.length ? usedCols.join(', ') : 'invoice_id, created_at';

    const res = await pool.query(`SELECT ${selectCols} FROM invoices ORDER BY invoice_id DESC LIMIT 20`);
    if (res.rowCount === 0) {
      console.log('No invoices found.');
    } else {
      console.table(res.rows);
    }
    await pool.end();
  } catch (err) {
    console.error('Error listing invoices:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
