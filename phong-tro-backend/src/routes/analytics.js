const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable, formatCalendarDateString } = require('./_dbHelpers');
const { ensureInvoicesTable } = require('./invoices');
const paymentsRoute = require('./payments');
const incidentsRoute = require('./incidents');
const contractsRoute = require('./contracts');

const router = express.Router();

const INVOICE_PAID_SQL = `UPPER(TRIM(COALESCE(i.status::text, ''))) = 'PAID'`;

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

    const [tickets, payments, invoices, notifications, contracts] = await Promise.all([
      safeCount(`SELECT COUNT(*)::int AS count FROM incidents WHERE status::text = 'OPEN'`),
      safeCount(
        `SELECT COUNT(*)::int AS count FROM payments WHERE COALESCE(status::text, '') = 'PENDING'`
      ),
      safeCount(`
      SELECT COUNT(*)::int AS count FROM invoices
      WHERE COALESCE(status::text, '') NOT IN ('PAID', 'CANCELLED')
    `),
      safeCount(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [adminId]
      ),
      safeCount(`
      SELECT COUNT(*)::int AS count FROM contracts
      WHERE COALESCE(status::text, '') = 'ACTIVE'
        AND end_date IS NOT NULL
        AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    `),
    ]);

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

/** Doanh thu tháng hiện tại (hóa đơn PAID) + tỷ trọng tiền phòng / dịch vụ · điện nước — FE PaymentManage & Dashboard. */
router.get('/admin/analytics/collection-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const currentStart = formatCalendarDateString(year, month, 1);
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const prevStart = formatCalendarDateString(prev.y, prev.m, 1);
    if (!currentStart || !prevStart) {
      return res.status(500).json({ ok: false, message: 'internal error' });
    }

    const cur = await pool.query(
      `SELECT
         COALESCE(SUM(i.total_amount), 0)::numeric AS total_sum,
         COALESCE(SUM(i.rent_amount), 0)::numeric AS rent_sum,
         COALESCE(SUM(COALESCE(i.electricity_amount, 0) + COALESCE(i.water_amount, 0) + COALESCE(i.other_fees_amount, 0)), 0)::numeric AS util_sum
       FROM invoices i
       WHERE (${INVOICE_PAID_SQL})
         AND date_trunc('month', i.billing_month) = date_trunc('month', $1::date)`,
      [currentStart]
    );

    const pv = await pool.query(
      `SELECT COALESCE(SUM(i.total_amount), 0)::numeric AS total_sum
       FROM invoices i
       WHERE (${INVOICE_PAID_SQL})
         AND date_trunc('month', i.billing_month) = date_trunc('month', $1::date)`,
      [prevStart]
    );

    const total = Number(cur.rows[0]?.total_sum || 0);
    const rent = Number(cur.rows[0]?.rent_sum || 0);
    const util = Number(cur.rows[0]?.util_sum || 0);
    const prevTotal = Number(pv.rows[0]?.total_sum || 0);

    const changePct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

    const rentPct = total > 0 ? Math.min(100, Math.round((rent / total) * 100)) : 0;
    const utilPct = total > 0 ? Math.min(100, Math.round((util / total) * 100)) : 0;

    return res.json({
      ok: true,
      period: { month, year },
      revenue: {
        current: total,
        change_pct: changePct,
      },
      rent: { pct: rentPct },
      utilities: { pct: utilPct },
    });
  } catch (err) {
    console.error('collection-summary error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** 12 tháng trong năm query: doanh từ hóa đơn PAID. */
router.get('/admin/analytics/monthly-series', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();

    let yr = Number(req.query.year);
    if (!Number.isFinite(yr) || yr < 2000 || yr > 2100) {
      yr = new Date().getFullYear();
    }

    const agg = await pool.query(
      `SELECT
         EXTRACT(MONTH FROM i.billing_month)::int AS period_month,
         COALESCE(SUM(i.total_amount), 0)::numeric AS revenue
       FROM invoices i
       WHERE (${INVOICE_PAID_SQL})
         AND EXTRACT(YEAR FROM i.billing_month) = $1
       GROUP BY EXTRACT(MONTH FROM i.billing_month)
       ORDER BY 1`,
      [yr]
    );

    const byMonth = new Map(agg.rows.map((r) => [Number(r.period_month), Number(r.revenue || 0)]));
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push({
        month: m,
        label: `T${m}`,
        revenue: byMonth.get(m) || 0,
        cost: 0,
      });
    }

    return res.json({ ok: true, year: yr, months });
  } catch (err) {
    console.error('monthly-series error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/analytics/recent-activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Promise.all([
      ensureUsersTable(),
      ensureRoomsTable(),
      ensureTenantsTable(),
      ensureInvoicesTable(),
      paymentsRoute.ensurePaymentsTable(),
      incidentsRoute.ensureIncidentsTable(),
      contractsRoute.ensureContractsTable(),
    ]);

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));

    const query = `
      SELECT * FROM (
        SELECT
          'payment' AS type,
          COALESCE(p.paid_at, p.created_at) AS at,
          CONCAT('Thanh toán hóa đơn ', COALESCE(r.room_number, '')) AS title,
          CONCAT('Số tiền ', COALESCE(p.amount, 0)::text, ' đã được thanh toán') AS detail
        FROM payments p
        LEFT JOIN invoices i ON i.invoice_id = p.invoice_id
        LEFT JOIN tenants t ON t.tenant_id = i.tenant_id
        LEFT JOIN rooms r ON r.room_id = t.room_id
        WHERE UPPER(TRIM(COALESCE(p.status::text, ''))) IN ('APPROVED', 'PAID')

        UNION ALL

        SELECT
          'ticket' AS type,
          COALESCE(i.updated_at, i.created_at) AS at,
          CONCAT('Yêu cầu bảo trì ', COALESCE(r.room_number, '')) AS title,
          COALESCE(i.title, 'Phiếu bảo trì mới') AS detail
        FROM incidents i
        LEFT JOIN rooms r ON r.room_id = i.room_id

        UNION ALL

        SELECT
          'contract' AS type,
          COALESCE(c.updated_at, c.created_at) AS at,
          CONCAT('Hợp đồng phòng ', COALESCE(r.room_number, '')) AS title,
          CONCAT('Từ ', TO_CHAR(c.start_date, 'DD/MM/YYYY'), ' đến ', TO_CHAR(c.end_date, 'DD/MM/YYYY')) AS detail
        FROM contracts c
        LEFT JOIN rooms r ON r.room_id = c.room_id
      ) AS combined
      WHERE at IS NOT NULL
      ORDER BY at DESC
      LIMIT $1`;

    const result = await pool.query(query, [limit]);
    return res.json({ ok: true, activities: result.rows });
  } catch (err) {
    console.error('recent-activity error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

