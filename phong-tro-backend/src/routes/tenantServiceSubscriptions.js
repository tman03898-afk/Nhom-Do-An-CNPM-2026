const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireTenant, requireAdmin } = require('../middleware/auth');
const { firstDayOfCurrentMonthYmd } = require('./_tenantFeeSubscriptions');
const { ensureTenantsTable } = require('./_dbHelpers');
const { ensureServicesTable } = require('./services');
const {
  ensureTenantServiceSubscriptionsTable,
  syncUnpaidInvoicesOtherFeesForTenant,
  isMeterUnit,
  isPersonUnit,
} = require('./_subscriptionFees');

const router = express.Router();

async function getTenantIdForUser(userId) {
  const r = await pool.query(`SELECT tenant_id FROM tenants WHERE user_id = $1 LIMIT 1`, [userId]);
  return r.rowCount ? Number(r.rows[0].tenant_id) : null;
}

/** Sức chứa phòng của tenant (ưu tiên hợp đồng ACTIVE, sau đó tenants.room_id). */
async function getRoomCapacityForTenant(tenantId) {
  const tid = Number(tenantId);
  const fromContract = await pool.query(
    `SELECT r.max_tenants
     FROM contracts c
     JOIN rooms r ON r.room_id = c.room_id
     WHERE c.tenant_id = $1 AND c.status = 'ACTIVE'
     ORDER BY c.contract_id DESC
     LIMIT 1`,
    [tid]
  );
  if (fromContract.rowCount > 0) {
    return Number(fromContract.rows[0].max_tenants) || 1;
  }
  const fromTenant = await pool.query(
    `SELECT r.max_tenants
     FROM tenants t
     JOIN rooms r ON r.room_id = t.room_id
     WHERE t.tenant_id = $1
     LIMIT 1`,
    [tid]
  );
  if (fromTenant.rowCount > 0) {
    return Number(fromTenant.rows[0].max_tenants) || 1;
  }
  return 1;
}

