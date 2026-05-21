const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');
const { ensureTenantProfileSchema } = require('./tenantProfile');
const contractRouter = require('./contracts');
const { insertRemovalLog } = require('./adminRemovalLog');

const router = express.Router();

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
    await ensureTenantProfileSchema();
    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.is_active,
         u.avatar_url,
         u.cccd,
         u.date_of_birth,
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

/** Xóa khách thuê (bản ghi tenant + vô hiệu hóa user); hợp đồng & hóa đơn liên quan cascade theo DB. Ghi log. */
router.delete('/admin/tenants/:tenantId', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid tenant id' });
    }

    await ensureTenantsTable();
    await ensureUsersTable();
    await ensureRoomsTable();
    await contractRouter.ensureContractsTable();

    const snap = await client.query(
      `SELECT t.tenant_id, t.user_id, t.room_id, t.phone, u.full_name, u.email, u.role,
              r.room_number
       FROM tenants t
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = t.room_id
       WHERE t.tenant_id = $1`,
      [tenantId]
    );
    if (snap.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'tenant not found' });
    }
    const trow = snap.rows[0];
    if (String(trow.role || '').toUpperCase() !== 'TENANT') {
      return res.status(400).json({ ok: false, message: 'not a tenant account' });
    }

    const contractsList = await client.query(
      `SELECT contract_id, room_id, start_date, end_date, status,
              COALESCE(rent_price, monthly_rent, 0) AS rent_price, deposit
       FROM contracts WHERE tenant_id = $1`,
      [tenantId]
    );

    await client.query('BEGIN');

    const payload = {
      tenant: {
        tenant_id: trow.tenant_id,
        user_id: trow.user_id,
        full_name: trow.full_name,
        email: trow.email,
        phone: trow.phone,
        room_number: trow.room_number,
        room_id: trow.room_id,
      },
      contracts: contractsList.rows,
    };
    const summary = `Khách ${trow.full_name} (${trow.email}) — ${contractsList.rowCount} hợp đồng liên quan`;

    await insertRemovalLog(client, {
      kind: 'TENANT',
      entityId: tenantId,
      summary,
      payload,
      deletedBy: req.auth?.sub || null,
    });

    const roomId = trow.room_id != null ? Number(trow.room_id) : null;

    const contractIds = await client.query(`SELECT contract_id FROM contracts WHERE tenant_id = $1`, [tenantId]);
    for (const crow of contractIds.rows) {
      await contractRouter.purgeContractDependencies(client, crow.contract_id);
    }
    await client.query(`DELETE FROM contracts WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM invoices WHERE tenant_id = $1`, [tenantId]);

    await client.query(`DELETE FROM tenants WHERE tenant_id = $1`, [tenantId]);

    if (roomId != null && !Number.isNaN(roomId)) {
      await client.query(
        `UPDATE rooms
         SET status = 'AVAILABLE'::room_status, updated_at = NOW()
         WHERE room_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM contracts c2 WHERE c2.room_id = $1 AND c2.status = 'ACTIVE'::contract_status
           )`,
        [roomId]
      );
    }

    await client.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1`, [trow.user_id]);

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'tenant removed' });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Delete tenant error:', err);
    const hint =
      err && err.code === '23503'
        ? 'Còn dữ liệu ràng buộc khách thuê—đã gỡ hợp đồng/hóa đơn theo từng bước; kiểm tra DB.'
        : 'internal error';
    return res.status(500).json({ ok: false, message: hint });
  } finally {
    client.release();
  }
});

module.exports = {
  router,
  ensureTenantsTable,
};

