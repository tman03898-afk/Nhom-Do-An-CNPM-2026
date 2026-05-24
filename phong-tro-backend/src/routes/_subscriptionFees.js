const pool = require('../config/db');
const tenantFee = require('./_tenantFeeSubscriptions');
const { once } = require('./_schemaCache');

async function ensureTenantServiceSubscriptionsTable() {
  return once('schema:tenant_service_subscriptions', async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_service_subscriptions (
      subscription_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
      monthly_price NUMERIC NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      effective_from DATE,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      rejected_at TIMESTAMPTZ,
      reject_reason TEXT,
      head_count INTEGER
    )
  `);
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS head_count INTEGER`
  );
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS effective_from DATE`
  );
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`
  );
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`
  );
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ`
  );
  await pool.query(
    `ALTER TABLE tenant_service_subscriptions ADD COLUMN IF NOT EXISTS reject_reason TEXT`
  );
  await pool.query(`ALTER TABLE tenant_service_subscriptions DROP CONSTRAINT IF EXISTS chk_tenant_sub_status`);
  await pool.query(`
    ALTER TABLE tenant_service_subscriptions
    ADD CONSTRAINT chk_tenant_sub_status
    CHECK (status IN ('PENDING', 'ACTIVE', 'PENDING_CANCEL', 'REJECTED', 'CANCELLED'))
  `);
  await pool.query(`
    ALTER TABLE tenant_service_subscriptions
    ALTER COLUMN status SET DEFAULT 'PENDING'
  `);
  await pool.query(`
    UPDATE tenant_service_subscriptions
    SET effective_from = date_trunc('month', COALESCE(started_at, created_at, NOW()))::date
    WHERE status = 'ACTIVE' AND effective_from IS NULL
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_service_one_active
    ON tenant_service_subscriptions (tenant_id, service_id)
    WHERE status = 'ACTIVE'
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_service_one_pending
    ON tenant_service_subscriptions (tenant_id, service_id)
    WHERE status = 'PENDING'
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_service_one_pending_cancel
    ON tenant_service_subscriptions (tenant_id, service_id)
    WHERE status = 'PENDING_CANCEL'
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tss_tenant ON tenant_service_subscriptions(tenant_id)`);
  });
}

function isMeterUnit(unit) {
  const u = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/³/g, '3');
  return u === 'kwh' || u === 'm3';
}

function isPersonUnit(unit) {
  return String(unit || '').trim().toLowerCase() === 'person';
}

/**
 * Cập nhật other_fees_amount trên mọi hóa đơn chưa PAID của tenant theo tổng đăng ký hiện tại.
 */