/** Dịch vụ tenant được đăng ký (không gồm điện/nước công tơ). */
router.get('/tenant/services-catalog', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureServicesTable();
    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) {
      return res.status(404).json({ ok: false, message: 'tenant profile not found' });
    }

    const result = await pool.query(
      `SELECT service_id, name, unit, price, is_active
       FROM services
       WHERE is_active = true
         AND COALESCE(allow_tenant_subscription, true) = true
         AND LOWER(TRIM(COALESCE(unit, ''))) NOT IN ('kwh', 'm3', 'm³')
       ORDER BY name ASC`
    );
    const room_max_tenants = await getRoomCapacityForTenant(tenantId);
    return res.json({ ok: true, services: result.rows, room_max_tenants });
  } catch (err) {
    console.error('Tenant services catalog error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Bảng phí tham khảo (service_fees) — tenant đối chiếu; số thực tế trên hợp đồng/hóa đơn có thể khác. */
router.get('/tenant/service-fees-reference', requireAuth, requireTenant, async (req, res) => {
  try {
    const ex = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'service_fees'
       ) AS ok`
    );
    if (!ex.rows[0]?.ok) {
      return res.json({ ok: true, fees: [] });
    }

    const result = await pool.query(
      `SELECT
         fee_id,
         fee_name,
         description,
         unit_price,
         unit,
         fee_type::text AS fee_type
       FROM service_fees
       WHERE COALESCE(is_active, true) = true
       ORDER BY
         CASE COALESCE(fee_type::text, '')
           WHEN 'UTILITY' THEN 0
           ELSE 1
         END,
         fee_name ASC`
    );
    return res.json({ ok: true, fees: result.rows });
  } catch (err) {
    console.error('Tenant service_fees reference error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/service-subscriptions', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) {
      return res.status(404).json({ ok: false, message: 'tenant profile not found' });
    }

    const result = await pool.query(
      `SELECT
         s.subscription_id,
         s.service_id,
         s.monthly_price,
         s.head_count,
         s.status,
         s.started_at,
         s.effective_from,
         s.cancelled_at,
         s.reject_reason,
         sv.name AS service_name,
         sv.unit AS service_unit,
         sv.price AS service_unit_price
       FROM tenant_service_subscriptions s
       JOIN services sv ON sv.service_id = s.service_id
       WHERE s.tenant_id = $1
       ORDER BY s.status ASC, s.started_at DESC`,
      [tenantId]
    );
    return res.json({ ok: true, subscriptions: result.rows });
  } catch (err) {
    console.error('List tenant subscriptions error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/tenant/service-subscriptions', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) {
      return res.status(404).json({ ok: false, message: 'tenant profile not found' });
    }

    const serviceId = Number(req.body?.service_id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ ok: false, message: 'service_id is required' });
    }

    const svc = await pool.query(
      `SELECT service_id, name, unit, price, is_active, COALESCE(allow_tenant_subscription, true) AS allow_sub
       FROM services WHERE service_id = $1 LIMIT 1`,
      [serviceId]
    );
    if (svc.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'service not found' });
    }
    const row = svc.rows[0];
    if (!row.is_active || !row.allow_sub) {
      return res.status(400).json({ ok: false, message: 'service is not available for subscription' });
    }
    if (isMeterUnit(row.unit)) {
      return res.status(400).json({
        ok: false,
        message: 'Điện/nước được tính qua chỉ số công tơ trên hóa đơn, không đăng ký tại đây.',
      });
    }

    const unitPrice = Number(row.price || 0);
    const maxTenants = await getRoomCapacityForTenant(tenantId);
    let headCount = null;
    let monthlyPrice = unitPrice;

    if (isPersonUnit(row.unit)) {
      headCount = Number(req.body?.head_count);
      if (!Number.isInteger(headCount) || headCount < 1) {
        return res.status(400).json({ ok: false, message: 'Vui lòng nhập số người (số nguyên ≥ 1).' });
      }
      if (headCount > maxTenants) {
        return res.status(400).json({
          ok: false,
          message: `Số người không được vượt sức chứa phòng (tối đa ${maxTenants} người).`,
        });
      }
      monthlyPrice = Math.round(unitPrice * headCount * 100) / 100;
    }

    const dup = await pool.query(
      `SELECT subscription_id, status FROM tenant_service_subscriptions
       WHERE tenant_id = $1 AND service_id = $2 AND status IN ('PENDING', 'ACTIVE', 'PENDING_CANCEL')
       LIMIT 1`,
      [tenantId, serviceId]
    );
    if (dup.rowCount > 0) {
      const st = String(dup.rows[0].status || '').toUpperCase();
      let message = 'Bạn đã đăng ký dịch vụ này.';
      if (st === 'PENDING') message = 'Bạn đã gửi yêu cầu đăng ký — đang chờ duyệt.';
      if (st === 'PENDING_CANCEL') message = 'Đang chờ duyệt ngưng dịch vụ này.';
      return res.status(409).json({ ok: false, message });
    }

    const ins = await pool.query(
      `INSERT INTO tenant_service_subscriptions (tenant_id, service_id, monthly_price, head_count, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING subscription_id, tenant_id, service_id, monthly_price, head_count, status, started_at, created_at`,
      [tenantId, serviceId, monthlyPrice, headCount]
    );

    return res.status(201).json({
      ok: true,
      subscription: ins.rows[0],
      message: 'Đã gửi yêu cầu đăng ký. Vui lòng chờ chủ trọ duyệt.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Bạn đã đăng ký dịch vụ này.' });
    }
    console.error('Create tenant subscription error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.delete('/tenant/service-subscriptions/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureTenantServiceSubscriptionsTable();

    const tenantId = await getTenantIdForUser(req.auth.sub);
    if (!tenantId) {
      return res.status(404).json({ ok: false, message: 'tenant profile not found' });
    }

    const sid = Number(req.params.id);
    if (!Number.isInteger(sid) || sid <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid subscription id' });
    }

    const pend = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE subscription_id = $1 AND tenant_id = $2 AND status = 'PENDING'
       RETURNING subscription_id`,
      [sid, tenantId]
    );
    if (pend.rowCount > 0) {
      return res.json({ ok: true, message: 'withdrawn' });
    }

    const pendCancel = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'ACTIVE', updated_at = NOW()
       WHERE subscription_id = $1 AND tenant_id = $2 AND status = 'PENDING_CANCEL'
       RETURNING subscription_id`,
      [sid, tenantId]
    );
    if (pendCancel.rowCount > 0) {
      return res.json({ ok: true, message: 'withdrawn_cancel_request' });
    }

    const act = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'PENDING_CANCEL', updated_at = NOW()
       WHERE subscription_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
       RETURNING subscription_id`,
      [sid, tenantId]
    );
    if (act.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'subscription not found or not cancellable' });
    }

    return res.json({
      ok: true,
      message: 'Đã gửi yêu cầu ngưng dùng. Vui lòng chờ chủ trọ duyệt.',
    });
  } catch (err) {
    console.error('Cancel tenant subscription error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/service-subscriptions/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantsTable();
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const result = await pool.query(
      `SELECT
         s.subscription_id,
         s.tenant_id,
         s.service_id,
         s.monthly_price,
         s.head_count,
         s.status,
         s.created_at,
         sv.name AS service_name,
         sv.unit AS service_unit,
         u.full_name AS tenant_name,
         u.email AS tenant_email,
         r.room_number
       FROM tenant_service_subscriptions s
       JOIN tenants t ON t.tenant_id = s.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       JOIN services sv ON sv.service_id = s.service_id
       WHERE s.status = 'PENDING'
       ORDER BY s.created_at ASC`
    );
    const cancelRes = await pool.query(
      `SELECT
         s.subscription_id,
         s.tenant_id,
         s.service_id,
         s.monthly_price,
         s.head_count,
         s.status,
         s.updated_at AS created_at,
         sv.name AS service_name,
         sv.unit AS service_unit,
         u.full_name AS tenant_name,
         u.email AS tenant_email,
         r.room_number
       FROM tenant_service_subscriptions s
       JOIN tenants t ON t.tenant_id = s.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       JOIN services sv ON sv.service_id = s.service_id
       WHERE s.status = 'PENDING_CANCEL'
       ORDER BY s.updated_at ASC`
    );

    return res.json({
      ok: true,
      pending: result.rows,
      pending_cancellations: cancelRes.rows,
    });
  } catch (err) {
    console.error('admin service-subscriptions pending error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/service-subscriptions/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantServiceSubscriptionsTable();
    const { ensureInvoicesTable } = require('./invoices');

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    const pending = await pool.query(
      `SELECT subscription_id, tenant_id, service_id
       FROM tenant_service_subscriptions
       WHERE subscription_id = $1 AND status = 'PENDING'`,
      [id]
    );
    if (pending.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }
    const tenantId = Number(pending.rows[0].tenant_id);
    const serviceId = Number(pending.rows[0].service_id);

    const activeDup = await pool.query(
      `SELECT subscription_id FROM tenant_service_subscriptions
       WHERE tenant_id = $1 AND service_id = $2 AND status = 'ACTIVE' AND subscription_id <> $3
       LIMIT 1`,
      [tenantId, serviceId, id]
    );
    if (activeDup.rowCount > 0) {
      return res.status(409).json({ ok: false, message: 'tenant already has active subscription for this service' });
    }

    await ensureInvoicesTable();
    const effectiveFrom = firstDayOfCurrentMonthYmd();
    const result = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'ACTIVE',
           effective_from = $1::date,
           approved_at = NOW(),
           approved_by = $2,
           updated_at = NOW()
       WHERE subscription_id = $3 AND status = 'PENDING'
       RETURNING subscription_id, tenant_id, service_id, monthly_price, head_count, status, effective_from`,
      [effectiveFrom, req.auth.sub || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }

    await syncUnpaidInvoicesOtherFeesForTenant(tenantId);

    return res.json({ ok: true, subscription: result.rows[0] });
  } catch (err) {
    console.error('admin service-subscriptions approve error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/service-subscriptions/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantServiceSubscriptionsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    const reason = req.body?.reason != null ? String(req.body.reason).slice(0, 500) : null;

    const result = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'REJECTED',
           rejected_at = NOW(),
           reject_reason = $1,
           updated_at = NOW()
       WHERE subscription_id = $2 AND status = 'PENDING'
       RETURNING subscription_id`,
      [reason, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending request not found' });
    }
    return res.json({ ok: true, message: 'rejected' });
  } catch (err) {
    console.error('admin service-subscriptions reject error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/service-subscriptions/:id/approve-cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantServiceSubscriptionsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    const row = await pool.query(
      `SELECT subscription_id, tenant_id
       FROM tenant_service_subscriptions
       WHERE subscription_id = $1 AND status = 'PENDING_CANCEL'`,
      [id]
    );
    if (row.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending cancellation not found' });
    }
    const tenantId = Number(row.rows[0].tenant_id);

    const result = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE subscription_id = $1 AND status = 'PENDING_CANCEL'
       RETURNING subscription_id, tenant_id, service_id, status`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending cancellation not found' });
    }

    await syncUnpaidInvoicesOtherFeesForTenant(tenantId);

    return res.json({ ok: true, subscription: result.rows[0] });
  } catch (err) {
    console.error('admin service-subscriptions approve-cancel error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/service-subscriptions/:id/reject-cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantServiceSubscriptionsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    const reason = req.body?.reason != null ? String(req.body.reason).slice(0, 500) : null;

    const result = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'ACTIVE',
           reject_reason = $1,
           updated_at = NOW()
       WHERE subscription_id = $2 AND status = 'PENDING_CANCEL'
       RETURNING subscription_id`,
      [reason, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'pending cancellation not found' });
    }
    return res.json({ ok: true, message: 'rejected' });
  } catch (err) {
    console.error('admin service-subscriptions reject-cancel error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
