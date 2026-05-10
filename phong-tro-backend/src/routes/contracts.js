const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');

const router = express.Router();

async function ensureNotificationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      body TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const columnsResult = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notifications'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  if (!columns.has('body')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT`);
  }
  if (!columns.has('created_by')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  }
  if (!columns.has('updated_at')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }
  if (columns.has('message')) {
    await pool.query(`ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL`);
    await pool.query(`UPDATE notifications SET body = COALESCE(body, message) WHERE body IS NULL AND message IS NOT NULL`);
  }
  if (columns.has('type')) {
    await pool.query(`ALTER TABLE notifications ALTER COLUMN type DROP NOT NULL`);
  }

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
}

async function ensureContractsTable() {
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

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contracts_room_id ON contracts(room_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);

  // Backward-compatible migration: older databases may still use monthly_rent.
  const columnsResult = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'contracts'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  if (!columns.has('rent_price')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS rent_price NUMERIC NOT NULL DEFAULT 0`);
  }

  if (!columns.has('monthly_rent')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC`);
  }

  if (!columns.has('notes')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT`);
  }

  if (!columns.has('created_by')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  }

  if (!columns.has('created_at')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }

  if (!columns.has('updated_at')) {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }

  // Older databases may have a broken FK from contracts.tenant_id -> users(user_id).
  // Repair it so contract creation uses tenants(tenant_id) consistently.
  const tenantFkResult = await pool.query(`
    SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'contracts'::regclass
      AND conname = 'contracts_tenant_id_fkey'
  `);
  const tenantFkDefinition = String(tenantFkResult.rows[0]?.definition || '');
  if (!tenantFkDefinition.includes('REFERENCES tenants(tenant_id)')) {
    await pool.query(`ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey`);
    await pool.query(`
      ALTER TABLE contracts
      ADD CONSTRAINT contracts_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
    `);
  }

  if (columns.has('monthly_rent')) {
    await pool.query(
      `UPDATE contracts
       SET rent_price = COALESCE(rent_price, monthly_rent, 0)
       WHERE rent_price IS NULL OR rent_price = 0`
    );
  }

  // Data consistency: remove orphan contracts that don't map to a valid tenant or room.
  // This prevents "contracts with no tenant" appearing in admin UI.
  await pool.query(`
    DELETE FROM contracts
    WHERE tenant_id IS NULL
       OR tenant_id NOT IN (SELECT tenant_id FROM tenants)
       AND NOT EXISTS (
         SELECT 1 FROM invoices i
         WHERE i.contract_id = contracts.contract_id
       )
  `);

  await pool.query(`
    DELETE FROM contracts
    WHERE room_id IS NULL
       OR room_id NOT IN (SELECT room_id FROM rooms)
       AND NOT EXISTS (
         SELECT 1 FROM invoices i
         WHERE i.contract_id = contracts.contract_id
       )
  `);
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

router.get('/admin/contracts', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureContractsTable();

    const result = await pool.query(
      `SELECT
         c.contract_id,
         c.start_date,
         c.end_date,
         COALESCE(c.rent_price, c.monthly_rent) AS rent_price,
         c.deposit,
         c.status,
         c.notes,
         c.created_at,
         c.updated_at,
         t.tenant_id,
         u.user_id,
         u.full_name,
         u.email,
         r.room_id,
         r.room_number
       FROM contracts c
       JOIN tenants t ON t.tenant_id = c.tenant_id
       JOIN users u ON u.user_id = t.user_id
       JOIN rooms r ON r.room_id = c.room_id
       ORDER BY c.contract_id DESC`
    );

    return res.json({ ok: true, contracts: result.rows });
  } catch (err) {
    console.error('List contracts error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/contracts', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('ADMIN create contract called');
    console.log('Payload:', req.body);
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureContractsTable();
    await ensureNotificationsTable();

    let { tenant_id, user_id, room_id, room_number, start_date, end_date, rent_price, deposit, notes } = req.body || {};
    const start = normalizeDate(start_date);
    const end = normalizeDate(end_date);
    const normalizedRoomNumber = String(room_number || '').trim();

    // Accept either `tenant_id` (tenant PK) or `user_id` (users.user_id from frontend)
    if (!tenant_id && user_id) {
      const tRes = await client.query(`SELECT tenant_id FROM tenants WHERE user_id = $1 LIMIT 1`, [Number(user_id)]);
      if (tRes.rowCount > 0) {
        tenant_id = tRes.rows[0].tenant_id;
      }
    }

    if (!room_id && normalizedRoomNumber) {
      const roomRes = await client.query(
        `SELECT room_id FROM rooms WHERE room_number = $1 LIMIT 1`,
        [normalizedRoomNumber]
      );
      if (roomRes.rowCount > 0) {
        room_id = roomRes.rows[0].room_id;
      }
    }

    console.log('Resolved tenant_id:', tenant_id, 'from user_id:', user_id);
    console.log('Resolved room_id:', room_id, 'from room_number:', normalizedRoomNumber || null);

    if (!tenant_id || !room_id || !start || !end) {
      return res.status(400).json({ ok: false, message: 'tenant_id (or user_id), room_id (or room_number), start_date, end_date are required' });
    }

    await client.query('BEGIN');

    // Prevent creating orphan contracts (tenant_id/room_id must exist).
    let tenantExists = await client.query(`SELECT tenant_id, user_id, room_id FROM tenants WHERE tenant_id = $1`, [Number(tenant_id)]);

    // Some frontend flows may send users.user_id in tenant_id.
    if (tenantExists.rowCount === 0) {
      const tryUser = await client.query(
        `SELECT tenant_id, user_id, room_id FROM tenants WHERE user_id = $1 LIMIT 1`,
        [Number(tenant_id)]
      );
      if (tryUser.rowCount > 0) {
        tenant_id = tryUser.rows[0].tenant_id;
        tenantExists = tryUser;
        console.log('Interpreted tenant_id as user_id and resolved tenant_id:', tenant_id);
      }
    }

    const roomExists = await client.query(`SELECT room_id, price FROM rooms WHERE room_id = $1`, [Number(room_id)]);
    console.log('tenantExists.rowCount=', tenantExists.rowCount, 'roomExists.rowCount=', roomExists.rowCount);
    if (tenantExists.rowCount === 0 || roomExists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'tenant_id and room_id must exist' });
    }

    // Keep tenant-room mapping consistent: contract's room must match tenant.room_id when tenant already assigned.
    const tenantRow = tenantExists.rows[0] || null;
    const tenantRoomId = tenantRow ? tenantRow.room_id : null;
    if (tenantRoomId !== null && Number(tenantRoomId) !== Number(room_id)) {
      // Admin route: allow reassigning tenant to the requested room instead of rejecting.
      await client.query(`UPDATE tenants SET room_id = $1, updated_at = NOW() WHERE tenant_id = $2`, [Number(room_id), Number(tenant_id)]);
    } else if (tenantRoomId === null) {
      await client.query(`UPDATE tenants SET room_id = $1, updated_at = NOW() WHERE tenant_id = $2`, [Number(room_id), Number(tenant_id)]);
    }

    // Prevent multiple ACTIVE contracts for same room.
    const activeRoom = await client.query(
      `SELECT 1 FROM contracts WHERE room_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [Number(room_id)]
    );
    if (activeRoom.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'room already has an active contract' });
    }

    // Default rent/deposit from room price when admin leaves them empty.
    const roomRow = roomExists.rows[0] || null;
    const roomPrice = Number(roomRow?.price || 0);
    const rentVal = Number(rent_price || roomPrice || 0);
    const depositVal = Number(deposit || rentVal || roomPrice || 0);
    if (!(rentVal > 0) || !(depositVal > 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'rent_price and deposit must be greater than 0' });
    }

    // Some databases have legacy `monthly_rent` NOT NULL; set it to same value as rent_price to be safe.
    const insertValues = [
      Number(tenant_id),
      Number(room_id),
      start,
      end,
      rentVal,
      rentVal,
      depositVal,
      notes ? String(notes) : null,
      req.auth?.sub || null,
    ];
    console.log('About to insert contract with values (tenant,room,start,end,rent,monthly_rent,deposit,notes,created_by):', insertValues);
    const contractResult = await client.query(
      `INSERT INTO contracts (tenant_id, room_id, start_date, end_date, rent_price, monthly_rent, deposit, status, notes, created_by)
       VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, 'ACTIVE', $8, $9)
       RETURNING contract_id, tenant_id, room_id, start_date, end_date, rent_price, deposit, status, notes, created_at, updated_at`,
      insertValues
    );
    const contract = contractResult.rows[0];

    // Create a notification for the tenant and a confirmation for the admin.
    const tenantUserId = tenantRow ? tenantRow.user_id : null;
    const titleForTenant = 'Hợp đồng mới';
    const bodyForTenant = `Hợp đồng #${contract.contract_id} cho phòng ${contract.room_id} đã được tạo. Bắt đầu: ${contract.start_date}, kết thúc: ${contract.end_date}.`;

    if (tenantUserId) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by) VALUES ($1, $2, $3, $4)`,
        [Number(tenantUserId), titleForTenant, bodyForTenant, req.auth?.sub || null]
      );
    }

    if (req.auth && req.auth.sub) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by) VALUES ($1, $2, $3, $4)`,
        [Number(req.auth.sub), 'Hợp đồng đã tạo', `Bạn đã tạo hợp đồng #${contract.contract_id} cho phòng ${contract.room_id}.`, Number(req.auth.sub)]
      );
    }

    await client.query(
      `UPDATE rooms SET status = 'RENTED'::room_status, updated_at = NOW() WHERE room_id = $1`,
      [Number(room_id)]
    );

    await client.query('COMMIT');

    return res.status(201).json({ ok: true, contract });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Create contract error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

