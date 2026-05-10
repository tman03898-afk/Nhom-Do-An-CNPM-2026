const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');

const router = express.Router();

async function safeCount(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    const row = r.rows[0];
    const v = row?.count ?? row?.c;
    return Number(v) || 0;
  } catch (err) {
    console.warn('nav-badges count skipped:', err.message);
    return 0;
  }
}

/** Số liệu chờ xử lý cho badge sidebar admin (một request gọn). */
router.get('/admin/nav-badges', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.auth.sub;

    const tickets = await safeCount(`SELECT COUNT(*)::int AS count FROM incidents WHERE status::text = 'OPEN'`);

    const payments = await safeCount(
      `SELECT COUNT(*)::int AS count FROM payments WHERE COALESCE(status::text, '') = 'PENDING'`
    );

    const invoices = await safeCount(`
      SELECT COUNT(*)::int AS count FROM invoices
      WHERE COALESCE(status::text, '') NOT IN ('PAID', 'CANCELLED')
    `);

    const notifications = await safeCount(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [adminId]
    );

    const contracts = await safeCount(`
      SELECT COUNT(*)::int AS count FROM contracts
      WHERE COALESCE(status::text, '') = 'ACTIVE'
        AND end_date IS NOT NULL
        AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    `);

    return res.json({
      ok: true,
      badges: {
        tickets,
        payments,
        invoices,
        notifications,
        contracts,
      },
    });
  } catch (err) {
    console.error('Nav badges error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

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

