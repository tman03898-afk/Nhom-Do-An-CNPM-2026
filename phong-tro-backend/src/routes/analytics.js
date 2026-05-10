const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');

const router = express.Router();

router.get('/admin/analytics/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM rooms) AS rooms_total,
        (SELECT COUNT(*) FROM rooms WHERE status = 'AVAILABLE') AS rooms_available,
        (SELECT COUNT(*) FROM rooms WHERE status = 'RENTED') AS rooms_rented,
        (SELECT COUNT(*) FROM users WHERE role = 'TENANT') AS tenants_total,
        (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') AS admins_total
    `);

    return res.json({ ok: true, overview: result.rows[0] });
  } catch (err) {
    console.error('Analytics overview error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

