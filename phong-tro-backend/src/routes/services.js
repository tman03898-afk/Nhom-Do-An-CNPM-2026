const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function getPreviousUtilityValue(roomId, utilityType) {
  const prev = await pool.query(
    `SELECT current_value
     FROM utility_readings
     WHERE room_id = $1 AND utility_type = $2
     ORDER BY recorded_at DESC, reading_id DESC
     LIMIT 1`,
    [roomId, String(utilityType)]
  );
  return prev.rowCount ? Number(prev.rows[0].current_value || 0) : 0;
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
}) {
  const existing = await pool.query(
    `SELECT invoice_id, status
     FROM invoices
     WHERE tenant_id = $1 AND billing_month = $2
     LIMIT 1`,
    [tenant_id, billing_month]
  );

  const electricity = Number(electricity_amount || 0);
  const water = Number(water_amount || 0);
  const rent = Number(rent_amount || 0);
  const otherFees = Number(other_fees_amount || 0);
  const total = rent + electricity + water + otherFees;

  if (existing.rowCount) {
    // Keep PAID if already paid; otherwise stay UNPAID.
    const currentStatus = String(existing.rows[0].status || '');
    const nextStatus = currentStatus === 'PAID' ? 'PAID' : currentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID';

    await pool.query(
      `UPDATE invoices
       SET rent_amount = $1,
           electricity_amount = $2,
           water_amount = $3,
           other_fees_amount = $4,
           total_amount = $5,
           due_date = $6,
           status = $7
       WHERE invoice_id = $8`,
      [rent, electricity, water, otherFees, total, due_date, nextStatus, existing.rows[0].invoice_id]
    );
  } else {
    await pool.query(
      `INSERT INTO invoices
        (contract_id, tenant_id, billing_month, due_date, rent_amount, electricity_amount, water_amount, other_fees_amount, total_amount, status, created_by)
       VALUES
        ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, 'UNPAID', $10)`,
      [contract_id, tenant_id, billing_month, due_date, rent, electricity, water, otherFees, total, created_by]
    );
  }
}

router.get('/admin/services', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureServicesTable();
    const result = await pool.query(
      `SELECT service_id, name, unit, price, is_active, created_at, updated_at
       FROM services
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
    const { name, unit, price, is_active } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO services (name, unit, price, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING service_id, name, unit, price, is_active, created_at, updated_at`,
      [String(name).trim(), unit ? String(unit) : null, Number(price || 0), is_active !== undefined ? Boolean(is_active) : true]
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

    const allowed = ['name', 'unit', 'price', 'is_active'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      values.push(value);
      return `${key} = $${idx + 1}`;
    });
    values.push(id);

    const result = await pool.query(
      `UPDATE services
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE service_id = $${values.length}
       RETURNING service_id, name, unit, price, is_active, created_at, updated_at`,
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

      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

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

    const now = new Date();
    const billingMonthDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString().slice(0, 10);

    // Save reading + calculate consumption from previous reading.
    const prevEle = await getPreviousUtilityValue(roomId, 'ELECTRIC');
    const prevWat = await getPreviousUtilityValue(roomId, 'WATER');
    const eleDelta = Math.max(eleCur - prevEle, 0);
    const watDelta = Math.max(watCur - prevWat, 0);

    // Price per unit comes from `services` (admin config).
    const eleRateRes = await pool.query(
      `SELECT price
       FROM services
       WHERE is_active = true AND unit = 'kWh'
       ORDER BY service_id DESC
       LIMIT 1`
    );
    const waterRateRes = await pool.query(
      `SELECT price
       FROM services
       WHERE is_active = true AND (unit = 'm3' OR unit = 'm³')
       ORDER BY service_id DESC
       LIMIT 1`
    );
    const eleRate = eleRateRes.rowCount ? Number(eleRateRes.rows[0].price || 0) : 0;
    const waterRate = waterRateRes.rowCount ? Number(waterRateRes.rows[0].price || 0) : 0;

    const eleCost = eleDelta * eleRate;
    const watCost = watDelta * waterRate;

    await pool.query(
      `INSERT INTO utility_readings (room_id, recorded_by, utility_type, previous_value, current_value, recorded_at)
       VALUES ($1, $2, 'ELECTRIC', $3, $4, NOW())`,
      [roomId, req.auth.sub, prevEle, eleCur]
    );
    await pool.query(
      `INSERT INTO utility_readings (room_id, recorded_by, utility_type, previous_value, current_value, recorded_at)
       VALUES ($1, $2, 'WATER', $3, $4, NOW())`,
      [roomId, req.auth.sub, prevWat, watCur]
    );

    await upsertInvoiceFromUtility({
      tenant_id: tenantId,
      contract_id: contractId,
      rent_amount: rentAmount,
      electricity_amount: eleCost,
      water_amount: watCost,
      other_fees_amount: 0,
      billing_month: billingMonthDate,
      due_date: dueDate,
      created_by: req.auth.sub,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Confirm utility readings error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