async function syncUnpaidInvoicesOtherFeesForTenant(tenantId) {
  const { ensureInvoicesTable } = require('./invoices');
  const tid = Number(tenantId);
  if (!Number.isInteger(tid) || tid <= 0) return;

  await ensureInvoicesTable();
  await ensureTenantServiceSubscriptionsTable();
  await tenantFee.ensureTenantFeeSubscriptionsTable();

  const unpaid = await pool.query(
    `SELECT invoice_id, billing_month::text AS bm, other_fees_amount::numeric AS other
     FROM invoices
     WHERE tenant_id = $1 AND UPPER(TRIM(status::text)) NOT IN ('PAID')
     ORDER BY billing_month ASC`,
    [tid]
  );

  const manualByInvoiceId = new Map();
  for (const inv of unpaid.rows) {
    const bm = String(inv.bm).slice(0, 10);
    const sub = await sumAllRecurringExtrasForTenant(tid, bm);
    const other = Number(inv.other || 0);
    const manual = Math.max(0, Math.round((other - sub) * 100) / 100);
    manualByInvoiceId.set(Number(inv.invoice_id), manual);
  }

  for (const inv of unpaid.rows) {
    const invoiceId = Number(inv.invoice_id);
    const bm = String(inv.bm).slice(0, 10);
    const manual = manualByInvoiceId.get(invoiceId) || 0;
    const newSub = await sumAllRecurringExtrasForTenant(tid, bm);
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
}

/**
 * Tổng phí dịch vụ đăng ký áp dụng cho kỳ hóa đơn (billing_month = ngày đầu tháng).
 * Đăng ký còn ACTIVE, đã bắt đầu trong hoặc trước tháng đó, chưa hủy trước đầu tháng đó.
 */
async function sumActiveSubscriptionFeesForTenant(tenantId, billingMonthDate) {
  const tid = Number(tenantId);
  if (!Number.isInteger(tid) || tid <= 0) return 0;
  const bm = billingMonthDate ? String(billingMonthDate).slice(0, 10) : null;
  if (!bm) return 0;

  const r = await pool.query(
    `SELECT COALESCE(SUM(monthly_price), 0)::numeric AS s
     FROM tenant_service_subscriptions
     WHERE tenant_id = $1
       AND status IN ('ACTIVE', 'PENDING_CANCEL')
       AND effective_from IS NOT NULL
       AND date_trunc('month', effective_from)::date <= date_trunc('month', $2::date)::date
       AND (cancelled_at IS NULL OR (cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= date_trunc('month', $2::date)::date)`,
    [tid, bm]
  );
  return Number(r.rows[0]?.s || 0);
}

/**
 * Các dòng đăng ký dịch vụ còn hiệu lực cho kỳ billing_month (cùng điều kiện với sumActiveSubscriptionFeesForTenant).
 */
async function listActiveSubscriptionLinesForTenant(tenantId, billingMonthDate) {
  const tid = Number(tenantId);
  if (!Number.isInteger(tid) || tid <= 0) return [];
  const bm = billingMonthDate ? String(billingMonthDate).slice(0, 10) : null;
  if (!bm) return [];

  const r = await pool.query(
    `SELECT s.service_id, s.monthly_price, s.head_count, sv.name AS service_name, sv.unit AS service_unit, sv.price AS unit_price
     FROM tenant_service_subscriptions s
     JOIN services sv ON sv.service_id = s.service_id
     WHERE s.tenant_id = $1
       AND s.status IN ('ACTIVE', 'PENDING_CANCEL')
       AND s.effective_from IS NOT NULL
       AND date_trunc('month', s.effective_from)::date <= date_trunc('month', $2::date)::date
       AND (s.cancelled_at IS NULL OR (s.cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= date_trunc('month', $2::date)::date)
     ORDER BY sv.name ASC`,
    [tid, bm]
  );
  return r.rows.map((row) => ({
    service_id: row.service_id,
    service_name: row.service_name,
    service_unit: row.service_unit,
    head_count: row.head_count != null ? Number(row.head_count) : null,
    unit_price: Number(row.unit_price || 0),
    monthly_price: Number(row.monthly_price || 0),
  }));
}

/** Tổng phụ phí đăng ký: bảng services + bảng service_fees (đã duyệt). */
async function sumAllRecurringExtrasForTenant(tenantId, billingMonthDate) {
  await ensureTenantServiceSubscriptionsTable();
  await tenantFee.ensureTenantFeeSubscriptionsTable();
  const fromServices = await sumActiveSubscriptionFeesForTenant(tenantId, billingMonthDate);
  const fromFees = await tenantFee.sumActiveFeeSubscriptionFeesForTenant(tenantId, billingMonthDate);
  return fromServices + fromFees;
}

/** Dòng hiển thị trên hóa đơn (đăng ký services + tiện ích service_fees). */
async function listAllSubscriptionLinesForTenant(tenantId, billingMonthDate) {
  await ensureTenantServiceSubscriptionsTable();
  await tenantFee.ensureTenantFeeSubscriptionsTable();
  const svc = await listActiveSubscriptionLinesForTenant(tenantId, billingMonthDate);
  const fee = await tenantFee.listActiveFeeSubscriptionLinesForTenant(tenantId, billingMonthDate);
  const fromSvc = svc.map((row) => ({
    source: 'service',
    service_id: row.service_id,
    fee_id: null,
    service_name: row.service_name,
    service_unit: row.service_unit,
    head_count: row.head_count,
    unit_price: row.unit_price,
    monthly_price: Number(row.monthly_price || 0),
  }));
  return [...fromSvc, ...fee];
}

module.exports = {
  ensureTenantServiceSubscriptionsTable,
  sumActiveSubscriptionFeesForTenant,
  listActiveSubscriptionLinesForTenant,
  sumAllRecurringExtrasForTenant,
  listAllSubscriptionLinesForTenant,
  syncUnpaidInvoicesOtherFeesForTenant,
  isMeterUnit,
  isPersonUnit,
};
