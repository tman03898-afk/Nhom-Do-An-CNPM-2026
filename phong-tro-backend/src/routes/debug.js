const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/debug/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    return res.json({ ok: true, db: true, rows: result.rows });
  } catch (err) {
    console.error('DB debug error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    return res.status(500).json({ ok: false, db: false, message: 'Database connection failed', error: err && err.message });
  }
});

// Development helper: unprotected contracts dump for local troubleshooting
router.get('/debug/contracts', async (req, res) => {
  try {
    const q = await pool.query(
        `SELECT
         c.contract_id,
         c.start_date,
         c.end_date,
         c.monthly_rent AS rent_price,
         c.deposit,
         c.status,
         c.notes,
         c.created_at,
         t.tenant_id,
         u.user_id,
         u.full_name,
         u.email,
         r.room_id,
         r.room_number
       FROM contracts c
       LEFT JOIN tenants t ON t.tenant_id = c.tenant_id
       LEFT JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = c.room_id
       ORDER BY c.contract_id DESC LIMIT 200`);

    return res.json({ ok: true, count: q.rowCount, contracts: q.rows });
  } catch (err) {
    console.error('Debug contracts error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    return res.status(500).json({ ok: false, message: 'failed', error: err && err.message });
  }
});

module.exports = router;
