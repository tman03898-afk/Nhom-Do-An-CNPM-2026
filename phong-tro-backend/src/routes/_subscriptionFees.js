const pool = require('../config/db');
const tenantFee = require('./_tenantFeeSubscriptions');

async function ensureTenantServiceSubscriptionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_service_subscriptions (
      subscription_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
      monthly_price NUMERIC NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_tenant_sub_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_service_one_active
    ON tenant_service_subscriptions (tenant_id, service_id)
    WHERE status = 'ACTIVE'
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tss_tenant ON tenant_service_subscriptions(tenant_id)`);
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
       AND status = 'ACTIVE'
       AND (started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= (date_trunc('month', $2::date) + interval '1 month - 1 day')::date
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
    `SELECT s.service_id, s.monthly_price, sv.name AS service_name
     FROM tenant_service_subscriptions s
     JOIN services sv ON sv.service_id = s.service_id
     WHERE s.tenant_id = $1
       AND s.status = 'ACTIVE'
       AND (s.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= (date_trunc('month', $2::date) + interval '1 month - 1 day')::date
       AND (s.cancelled_at IS NULL OR (s.cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= date_trunc('month', $2::date)::date)
     ORDER BY sv.name ASC`,
    [tid, bm]
  );
  return r.rows.map((row) => ({
    service_id: row.service_id,
    service_name: row.service_name,
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
};