router.put('/admin/contracts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureContractsTable();

    const contractId = Number(req.params.id);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid contract id' });
    }

    const allowed = ['start_date', 'end_date', 'rent_price', 'deposit', 'status', 'notes'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));

    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'start_date' || key === 'end_date') {
        const d = normalizeDate(value);
        values.push(d);
        return `${key} = $${idx + 1}::date`;
      }
      if (key === 'status') {
        values.push(String(value));
        return `${key} = $${idx + 1}::contract_status`;
      }
      values.push(value);
      return `${key} = $${idx + 1}`;
    });

    values.push(contractId);

    const result = await pool.query(
      `UPDATE contracts
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE contract_id = $${values.length}
       RETURNING contract_id, tenant_id, room_id, start_date, end_date, rent_price, deposit, status, notes, created_at, updated_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'contract not found' });
    }

    return res.json({ ok: true, contract: result.rows[0] });
  } catch (err) {
    console.error('Update contract error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/contract', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureContractsTable();

    const result = await pool.query(
      `SELECT
         c.contract_id,
         c.start_date,
         c.end_date,
         COALESCE(c.rent_price, c.monthly_rent) AS rent_price,
         c.deposit,
         c.status,
         c.notes,
         c.created_at,
         c.updated_at,
         r.room_id,
         r.room_number
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN contracts c ON c.tenant_id = t.tenant_id AND c.status = 'ACTIVE'
       LEFT JOIN rooms r ON r.room_id = c.room_id
       WHERE u.user_id = $1
       ORDER BY c.contract_id DESC
       LIMIT 1`,
      [req.auth.sub]
    );

    if (result.rowCount === 0 || !result.rows[0].contract_id) {
      return res.json({ ok: true, contract: null });
    }

    return res.json({ ok: true, contract: result.rows[0] });
  } catch (err) {
    console.error('Tenant contract error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
