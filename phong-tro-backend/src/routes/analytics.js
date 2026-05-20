const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');
const { ensureInvoicesTable } = require('./invoices');
const { ensurePaymentsTable } = require('./payments');

const router = express.Router();

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p <= 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

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

/** Doanh thu & chi phí tiện ích theo tháng (hóa đơn PAID). */
router.get('/admin/analytics/monthly-series', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureInvoicesTable();
    const year = Number(req.query.year) || new Date().getFullYear();

    const rows = await pool.query(
      `SELECT
         EXTRACT(MONTH FROM billing_month)::int AS month,
         COALESCE(SUM(total_amount), 0)::float AS revenue,
         COALESCE(SUM(COALESCE(electricity_amount, 0) + COALESCE(water_amount, 0) + COALESCE(other_fees_amount, 0)), 0)::float AS cost
       FROM invoices
       WHERE status::text = 'PAID'
         AND EXTRACT(YEAR FROM billing_month) = $1
       GROUP BY 1
       ORDER BY 1`,
      [year]
    );

    const byMonth = new Map(rows.rows.map((r) => [Number(r.month), r]));
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const row = byMonth.get(m);
      return {
        month: m,
        label: `T${m}`,
        revenue: Number(row?.revenue || 0),
        cost: Number(row?.cost || 0),
      };
    });

    return res.json({ ok: true, year, months });
  } catch (err) {
    console.error('Monthly series error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Tỷ lệ thu hộ kỳ hiện tại (theo billing_month tháng/năm hiện tại). */
router.get('/admin/analytics/collection-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureInvoicesTable();
    const { year, month } = currentYearMonth();

    const r = await pool.query(
      `SELECT
         COALESCE(SUM(rent_amount) FILTER (WHERE status::text = 'PAID'), 0)::float AS rent_collected,
         COALESCE(SUM(rent_amount) FILTER (WHERE status::text <> 'CANCELLED'), 0)::float AS rent_billed,
         COALESCE(SUM(COALESCE(electricity_amount, 0) + COALESCE(water_amount, 0) + COALESCE(other_fees_amount, 0))
           FILTER (WHERE status::text = 'PAID'), 0)::float AS utilities_collected,
         COALESCE(SUM(COALESCE(electricity_amount, 0) + COALESCE(water_amount, 0) + COALESCE(other_fees_amount, 0))
           FILTER (WHERE status::text <> 'CANCELLED'), 0)::float AS utilities_billed,
         COALESCE(SUM(total_amount) FILTER (WHERE status::text = 'PAID'), 0)::float AS total_collected,
         COALESCE(SUM(total_amount) FILTER (WHERE status::text <> 'CANCELLED'), 0)::float AS total_billed
       FROM invoices
       WHERE EXTRACT(YEAR FROM billing_month) = $1
         AND EXTRACT(MONTH FROM billing_month) = $2`,
      [year, month]
    );

    const row = r.rows[0] || {};
    const rentBilled = Number(row.rent_billed || 0);
    const rentCollected = Number(row.rent_collected || 0);
    const utilBilled = Number(row.utilities_billed || 0);
    const utilCollected = Number(row.utilities_collected || 0);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prev = await pool.query(
      `SELECT COALESCE(SUM(total_amount) FILTER (WHERE status::text = 'PAID'), 0)::float AS revenue
       FROM invoices
       WHERE EXTRACT(YEAR FROM billing_month) = $1 AND EXTRACT(MONTH FROM billing_month) = $2`,
      [prevYear, prevMonth]
    );
    const currentRevenue = Number(row.total_collected || 0);
    const prevRevenue = Number(prev.rows[0]?.revenue || 0);

    return res.json({
      ok: true,
      period: { year, month },
      revenue: {
        current: currentRevenue,
        previous: prevRevenue,
        change_pct: pctChange(currentRevenue, prevRevenue),
      },
      rent: {
        collected: rentCollected,
        billed: rentBilled,
        pct: rentBilled > 0 ? Math.round((rentCollected / rentBilled) * 100) : 0,
      },
      utilities: {
        collected: utilCollected,
        billed: utilBilled,
        pct: utilBilled > 0 ? Math.round((utilCollected / utilBilled) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Collection summary error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Hoạt động gần đây (thanh toán, phiếu bảo trì, hợp đồng). */
router.get('/admin/analytics/recent-activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureInvoicesTable();
    await ensurePaymentsTable();
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();

    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const [payments, tickets, contracts] = await Promise.all([
      pool.query(
        `SELECT p.payment_id, p.amount_paid, p.paid_at, p.updated_at, p.status,
                u.full_name AS tenant_name, r.room_number
         FROM payments p
         LEFT JOIN invoices i ON i.invoice_id = p.invoice_id
         LEFT JOIN tenants t ON t.tenant_id = i.tenant_id
         LEFT JOIN users u ON u.user_id = t.user_id
         LEFT JOIN rooms r ON r.room_id = i.room_id OR r.room_id = t.room_id
         WHERE COALESCE(p.status::text, '') IN ('APPROVED', 'COMPLETED', 'PAID')
         ORDER BY COALESCE(p.paid_at, p.updated_at, p.created_at) DESC NULLS LAST
         LIMIT 6`
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT i.incident_id, i.title, i.status, i.created_at, r.room_number
         FROM incidents i
         LEFT JOIN rooms r ON r.room_id = i.room_id
         ORDER BY i.created_at DESC
         LIMIT 6`
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT c.contract_id, c.status, c.created_at, r.room_number, u.full_name AS tenant_name
         FROM contracts c
         LEFT JOIN rooms r ON r.room_id = c.room_id
         LEFT JOIN tenants t ON t.tenant_id = c.tenant_id
         LEFT JOIN users u ON u.user_id = t.user_id
         ORDER BY c.created_at DESC
         LIMIT 6`
      ).catch(() => ({ rows: [] })),
    ]);

    const items = [];

    for (const p of payments.rows) {
      const at = p.paid_at || p.updated_at;
      items.push({
        type: 'payment',
        title: `Thanh toán ${Number(p.amount_paid || 0).toLocaleString('vi-VN')}đ`,
        detail: [p.tenant_name, p.room_number ? `Phòng ${p.room_number}` : null].filter(Boolean).join(' · ') || 'Khách thuê',
        at,
      });
    }

    for (const t of tickets.rows) {
      const st = String(t.status || '').toUpperCase();
      let statusLabel = 'Phiếu bảo trì';
      if (st === 'OPEN' || st === 'PENDING') statusLabel = 'Phiếu chờ xử lý';
      else if (st === 'RESOLVED' || st === 'DONE' || st === 'CLOSED') statusLabel = 'Phiếu đã xử lý';
      items.push({
        type: 'ticket',
        title: t.title || statusLabel,
        detail: t.room_number ? `Phòng ${t.room_number}` : statusLabel,
        at: t.created_at,
      });
    }

    for (const c of contracts.rows) {
      items.push({
        type: 'contract',
        title: `Hợp đồng #${c.contract_id}`,
        detail: [c.tenant_name, c.room_number ? `Phòng ${c.room_number}` : null, c.status].filter(Boolean).join(' · '),
        at: c.created_at,
      });
    }

    items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    const sliced = items.slice(0, limit).map((x) => ({
      ...x,
      at: x.at ? new Date(x.at).toISOString() : null,
    }));

    return res.json({ ok: true, activities: sliced });
  } catch (err) {
    console.error('Recent activity error:', err);
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

