const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable, ensureTenantsTable, formatCalendarDateString } = require('./_dbHelpers');
const {
  sumAllRecurringExtrasForTenant,
  ensureTenantServiceSubscriptionsTable,
  syncUnpaidInvoicesOtherFeesForTenant,
  isMeterUnit,
} = require('./_subscriptionFees');
const { ensureInvoicesTable } = require('./invoices');
const {
  getElectricityTiers,
  useTieredFromEnv,
  computeElectricityCostTiered,
  tiersAreValid,
} = require('../utils/electricityTierPricing');
const {
  getWaterTiers,
  useWaterTieredFromEnv,
  computeWaterCostTiered,
  tiersAreValid: waterTiersAreValid,
} = require('../utils/waterTierPricing');

const router = express.Router();

async function ensureServicesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      service_id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      unit VARCHAR(40),
      price NUMERIC NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS allow_tenant_subscription BOOLEAN NOT NULL DEFAULT TRUE`
  );
  await pool.query(`
    UPDATE services
    SET allow_tenant_subscription = false
    WHERE LOWER(TRIM(COALESCE(unit, ''))) IN ('kwh', 'm3', 'm³')
  `);
}

async function ensureUtilityReadingsTable() {
  await ensureEnumType('utility_type', ['ELECTRIC', 'WATER']);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS utility_readings (
      reading_id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
      recorded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      utility_type utility_type NOT NULL,
      previous_value NUMERIC NOT NULL DEFAULT 0,
      current_value NUMERIC NOT NULL DEFAULT 0,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_utility_readings_room_id ON utility_readings(room_id)`);

  const { rows: colRows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'utility_readings'`
  );
  const cols = new Set(colRows.map((r) => r.column_name));

  // DB cũ (seed / constraint_db): một dòng gồm contract_id, billing_month, electricity_*, water_* — không có utility_type.
  // INSERT mới cần utility_type + previous/current; nới NOT NULL các cột legacy để tránh 500.
  const isLegacyWide = cols.has('electricity_new') || cols.has('electricity_old');
  if (isLegacyWide) {
    if (!cols.has('utility_type')) {
      await pool.query(`ALTER TABLE utility_readings ADD COLUMN utility_type utility_type`);
    }
    await pool.query(`ALTER TABLE utility_readings ADD COLUMN IF NOT EXISTS previous_value NUMERIC NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE utility_readings ADD COLUMN IF NOT EXISTS current_value NUMERIC NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE utility_readings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await pool.query(`ALTER TABLE utility_readings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    const dropNN = async (name) => {
      if (!cols.has(name)) return;
      try {
        await pool.query(`ALTER TABLE utility_readings ALTER COLUMN ${name} DROP NOT NULL`);
      } catch (e) {
        /* already nullable or permission */
      }
    };
    await dropNN('contract_id');
    await dropNN('billing_month');
    await dropNN('electricity_old');
    await dropNN('electricity_new');
    await dropNN('water_old');
    await dropNN('water_new');
  }
}

async function ensureContractsTableForUtilities() {
  await ensureEnumType('contract_status', ['ACTIVE', 'EXPIRED', 'TERMINATED']);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      contract_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      rent_price NUMERIC NOT NULL DEFAULT 0,
      deposit NUMERIC NOT NULL DEFAULT 0,
      status contract_status NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Defensive: add missing columns if DB was created with older scripts.
  const columnsResult = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'contracts'`
  );
  const columns = new Set(columnsResult.rows.map((r) => r.column_name));

  if (!columns.has('monthly_rent')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC`);
  }
  if (!columns.has('rent_price')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS rent_price NUMERIC NOT NULL DEFAULT 0`);
  }
  if (!columns.has('notes')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT`);
  }
  if (!columns.has('created_at')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }
  if (!columns.has('updated_at')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }

  // Backfill rent_price if monthly_rent exists.
  if (columns.has('monthly_rent')) {
    await pool.query(`
      UPDATE contracts
      SET rent_price = COALESCE(rent_price, monthly_rent, 0)
      WHERE rent_price IS NULL OR rent_price = 0
    `);
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return formatCalendarDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

async function getPreviousUtilityValue(roomId, utilityType) {
  const ut = String(utilityType).toUpperCase();
  const prev = await pool.query(
    `SELECT current_value
     FROM utility_readings
     WHERE room_id = $1 AND utility_type = $2::utility_type
     ORDER BY recorded_at DESC NULLS LAST, reading_id DESC
     LIMIT 1`,
    [roomId, ut]
  );
  if (prev.rowCount) return Number(prev.rows[0].current_value || 0);

  /**
   * Nếu phòng đã có chỉ số kiểu mới (ELECTRIC/WATER) cho **bất kỳ** loại nào mà loại hiện tại
   * **chưa** có bản ghi typed → không đọc dòng legacy (utility_type IS NULL).
   * Tránh lệch cơ sở: ví dụ điện đã có bản ghi 50, nước fallback legacy = 0 → nhập 50/50
   * thành tiền điện 0 nhưng nước tính cả 50 khối.
   */
  const typedAny = await pool.query(
    `SELECT 1
     FROM utility_readings
     WHERE room_id = $1 AND utility_type IS NOT NULL
     LIMIT 1`,
    [roomId]
  );
  if (typedAny.rowCount) {
    return 0;
  }

  if (!(await columnExists('utility_readings', 'electricity_new'))) {
    return 0;
  }

  const leg = await pool.query(
    `SELECT electricity_new, water_new
     FROM utility_readings
     WHERE room_id = $1 AND utility_type IS NULL
     ORDER BY recorded_at DESC NULLS LAST, reading_id DESC
     LIMIT 1`,
    [roomId]
  );
  if (!leg.rowCount) return 0;
  const r = leg.rows[0];
  const raw = ut === 'WATER' ? r.water_new : r.electricity_new;
  return Number(raw || 0);
}

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

/**
 * Đơn giá điện (VNĐ/kWh) và nước (VNĐ/m³): ưu tiên giá theo hợp đồng (contract_service_fees),
 * sau đó bảng services (đơn vị kWh / m3), cuối cùng catalog service_fees (seed cũ).
 */
async function resolveUtilityRatesForContract(contractId) {
  await ensureServicesTable();

  let eleRate = 0;
  let waterRate = 0;

  const hasSf = await hasPublicTable('service_fees');
  const hasCsf = await hasPublicTable('contract_service_fees');

  const cid = Number(contractId);
  if (Number.isInteger(cid) && cid > 0 && hasCsf && hasSf) {
    const eRow = await pool.query(
      `SELECT COALESCE(csf.agreed_price, sf.unit_price, 0)::numeric AS p
       FROM contract_service_fees csf
       JOIN service_fees sf ON sf.fee_id = csf.fee_id
       WHERE csf.contract_id = $1
         AND (TRIM(sf.fee_name) = 'Điện' OR LOWER(TRIM(sf.fee_name)) IN ('điện', 'dien'))
       ORDER BY csf.id DESC
       LIMIT 1`,
      [cid]
    );
    if (eRow.rowCount) eleRate = Number(eRow.rows[0].p || 0);

    const wRow = await pool.query(
      `SELECT COALESCE(csf.agreed_price, sf.unit_price, 0)::numeric AS p
       FROM contract_service_fees csf
       JOIN service_fees sf ON sf.fee_id = csf.fee_id
       WHERE csf.contract_id = $1
         AND (TRIM(sf.fee_name) = 'Nước' OR LOWER(TRIM(sf.fee_name)) IN ('nước', 'nuoc'))
       ORDER BY csf.id DESC
       LIMIT 1`,
      [cid]
    );
    if (wRow.rowCount) waterRate = Number(wRow.rows[0].p || 0);
  }

  if (eleRate <= 0) {
    const eleRes = await pool.query(
      `SELECT price::numeric AS price
       FROM services
       WHERE COALESCE(is_active, true) = true
         AND LOWER(TRIM(COALESCE(unit, ''))) = 'kwh'
       ORDER BY service_id DESC
       LIMIT 1`
    );
    if (eleRes.rowCount) eleRate = Number(eleRes.rows[0].price || 0);
  }

  if (waterRate <= 0) {
    const watRes = await pool.query(
      `SELECT price::numeric AS price
       FROM services
       WHERE COALESCE(is_active, true) = true
         AND (
           LOWER(TRIM(COALESCE(unit, ''))) IN ('m3', 'm³')
           OR LOWER(REPLACE(REPLACE(TRIM(COALESCE(unit, '')), '³', '3'), ' ', '')) = 'm3'
         )
       ORDER BY service_id DESC
       LIMIT 1`
    );
    if (watRes.rowCount) waterRate = Number(watRes.rows[0].price || 0);
  }

  if (eleRate <= 0 && hasSf) {
    const r = await pool.query(
      `SELECT COALESCE(unit_price, 0)::numeric AS p
       FROM service_fees
       WHERE COALESCE(is_active, true) = true
         AND (TRIM(fee_name) = 'Điện' OR LOWER(TRIM(fee_name)) IN ('điện', 'dien'))
       ORDER BY fee_id DESC
       LIMIT 1`
    );
    if (r.rowCount) eleRate = Number(r.rows[0].p || 0);
  }

  if (waterRate <= 0 && hasSf) {
    const r = await pool.query(
      `SELECT COALESCE(unit_price, 0)::numeric AS p
       FROM service_fees
       WHERE COALESCE(is_active, true) = true
         AND (TRIM(fee_name) = 'Nước' OR LOWER(TRIM(fee_name)) IN ('nước', 'nuoc'))
       ORDER BY fee_id DESC
       LIMIT 1`
    );
    if (r.rowCount) waterRate = Number(r.rows[0].p || 0);
  }

  return { eleRate, waterRate };
}

async function columnExists(table, column) {
  const r = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return r.rowCount > 0;
}

function parseBillingMonthOverride(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const first = formatCalendarDateString(y, m, 1);
  const due = formatCalendarDateString(y, m, 5);
  if (!first || !due) return null;
  return { billing_month: first, due_date: due };
}

/**
 * Ghi chỉ số vào đúng kỳ hóa đơn đang mở (ưu tiên hóa đơn chưa PAID cũ nhất),
 * tránh lệch tháng khi server đã sang tháng mới nhưng kỳ tháng trước vẫn còn nợ.
 */
async function resolveBillingMonthForUtilityConfirm(tenantId, body) {
  const fromBody = parseBillingMonthOverride(body?.billing_month);
  if (fromBody) return fromBody;

  const r = await pool.query(
    `SELECT billing_month::text AS bm
     FROM invoices
     WHERE tenant_id = $1
       AND UPPER(TRIM(status::text)) NOT IN ('PAID')
     ORDER BY billing_month ASC
     LIMIT 1`,
    [tenantId]
  );

  const now = new Date();
  if (r.rowCount > 0 && r.rows[0].bm) {
    const bm = String(r.rows[0].bm).slice(0, 10);
    const y = Number(bm.slice(0, 4));
    const m = Number(bm.slice(5, 7));
    return {
      billing_month: formatCalendarDateString(y, m, 1),
      due_date: formatCalendarDateString(y, m, 5),
    };
  }

  return {
    billing_month: formatCalendarDateString(now.getFullYear(), now.getMonth() + 1, 1),
    due_date: formatCalendarDateString(now.getFullYear(), now.getMonth() + 1, 5),
  };
}

async function upsertInvoiceFromUtility({
  tenant_id,
  contract_id,
  rent_amount,
  electricity_amount,
  water_amount,
  other_fees_amount = 0,
  billing_month,
  due_date,
  created_by,
  /** { mode: 'tiered', delta_kwh, tiers: [...] } hoặc null */
  electricity_breakdown = null,
  /** { mode: 'tiered', delta_m3, tiers: [...] } hoặc null */
  water_breakdown = null,
  /** { electricity_previous_kwh, electricity_current_kwh, ... } */
  utility_meter_snapshot = null,
  /** Dùng cùng client trong transaction (INSERT chỉ số + cập nhật hóa đơn). */
  exec = null,
}) {
  await ensureInvoicesTable();
  await ensureTenantServiceSubscriptionsTable();
  const subscriptionFees = await sumAllRecurringExtrasForTenant(tenant_id, billing_month);
  const manualOther = Number(other_fees_amount || 0);
  const otherFees = manualOther + subscriptionFees;

  const run = exec || ((text, params) => pool.query(text, params));

  const existing = await run(
    `SELECT invoice_id, status
     FROM invoices
     WHERE tenant_id = $1 AND billing_month = $2
     LIMIT 1`,
    [tenant_id, billing_month]
  );

  const electricity = Number(electricity_amount || 0);
  const water = Number(water_amount || 0);
  const rent = Number(rent_amount || 0);
  const total = rent + electricity + water + otherFees;

  const ebJson =
    electricity_breakdown &&
    typeof electricity_breakdown === 'object' &&
    electricity_breakdown.mode === 'tiered' &&
    Array.isArray(electricity_breakdown.tiers)
      ? electricity_breakdown
      : null;

  const wbJson =
    water_breakdown &&
    typeof water_breakdown === 'object' &&
    water_breakdown.mode === 'tiered' &&
    Array.isArray(water_breakdown.tiers)
      ? water_breakdown
      : null;

  const snapJson =
    utility_meter_snapshot && typeof utility_meter_snapshot === 'object'
      ? JSON.stringify(utility_meter_snapshot)
      : null;

  if (existing.rowCount) {
    // Keep PAID if already paid; otherwise stay UNPAID.
    const currentStatus = String(existing.rows[0].status || '');
    const nextStatus = currentStatus === 'PAID' ? 'PAID' : currentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID';

    await run(
      `UPDATE invoices
       SET contract_id = $1,
           rent_amount = $2,
           electricity_amount = $3,
           electricity_breakdown = $4::jsonb,
           utility_meter_snapshot = $5::jsonb,
           water_amount = $6,
           water_breakdown = $7::jsonb,
           other_fees_amount = $8,
           total_amount = $9,
           due_date = $10,
           status = $11,
           updated_at = NOW()
       WHERE invoice_id = $12`,
      [
        contract_id,
        rent,
        electricity,
        ebJson ? JSON.stringify(ebJson) : null,
        snapJson,
        water,
        wbJson ? JSON.stringify(wbJson) : null,
        otherFees,
        total,
        due_date,
        nextStatus,
        existing.rows[0].invoice_id,
      ]
    );
  } else {
    await run(
      `INSERT INTO invoices
        (contract_id, tenant_id, billing_month, due_date, rent_amount, electricity_amount, electricity_breakdown, utility_meter_snapshot, water_amount, water_breakdown, other_fees_amount, total_amount, status, created_by)
       VALUES
        ($1, $2, $3::date, $4::date, $5, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11, $12, 'UNPAID', $13)`,
      [
        contract_id,
        tenant_id,
        billing_month,
        due_date,
        rent,
        electricity,
        ebJson ? JSON.stringify(ebJson) : null,
        snapJson,
        water,
        wbJson ? JSON.stringify(wbJson) : null,
        otherFees,
        total,
        created_by,
      ]
    );
  }
}

router.get('/admin/services', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureServicesTable();
    const result = await pool.query(
      `SELECT service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at
       FROM services
       WHERE COALESCE(is_active, true) = true
       ORDER BY service_id DESC`
    );
    return res.json({ ok: true, services: result.rows });
  } catch (err) {
    console.error('List services error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/services', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureServicesTable();
    const { name, unit, price, is_active, allow_tenant_subscription } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: 'name is required' });
    }
    const unitStr = unit ? String(unit).trim() : '';
    if (isMeterUnit(unitStr)) {
      return res.status(400).json({
        ok: false,
        message: 'Điện/nước không cấu hình ở Dịch vụ. Dùng nhập chỉ số trên trang Hóa đơn.',
      });
    }
    const allowSub =
      allow_tenant_subscription !== undefined ? Boolean(allow_tenant_subscription) : true;
    const result = await pool.query(
      `INSERT INTO services (name, unit, price, is_active, allow_tenant_subscription)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at`,
      [String(name).trim(), unitStr || null, Number(price || 0), is_active !== undefined ? Boolean(is_active) : true, allowSub]
    );
    return res.status(201).json({ ok: true, service: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'service name already exists' });
    }
    console.error('Create service error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.put('/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureServicesTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid service id' });
    }

    const allowed = ['name', 'unit', 'price', 'is_active', 'allow_tenant_subscription'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const unitEntry = entries.find(([k]) => k === 'unit');
    if (unitEntry && isMeterUnit(unitEntry[1])) {
      return res.status(400).json({
        ok: false,
        message: 'Điện/nước không cấu hình ở Dịch vụ. Dùng nhập chỉ số trên trang Hóa đơn.',
      });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      values.push(key === 'allow_tenant_subscription' ? Boolean(value) : value);
      return `${key} = $${idx + 1}`;
    });
    values.push(id);

    const result = await pool.query(
      `UPDATE services
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE service_id = $${values.length}
       RETURNING service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'service not found' });
    }
    return res.json({ ok: true, service: result.rows[0] });
  } catch (err) {
    console.error('Update service error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.delete('/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid service id' });
    }

    const svc = await pool.query(
      `SELECT service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at
       FROM services
       WHERE service_id = $1
       LIMIT 1`,
      [id]
    );
    if (svc.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'service not found' });
    }
    if (isMeterUnit(svc.rows[0].unit)) {
      return res.status(400).json({
        ok: false,
        message: 'Điện/nước không xóa ở Dịch vụ. Dùng trang Hóa đơn để quản lý chỉ số.',
      });
    }

    const refs = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM tenant_service_subscriptions
       WHERE service_id = $1`,
      [id]
    );
    const refCount = Number(refs.rows[0]?.count || 0);

    if (refCount > 0) {
      const affectedTenants = await pool.query(
        `SELECT DISTINCT tenant_id
         FROM tenant_service_subscriptions
         WHERE service_id = $1
           AND status IN ('PENDING', 'ACTIVE', 'PENDING_CANCEL')`,
        [id]
      );
      const cancelled = await pool.query(
        `UPDATE tenant_service_subscriptions
         SET status = 'CANCELLED',
             cancelled_at = COALESCE(cancelled_at, NOW()),
             updated_at = NOW()
         WHERE service_id = $1
           AND status IN ('PENDING', 'ACTIVE', 'PENDING_CANCEL')
         RETURNING subscription_id`,
        [id]
      );
      const result = await pool.query(
        `UPDATE services
         SET is_active = false,
             allow_tenant_subscription = false,
             updated_at = NOW()
         WHERE service_id = $1
         RETURNING service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at`,
        [id]
      );
      for (const row of affectedTenants.rows) {
        await syncUnpaidInvoicesOtherFeesForTenant(Number(row.tenant_id));
      }
      return res.json({
        ok: true,
        deleted: false,
        deactivated: true,
        cancelled_subscriptions: cancelled.rowCount,
        service: result.rows[0],
        message: 'service deactivated because it has subscription history',
      });
    }

    const result = await pool.query(
      `DELETE FROM services
       WHERE service_id = $1
       RETURNING service_id, name, unit, price, is_active, allow_tenant_subscription, created_at, updated_at`,
      [id]
    );
    return res.json({ ok: true, deleted: true, deactivated: false, service: result.rows[0] });
  } catch (err) {
    console.error('Delete service error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

function parseOptionalPreviousReading(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

/** Chỉ số đầu kỳ (mới − đầu kỳ = tiêu thụ) — dùng khi nhập chỉ số mới trên admin. */
router.get('/admin/utilities/readings/baseline', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureRoomsTable();
    await ensureUtilityReadingsTable();
    const roomId = Number(req.query.room_id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'room_id is required' });
    }
    const previous_electric = await getPreviousUtilityValue(roomId, 'ELECTRIC');
    const previous_water = await getPreviousUtilityValue(roomId, 'WATER');
    return res.json({
      ok: true,
      room_id: roomId,
      previous_electric,
      previous_water,
    });
  } catch (err) {
    console.error('Utility baseline error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/utilities/readings', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureUtilityReadingsTable();

    const result = await pool.query(
      `SELECT
         ur.reading_id,
         ur.room_id,
         r.room_number,
         ur.utility_type,
         ur.previous_value,
         ur.current_value,
         ur.recorded_at,
         ur.created_at,
         ur.updated_at
       FROM utility_readings ur
       JOIN rooms r ON r.room_id = ur.room_id
       ORDER BY ur.reading_id DESC`
    );
    return res.json({ ok: true, readings: result.rows });
  } catch (err) {
    console.error('List utility readings error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/utilities/readings', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureUtilityReadingsTable();

    const { room_id, utility_type, previous_value, current_value, recorded_at } = req.body || {};
    const roomId = Number(room_id);
    if (!Number.isInteger(roomId) || roomId <= 0 || !utility_type) {
      return res.status(400).json({ ok: false, message: 'room_id and utility_type are required' });
    }

    const result = await pool.query(
      `INSERT INTO utility_readings (room_id, recorded_by, utility_type, previous_value, current_value, recorded_at)
       VALUES ($1, $2, $3::utility_type, $4, $5, COALESCE($6::timestamptz, NOW()))
       RETURNING reading_id, room_id, utility_type, previous_value, current_value, recorded_at, created_at, updated_at`,
      [
        roomId,
        req.auth.sub,
        String(utility_type),
        Number(previous_value || 0),
        Number(current_value || 0),
        recorded_at ? String(recorded_at) : null,
      ]
    );
    return res.status(201).json({ ok: true, reading: result.rows[0] });
  } catch (err) {
    console.error('Create utility reading error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

// Confirm utility readings and push them to the tenant's invoice for the same room/month.
// FE currently inputs: electricity_current (kWh) and water_current (m³).
router.post('/admin/utilities/readings/confirm', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureUtilityReadingsTable();
    await ensureContractsTableForUtilities();

    const { room_id, electricity_current, water_current } = req.body || {};
    const roomId = Number(room_id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'room_id is required' });
    }

    const eleCur = Number(electricity_current);
    const watCur = Number(water_current);
    if (Number.isNaN(eleCur) || Number.isNaN(watCur)) {
      return res.status(400).json({ ok: false, message: 'electricity_current and water_current must be numbers' });
    }

    // Tenant for a room (so "right room" -> "right tenant").
    const tenantRes = await pool.query(`SELECT tenant_id FROM tenants WHERE room_id = $1 LIMIT 1`, [roomId]);
    if (tenantRes.rowCount === 0) {
      return res.status(400).json({ ok: false, message: 'no tenant for this room' });
    }
    const tenantId = Number(tenantRes.rows[0].tenant_id);

    // Active contract first; fallback to any contract; if none, create one.
    let contractRes = await pool.query(
      `SELECT contract_id, COALESCE(rent_price, 0) AS rent_price
       FROM contracts
       WHERE tenant_id = $1 AND room_id = $2 AND status = 'ACTIVE'
       ORDER BY contract_id DESC
       LIMIT 1`,
      [tenantId, roomId]
    );

    if (contractRes.rowCount === 0) {
      contractRes = await pool.query(
        `SELECT contract_id, COALESCE(rent_price, 0) AS rent_price
         FROM contracts
         WHERE tenant_id = $1 AND room_id = $2
         ORDER BY contract_id DESC
         LIMIT 1`,
        [tenantId, roomId]
      );
    }

    let contractId = null;
    let rentAmount = 0;
    if (contractRes.rowCount > 0) {
      contractId = Number(contractRes.rows[0].contract_id);
      rentAmount = Number(contractRes.rows[0].rent_price || 0);
    } else {
      // Create a new contract automatically so utilities can always be confirmed.
      const roomPriceRes = await pool.query(`SELECT COALESCE(price, 0) AS price FROM rooms WHERE room_id = $1`, [roomId]);
      const rent_price = Number(roomPriceRes.rows[0]?.price || 0);
      const start = new Date();
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);

      const startDate = formatCalendarDateString(start.getFullYear(), start.getMonth() + 1, start.getDate());
      const endDate = formatCalendarDateString(end.getFullYear(), end.getMonth() + 1, end.getDate());

      const created = await pool.query(
        `INSERT INTO contracts
           (tenant_id, room_id, start_date, end_date, rent_price, deposit, status, notes, created_by)
         VALUES
           ($1, $2, $3::date, $4::date, $5, $6, 'ACTIVE', NULL, $7)
         RETURNING contract_id, rent_price`,
        [tenantId, roomId, startDate, endDate, rent_price, 0, req.auth.sub || null]
      );

      contractId = Number(created.rows[0].contract_id);
      rentAmount = Number(created.rows[0].rent_price || 0);

      // Mark room as rented (UI expects this mapping).
      await pool.query(
        `UPDATE rooms SET status = 'RENTED'::room_status, updated_at = NOW() WHERE room_id = $1`,
        [roomId]
      );
    }

    const { billing_month: billingMonthDate, due_date: dueDate } = await resolveBillingMonthForUtilityConfirm(
      tenantId,
      req.body || {}
    );

    // Save reading + calculate consumption from previous reading (có thể ghi đè tay khi dữ liệu cũ lệch).
    let prevEle = await getPreviousUtilityValue(roomId, 'ELECTRIC');
    let prevWat = await getPreviousUtilityValue(roomId, 'WATER');
    const oEl = parseOptionalPreviousReading(req.body?.electricity_previous);
    const oWt = parseOptionalPreviousReading(req.body?.water_previous);
    if (oEl !== null) prevEle = oEl;
    if (oWt !== null) prevWat = oWt;

    const eleDelta = Math.max(eleCur - prevEle, 0);
    const watDelta = Math.max(watCur - prevWat, 0);

    const { eleRate, waterRate } = await resolveUtilityRatesForContract(contractId);

    const eleTiers = getElectricityTiers();
    const useTieredElectric = useTieredFromEnv() && tiersAreValid(eleTiers);

    if (eleDelta > 0 && !useTieredElectric && eleRate <= 0) {
      return res.status(400).json({
        ok: false,
        message:
          'Chưa có đơn giá điện (VNĐ/kWh). Thêm trong Quản lý Dịch vụ (đơn vị kWh) hoặc cấu hình phí Điện trong hợp đồng / service_fees — hoặc bật tính theo bậc (ELECTRICITY_USE_TIERED=1, mặc định).',
      });
    }
    const watTiers = getWaterTiers();
    const useTieredWater = useWaterTieredFromEnv() && waterTiersAreValid(watTiers);

    if (watDelta > 0 && !useTieredWater && waterRate <= 0) {
      return res.status(400).json({
        ok: false,
        message:
          'Chưa có đơn giá nước (VNĐ/m³). Thêm trong Quản lý Dịch vụ (đơn vị m3 hoặc m³) hoặc cấu hình phí Nước trong hợp đồng / service_fees — hoặc bật tính theo bậc (WATER_USE_TIERED=1, mặc định).',
      });
    }

    let eleCost = 0;
    let electricity_tier_breakdown = null;
    let electricity_invoice_breakdown = null;
    if (useTieredElectric && eleDelta > 0) {
      const tiered = computeElectricityCostTiered(eleDelta, eleTiers);
      eleCost = tiered.total;
      electricity_tier_breakdown = tiered.breakdown;
      electricity_invoice_breakdown = {
        mode: 'tiered',
        delta_kwh: eleDelta,
        tiers: tiered.breakdown.map((row, idx) => ({
          bac: idx + 1,
          band_from_kwh: row.bandFrom,
          band_to_kwh: row.bandTo,
          kwh: row.kwh,
          price_per_kwh: row.pricePerKwh,
          amount: row.amount,
        })),
      };
    } else {
      eleCost = eleDelta * eleRate;
    }

    let watCost = 0;
    let water_tier_breakdown = null;
    let water_invoice_breakdown = null;
    if (useTieredWater && watDelta > 0) {
      const tiered = computeWaterCostTiered(watDelta, watTiers);
      watCost = tiered.total;
      water_tier_breakdown = tiered.breakdown;
      water_invoice_breakdown = {
        mode: 'tiered',
        delta_m3: watDelta,
        tiers: tiered.breakdown.map((row, idx) => ({
          bac: idx + 1,
          band_from_m3: row.bandFrom,
          band_to_m3: row.bandTo,
          m3: row.kwh,
          price_per_m3: row.pricePerKwh,
          amount: row.amount,
        })),
      };
    } else {
      watCost = watDelta * waterRate;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO utility_readings (room_id, recorded_by, utility_type, previous_value, current_value, recorded_at)
         VALUES ($1, $2, 'ELECTRIC', $3, $4, NOW())`,
        [roomId, req.auth.sub, prevEle, eleCur]
      );
      await client.query(
        `INSERT INTO utility_readings (room_id, recorded_by, utility_type, previous_value, current_value, recorded_at)
         VALUES ($1, $2, 'WATER', $3, $4, NOW())`,
        [roomId, req.auth.sub, prevWat, watCur]
      );
      await upsertInvoiceFromUtility({
        tenant_id: tenantId,
        contract_id: contractId,
        rent_amount: rentAmount,
        electricity_amount: eleCost,
        electricity_breakdown: electricity_invoice_breakdown,
        utility_meter_snapshot: {
          electricity_previous_kwh: prevEle,
          electricity_current_kwh: eleCur,
          electricity_delta_kwh: eleDelta,
          water_previous_m3: prevWat,
          water_current_m3: watCur,
          water_delta_m3: watDelta,
          electricity_pricing_mode: useTieredElectric ? 'tiered' : 'flat',
          water_pricing_mode: useTieredWater ? 'tiered' : 'flat',
        },
        water_amount: watCost,
        water_breakdown: water_invoice_breakdown,
        other_fees_amount: 0,
        billing_month: billingMonthDate,
        due_date: dueDate,
        created_by: req.auth.sub,
        exec: (text, params) => client.query(text, params),
      });
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {}
      throw e;
    } finally {
      client.release();
    }

    return res.json({
      ok: true,
      applied: {
        previous_electric: prevEle,
        previous_water: prevWat,
        current_electric: eleCur,
        current_water: watCur,
        delta_electric_kwh: eleDelta,
        delta_water_m3: watDelta,
        amount_electric: eleCost,
        amount_water: watCost,
        electricity_pricing_mode: useTieredElectric ? 'tiered' : 'flat',
        electricity_tier_breakdown,
        water_pricing_mode: useTieredWater ? 'tiered' : 'flat',
        water_tier_breakdown,
      },
    });
  } catch (err) {
    console.error('Confirm utility readings error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
module.exports.ensureServicesTable = ensureServicesTable;

