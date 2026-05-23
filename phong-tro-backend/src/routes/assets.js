const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureTenantsTable } = require('./_dbHelpers');
const { ensureEnumType, ensureRoomsTable } = require('./_dbHelpers');
const { once } = require('./_schemaCache');

const router = express.Router();

async function ensureAssetsTable() {
  return once('schema:assets', async () => {
    await ensureEnumType('asset_status', ['OK', 'BROKEN', 'MAINTENANCE', 'LOST']);
    await ensureRoomsTable();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        asset_id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
        name VARCHAR(160) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        status asset_status NOT NULL DEFAULT 'OK',
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_assets_room_id ON assets(room_id)`);
  });
}

/** Tài sản phòng của tenant đang đăng nhập (theo phòng trong HĐ ACTIVE hoặc tenants.room_id). */
router.get('/tenant/assets', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureAssetsTable();
    await ensureTenantsTable();
    const roomResult = await pool.query(
      `SELECT COALESCE(c.room_id, t.room_id) AS room_id
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN contracts c ON c.tenant_id = t.tenant_id AND c.status = 'ACTIVE'
       WHERE u.user_id = $1
       ORDER BY c.contract_id DESC NULLS LAST
       LIMIT 1`,
      [req.auth.sub]
    );
    const roomId = roomResult.rows[0]?.room_id;
    if (!roomId) {
      return res.json({ ok: true, assets: [] });
    }
    const result = await pool.query(
      `SELECT asset_id, room_id, name, quantity, status, note, created_at, updated_at
       FROM assets
       WHERE room_id = $1
       ORDER BY asset_id ASC`,
      [roomId]
    );
    return res.json({ ok: true, assets: result.rows });
  } catch (err) {
    console.error('Tenant assets error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/assets', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAssetsTable();
    const result = await pool.query(
      `SELECT a.asset_id, a.room_id, r.room_number, a.name, a.quantity, a.status, a.note, a.created_at, a.updated_at
       FROM assets a
       LEFT JOIN rooms r ON r.room_id = a.room_id
       ORDER BY a.asset_id DESC`
    );
    return res.json({ ok: true, assets: result.rows });
  } catch (err) {
    console.error('List assets error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/assets', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAssetsTable();
    const { room_id, name, quantity, status, note } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO assets (room_id, name, quantity, status, note)
       VALUES ($1, $2, $3, $4::asset_status, $5)
       RETURNING asset_id, room_id, name, quantity, status, note, created_at, updated_at`,
      [
        room_id ? Number(room_id) : null,
        String(name).trim(),
        Number(quantity || 1),
        status ? String(status) : 'OK',
        note ? String(note) : null,
      ]
    );
    return res.status(201).json({ ok: true, asset: result.rows[0] });
  } catch (err) {
    console.error('Create asset error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.put('/admin/assets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAssetsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid asset id' });
    }

    const allowed = ['room_id', 'name', 'quantity', 'status', 'note'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'status') {
        values.push(String(value));
        return `${key} = $${idx + 1}::asset_status`;
      }
      values.push(value);
      return `${key} = $${idx + 1}`;
    });
    values.push(id);

    const result = await pool.query(
      `UPDATE assets
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE asset_id = $${values.length}
       RETURNING asset_id, room_id, name, quantity, status, note, created_at, updated_at`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'asset not found' });
    }
    return res.json({ ok: true, asset: result.rows[0] });
  } catch (err) {
    console.error('Update asset error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.delete('/admin/assets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAssetsTable();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid asset id' });
    }
    const result = await pool.query('DELETE FROM assets WHERE asset_id = $1 RETURNING asset_id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'asset not found' });
    }
    return res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error('Delete asset error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

