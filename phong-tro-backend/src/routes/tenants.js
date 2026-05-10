const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');

const router = express.Router();

async function ensureTenantsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      phone VARCHAR(30),
      room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS room_id INTEGER`);
  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

router.get('/admin/tenants', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureTenantsTable();
    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.is_active,
         t.tenant_id,
         t.phone,
         r.room_id,
         r.room_number,
         r.status AS room_status
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       WHERE u.role = 'TENANT'
       ORDER BY u.user_id DESC`
    );

    return res.json({ ok: true, tenants: result.rows });
  } catch (err) {
    console.error('List tenants error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/me', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureTenantsTable();
    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.is_active,
         t.tenant_id,
         t.phone,
         r.room_id,
         r.room_number,
         r.status AS room_status
       FROM users u
       LEFT JOIN tenants t ON t.user_id = u.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [req.auth.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'tenant not found' });
    }

    return res.json({ ok: true, tenant: result.rows[0] });
  } catch (err) {
    console.error('Tenant me error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = {
  router,
  ensureTenantsTable,
};

