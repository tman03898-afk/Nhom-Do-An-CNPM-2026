const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function ensureAdminRemovalLogTable(q = pool) {
  await q.query(`
    CREATE TABLE IF NOT EXISTS admin_removal_log (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('CONTRACT', 'TENANT')),
      entity_id INTEGER NOT NULL,
      summary TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      deleted_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await q.query(`CREATE INDEX IF NOT EXISTS idx_admin_removal_log_deleted_at ON admin_removal_log (deleted_at DESC)`);
}

/**
 * @param {import('pg').PoolClient} client
 */
async function insertRemovalLog(client, { kind, entityId, summary, payload, deletedBy }) {
  await ensureAdminRemovalLogTable(client);
  await client.query(
    `INSERT INTO admin_removal_log (kind, entity_id, summary, payload, deleted_by)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [kind, entityId, summary || null, JSON.stringify(payload || {}), deletedBy || null]
  );
}

router.get('/admin/removal-log', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminRemovalLogTable();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
    const result = await pool.query(
      `SELECT
         l.id,
         l.kind,
         l.entity_id,
         l.summary,
         l.payload,
         l.deleted_at,
         u.full_name AS deleted_by_name
       FROM admin_removal_log l
       LEFT JOIN users u ON u.user_id = l.deleted_by
       ORDER BY l.deleted_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ ok: true, entries: result.rows });
  } catch (err) {
    console.error('Removal log list error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * Bật lại đăng nhập (is_active = true) cho user đã bị vô hiệu khi xóa khách thuê.
 * Chỉ áp dụng bản ghi kind = TENANT; payload phải có tenant.user_id.
 */
router.post('/admin/removal-log/:id/restore-tenant-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureAdminRemovalLogTable();
    const logId = Number(req.params.id);
    if (!Number.isInteger(logId) || logId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid log id' });
    }
    const r = await pool.query(`SELECT id, kind, payload FROM admin_removal_log WHERE id = $1`, [logId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'log not found' });
    }
    const row = r.rows[0];
    if (row.kind !== 'TENANT') {
      return res.status(400).json({
        ok: false,
        message: 'Chỉ khôi phục đăng nhập cho bản ghi xóa khách thuê (không áp dụng xóa hợp đồng).',
      });
    }
    const payload = row.payload || {};
    const userId =
      payload.tenant && payload.tenant.user_id != null ? Number(payload.tenant.user_id) : null;
    if (!userId || !Number.isInteger(userId)) {
      return res.status(400).json({ ok: false, message: 'Bản ghi không chứa user_id để khôi phục.' });
    }
    const u = await pool.query(`SELECT user_id, role, is_active FROM users WHERE user_id = $1`, [userId]);
    if (u.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản user.' });
    }
    if (String(u.rows[0].role) !== 'TENANT') {
      return res.status(400).json({ ok: false, message: 'Tài khoản không phải khách thuê.' });
    }
    await pool.query(`UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE user_id = $1`, [userId]);
    return res.json({
      ok: true,
      user_id: userId,
      is_active: true,
      message:
        'Đã bật lại đăng nhập (is_active = true). Nếu chưa có bản ghi khách thuê/hợp đồng, hãy tạo lại ở Quản lý khách thuê.',
    });
  } catch (err) {
    console.error('Restore tenant user error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = {
  router,
  ensureAdminRemovalLogTable,
  insertRemovalLog,
};
