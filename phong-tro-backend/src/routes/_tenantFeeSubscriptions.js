const pool = require('../config/db');
const { formatCalendarDateString } = require('./_dbHelpers');

async function hasPublicTable(tableName) {
  const r = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS ex`,
    [tableName]
  );
  return r.rows[0]?.ex === true;
}

/** Không cho đăng ký & ẩn khỏi luồng tiện ích (vẫn có thể giữ trong DB). */
const EXCLUDED_FEE_NAMES_EXACT = ['Bảo vệ', 'Thang máy'];

function isFeeSubscribableRow(row) {
  if (!row) return false;
  if (String(row.fee_type || '').toUpperCase() !== 'FIXED') return false;
  const name = String(row.fee_name || '').trim();
  if (!name) return false;
  if (EXCLUDED_FEE_NAMES_EXACT.includes(name)) return false;
  return true;
}

async function ensureTenantFeeSubscriptionsTable() {
  if (!(await hasPublicTable('service_fees'))) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_fee_subscriptions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      fee_id INTEGER NOT NULL REFERENCES service_fees(fee_id) ON DELETE CASCADE,
      monthly_price NUMERIC NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      effective_from DATE,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      rejected_at TIMESTAMPTZ,
      reject_reason TEXT,
      CONSTRAINT chk_tfs_status CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED'))
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tfs_one_pending
    ON tenant_fee_subscriptions (tenant_id, fee_id)
    WHERE status = 'PENDING'
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tfs_one_active
    ON tenant_fee_subscriptions (tenant_id, fee_id)
    WHERE status = 'ACTIVE'
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tfs_tenant ON tenant_fee_subscriptions(tenant_id)`);

  await pool.query(
    `UPDATE service_fees SET is_active = false
     WHERE TRIM(fee_name) IN ('Bảo vệ', 'Thang máy')`
  );
}

function firstDayOfNextMonthYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  let ny = y;
  let nm = m + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  return formatCalendarDateString(ny, nm, 1);
}

/** Kỳ hóa đơn đang mở: phí tiện ích duyệt trong tháng sẽ được cộng ngay vào hóa đơn tháng đó. */
function firstDayOfCurrentMonthYmd() {
  const d = new Date();
  return formatCalendarDateString(d.getFullYear(), d.getMonth() + 1, 1);
}

/**
 * Phí tiện ích (service_fees) đã duyệt, áp dụng cho kỳ billing_month.
 */
async function sumActiveFeeSubscriptionFeesForTenant(tenantId, billingMonthDate) {
  const tid = Number(tenantId);
  if (!Number.isInteger(tid) || tid <= 0) return 0;
  const bm = billingMonthDate ? String(billingMonthDate).slice(0, 10) : null;
  if (!bm || !(await hasPublicTable('tenant_fee_subscriptions'))) return 0;

  const r = await pool.query(
    `SELECT COALESCE(SUM(tfs.monthly_price), 0)::numeric AS s
     FROM tenant_fee_subscriptions tfs
     WHERE tfs.tenant_id = $1
       AND tfs.status = 'ACTIVE'
       AND tfs.effective_from IS NOT NULL
       AND date_trunc('month', tfs.effective_from)::date <= date_trunc('month', $2::date)::date
       AND (tfs.cancelled_at IS NULL OR (tfs.cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= date_trunc('month', $2::date)::date)`,
    [tid, bm]
  );
  return Number(r.rows[0]?.s || 0);
}

async function listActiveFeeSubscriptionLinesForTenant(tenantId, billingMonthDate) {
  const tid = Number(tenantId);
  if (!Number.isInteger(tid) || tid <= 0) return [];
  const bm = billingMonthDate ? String(billingMonthDate).slice(0, 10) : null;
  if (!bm || !(await hasPublicTable('tenant_fee_subscriptions'))) return [];

  const r = await pool.query(
    `SELECT tfs.fee_id, tfs.monthly_price, sf.fee_name AS service_name
     FROM tenant_fee_subscriptions tfs
     JOIN service_fees sf ON sf.fee_id = tfs.fee_id
     WHERE tfs.tenant_id = $1
       AND tfs.status = 'ACTIVE'
       AND tfs.effective_from IS NOT NULL
       AND date_trunc('month', tfs.effective_from)::date <= date_trunc('month', $2::date)::date
       AND (tfs.cancelled_at IS NULL OR (tfs.cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= date_trunc('month', $2::date)::date)
     ORDER BY sf.fee_name ASC`,
    [tid, bm]
  );
  return r.rows.map((row) => ({
    source: 'fee',
    fee_id: row.fee_id,
    service_id: null,
    service_name: row.service_name,
    monthly_price: Number(row.monthly_price || 0),
  }));
}

module.exports = {
  ensureTenantFeeSubscriptionsTable,
  hasPublicTable,
  isFeeSubscribableRow,
  EXCLUDED_FEE_NAMES_EXACT,
  firstDayOfNextMonthYmd,
  firstDayOfCurrentMonthYmd,
  sumActiveFeeSubscriptionFeesForTenant,
  listActiveFeeSubscriptionLinesForTenant,
};
