const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireTenant } = require('../middleware/auth');
const { ensureTenantsTable } = require('./_dbHelpers');
const { ensureServicesTable } = require('./services');
const { ensureTenantServiceSubscriptionsTable } = require('./_subscriptionFees');

const router = express.Router();

async function getTenantIdForUser(userId) {
  const r = await pool.query(`SELECT tenant_id FROM tenants WHERE user_id = $1 LIMIT 1`, [userId]);
  return r.rowCount ? Number(r.rows[0].tenant_id) : null;
}

/** Dịch vụ tenant được đăng ký (ẩn đơn giá điện/nước theo allow_tenant_subscription). */
router.get('/tenant/services-catalog', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureServicesTable();
    const result = await pool.query(
      `SELECT service_id, name, unit, price, is_active
       FROM services
       WHERE is_active = true
         AND COALESCE(allow_tenant_subscription, true) = true
       ORDER BY name ASC`
    );
    return res.json({ ok: true, services: result.rows });
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
         s.status,
         s.started_at,
         s.cancelled_at,
         sv.name AS service_name,
         sv.unit AS service_unit,
         sv.price AS service_current_price
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
      `SELECT service_id, price, is_active, COALESCE(allow_tenant_subscription, true) AS allow_sub
       FROM services WHERE service_id = $1 LIMIT 1`,
      [serviceId]
    );
    if (svc.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'service not found' });
    }
    if (!svc.rows[0].is_active || !svc.rows[0].allow_sub) {
      return res.status(400).json({ ok: false, message: 'service is not available for subscription' });
    }

    const monthlyPrice = Number(svc.rows[0].price || 0);

    const dup = await pool.query(
      `SELECT subscription_id FROM tenant_service_subscriptions
       WHERE tenant_id = $1 AND service_id = $2 AND status = 'ACTIVE' LIMIT 1`,
      [tenantId, serviceId]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ ok: false, message: 'already subscribed to this service' });
    }

    const ins = await pool.query(
      `INSERT INTO tenant_service_subscriptions (tenant_id, service_id, monthly_price, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING subscription_id, tenant_id, service_id, monthly_price, status, started_at`,
      [tenantId, serviceId, monthlyPrice]
    );

    return res.status(201).json({ ok: true, subscription: ins.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'already subscribed to this service' });
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

    const result = await pool.query(
      `UPDATE tenant_service_subscriptions
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE subscription_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
       RETURNING subscription_id`,
      [sid, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'active subscription not found' });
    }

    return res.json({ ok: true, message: 'cancelled' });
  } catch (err) {
    console.error('Cancel tenant subscription error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
