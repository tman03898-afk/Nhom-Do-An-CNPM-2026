const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireTenant, requireAdmin } = require('../middleware/auth');
const { ensureTenantsTable } = require('./_dbHelpers');
const {
  ensureTenantFeeSubscriptionsTable,
  hasPublicTable,
  isFeeSubscribableRow,
  firstDayOfCurrentMonthYmd,
} = require('./_tenantFeeSubscriptions');

const router = express.Router();

async function getTenantIdForUser(userId) {
  const r = await pool.query(`SELECT tenant_id FROM tenants WHERE user_id = $1 LIMIT 1`, [userId]);
  return r.rowCount ? Number(r.rows[0].tenant_id) : null;
}

/** Các phí FIXED trong service_fees được phép đăng ký (đã loại Bảo vệ, Thang máy). */
router.get('/tenant/fee-subscription-options', requireAuth, requireTenant, async (req, res) => {
  try {
    if (!(await hasPublicTable('service_fees'))) {
      return res.json({ ok: true, fees: [] });
    }
    const result = await pool.query(
      `SELECT fee_id, fee_name, description, unit_price, unit, fee_type::text AS fee_type
       FROM service_fees
       WHERE COALESCE(is_active, true) = true
         AND fee_type::text = 'FIXED'
         AND TRIM(fee_name) NOT IN ('Bảo vệ', 'Thang máy')
       ORDER BY fee_name ASC`
    );
    const fees = result.rows.filter((row) => isFeeSubscribableRow(row));
    return res.json({ ok: true, fees });
  } catch (err) {
    console.error('fee-subscription-options error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/fee-subscriptions', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureTenantFeeSubscriptionsTable();
    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) return res.status(404).json({ ok: false, message: 'tenant profile not found' });

    if (!(await hasPublicTable('tenant_fee_subscriptions'))) {
      return res.json({ ok: true, subscriptions: [] });
    }

    const result = await pool.query(
      `SELECT
         tfs.id,
         tfs.fee_id,
         tfs.monthly_price,
         tfs.status,
         tfs.effective_from,
         tfs.created_at,
         tfs.approved_at,
         tfs.rejected_at,
         tfs.reject_reason,
         sf.fee_name,
         sf.unit,
         sf.description
       FROM tenant_fee_subscriptions tfs
       JOIN service_fees sf ON sf.fee_id = tfs.fee_id
       WHERE tfs.tenant_id = $1
       ORDER BY
         CASE tfs.status
           WHEN 'PENDING' THEN 0
           WHEN 'ACTIVE' THEN 1
           WHEN 'REJECTED' THEN 2
           ELSE 3
         END,
         tfs.created_at DESC`,
      [tenantId]
    );
    return res.json({ ok: true, subscriptions: result.rows });
  } catch (err) {
    console.error('tenant fee-subscriptions list error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/tenant/fee-subscriptions', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureTenantFeeSubscriptionsTable();
    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) return res.status(404).json({ ok: false, message: 'tenant profile not found' });

    const feeId = Number(req.body?.fee_id);
    if (!Number.isInteger(feeId) || feeId <= 0) {
      return res.status(400).json({ ok: false, message: 'fee_id is required' });
    }

    const feeRes = await pool.query(
      `SELECT fee_id, fee_name, unit_price, unit, fee_type::text AS fee_type, COALESCE(is_active, true) AS is_active
       FROM service_fees WHERE fee_id = $1 LIMIT 1`,
      [feeId]
    );
    if (!feeRes.rowCount) return res.status(404).json({ ok: false, message: 'fee not found' });
    const row = feeRes.rows[0];
    if (!row.is_active || !isFeeSubscribableRow(row)) {
      return res.status(400).json({ ok: false, message: 'fee is not available for registration' });
    }

    const price = Number(row.unit_price || 0);
    const dup = await pool.query(
      `SELECT id, status FROM tenant_fee_subscriptions
       WHERE tenant_id = $1 AND fee_id = $2 AND status IN ('PENDING', 'ACTIVE')
       LIMIT 1`,
      [tenantId, feeId]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ ok: false, message: 'already pending or active for this fee' });
    }

    const ins = await pool.query(
      `INSERT INTO tenant_fee_subscriptions (tenant_id, fee_id, monthly_price, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, tenant_id, fee_id, monthly_price, status, created_at`,
      [tenantId, feeId, price]
    );
    return res.status(201).json({ ok: true, subscription: ins.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'already pending or active for this fee' });
    }
    console.error('tenant fee-subscriptions create error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.delete('/tenant/fee-subscriptions/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureTenantFeeSubscriptionsTable();
    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) return res.status(404).json({ ok: false, message: 'tenant profile not found' });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    const pend = await pool.query(
      `UPDATE tenant_fee_subscriptions
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'PENDING'
       RETURNING id`,
      [id, tenantId]
    );
    if (pend.rowCount > 0) return res.json({ ok: true, message: 'withdrawn' });

    const act = await pool.query(
      `UPDATE tenant_fee_subscriptions
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
       RETURNING id`,
      [id, tenantId]
    );
    if (act.rowCount > 0) return res.json({ ok: true, message: 'cancelled' });

    return res.status(404).json({ ok: false, message: 'subscription not found or not cancellable' });
  } catch (err) {
    console.error('tenant fee-subscriptions delete error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/fee-subscriptions/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureTenantFeeSubscriptionsTable();
    if (!(await hasPublicTable('tenant_fee_subscriptions'))) {
      return res.json({ ok: true, pending: [] });
    }

    const result = await pool.query(
      `SELECT
         tfs.id,
         tfs.tenant_id,
         tfs.fee_id,
         tfs.monthly_price,
         tfs.status,
         tfs.created_at,
         sf.fee_name,
         sf.unit,
         sf.description,
         u.full_name AS tenant_name,
         u.email AS tenant_email,
         r.room_number
       FROM tenant_fee_subscriptions tfs
       JOIN tenants t ON t.tenant_id = tfs.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       JOIN service_fees sf ON sf.fee_id = tfs.fee_id
       WHERE tfs.status = 'PENDING'
       ORDER BY tfs.created_at ASC`
    );
    return res.json({ ok: true, pending: result.rows });
  } catch (err) {
    console.error('admin fee-subscriptions pending error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/fee-subscriptions/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantFeeSubscriptionsTable();
    const { ensureInvoicesTable } = require('./invoices');
    const { sumAllRecurringExtrasForTenant, ensureTenantServiceSubscriptionsTable } = require('./_subscriptionFees');

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    const pending = await pool.query(
      `SELECT id, tenant_id
       FROM tenant_fee_subscriptions
       WHERE id = $1 AND status = 'PENDING'`,
      [id]
    );
    if (pending.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }
    const tenantId = Number(pending.rows[0].tenant_id);

    await ensureInvoicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const unpaid = await pool.query(
      `SELECT invoice_id, billing_month::text AS bm, other_fees_amount::numeric AS other
       FROM invoices
       WHERE tenant_id = $1 AND UPPER(TRIM(status::text)) NOT IN ('PAID')
       ORDER BY billing_month ASC`,
      [tenantId]
    );

    const manualByInvoiceId = new Map();
    for (const inv of unpaid.rows) {
      const bm = String(inv.bm).slice(0, 10);
      const sub = await sumAllRecurringExtrasForTenant(tenantId, bm);
      const other = Number(inv.other || 0);
      const manual = Math.max(0, Math.round((other - sub) * 100) / 100);
      manualByInvoiceId.set(Number(inv.invoice_id), manual);
    }

    const effectiveFrom = firstDayOfCurrentMonthYmd();
    const result = await pool.query(
      `UPDATE tenant_fee_subscriptions
       SET status = 'ACTIVE',
           effective_from = $1::date,
           approved_at = NOW(),
           approved_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id, tenant_id, fee_id, monthly_price, status, effective_from`,
      [effectiveFrom, req.auth.sub || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }

    for (const inv of unpaid.rows) {
      const invoiceId = Number(inv.invoice_id);
      const bm = String(inv.bm).slice(0, 10);
      const manual = manualByInvoiceId.get(invoiceId) || 0;
      const newSub = await sumAllRecurringExtrasForTenant(tenantId, bm);
      const newOther = Math.round((manual + newSub) * 100) / 100;
      const rowRes = await pool.query(
        `SELECT rent_amount::numeric AS rent, electricity_amount::numeric AS el, water_amount::numeric AS wa
         FROM invoices WHERE invoice_id = $1`,
        [invoiceId]
      );
      if (rowRes.rowCount === 0) continue;
      const rent = Number(rowRes.rows[0].rent || 0);
      const el = Number(rowRes.rows[0].el || 0);
      const wa = Number(rowRes.rows[0].wa || 0);
      const total = Math.round((rent + el + wa + newOther) * 100) / 100;
      await pool.query(
        `UPDATE invoices
         SET other_fees_amount = $1, total_amount = $2, updated_at = NOW()
         WHERE invoice_id = $3`,
        [newOther, total, invoiceId]
      );
    }

    return res.json({ ok: true, subscription: result.rows[0] });
  } catch (err) {
    console.error('admin fee-subscriptions approve error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/fee-subscriptions/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantFeeSubscriptionsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    const reason = req.body?.reason != null ? String(req.body.reason).slice(0, 500) : null;

    const result = await pool.query(
      `UPDATE tenant_fee_subscriptions
       SET status = 'REJECTED',
           rejected_at = NOW(),
           reject_reason = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'PENDING'
       RETURNING id`,
      [reason, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }
    return res.json({ ok: true, message: 'rejected' });
  } catch (err) {
    console.error('admin fee-subscriptions reject error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
