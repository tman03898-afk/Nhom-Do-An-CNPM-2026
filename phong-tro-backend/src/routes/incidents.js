const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable } = require('./_dbHelpers');
const { once } = require('./_schemaCache');

const router = express.Router();

/** DB cũ có thể đã tạo incident_status trước khi có RESOLVED/CLOSED — bổ sung nhãn enum. */
async function syncIncidentStatusEnumValues() {
  const desired = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  try {
    const r = await pool.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'incident_status'`
    );
    const have = new Set(r.rows.map((row) => String(row.enumlabel)));
    for (const lab of desired) {
      if (have.has(lab)) continue;
      try {
        await pool.query(`ALTER TYPE incident_status ADD VALUE IF NOT EXISTS '${lab}'`);
      } catch (err) {
        if (err.code !== '42710' && err.code !== '23505') {
          console.warn('syncIncidentStatusEnumValues:', lab, err.message);
        }
      }
    }
  } catch (err) {
    console.warn('syncIncidentStatusEnumValues:', err.message);
  }
}

const incidentUploadDir = path.join(__dirname, '../../uploads/incident-attachments');
if (!fs.existsSync(incidentUploadDir)) {
  fs.mkdirSync(incidentUploadDir, { recursive: true });
}

const incidentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, incidentUploadDir),
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `incident-${suffix}${path.extname(file.originalname)}`);
  },
});

const incidentUpload = multer({
  storage: incidentStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ok =
      /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype || '') ||
      /\.(jpe?g|png|gif|webp)$/i.test(path.extname(file.originalname || ''));
    if (ok) return cb(null, true);
    cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP'));
  },
});

async function ensureIncidentsTable() {
  return once('schema:incidents', async () => {
  await ensureEnumType('incident_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  await ensureEnumType('incident_priority', ['LOW', 'MEDIUM', 'HIGH']);

  await syncIncidentStatusEnumValues();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      incident_id SERIAL PRIMARY KEY,
      room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
      reported_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status incident_status NOT NULL DEFAULT 'OPEN',
      priority incident_priority NOT NULL DEFAULT 'MEDIUM',
      repair_cost NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_room_id ON incidents(room_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`);

  // Backward-compatible migration for older schemas.
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS title VARCHAR(200)`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority incident_priority NOT NULL DEFAULT 'MEDIUM'`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS status incident_status NOT NULL DEFAULT 'OPEN'`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS repair_cost NUMERIC NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE incidents ALTER COLUMN status SET DEFAULT 'OPEN'::incident_status`);
  await pool.query(`UPDATE incidents SET status = 'OPEN'::incident_status WHERE status::text = 'PENDING'`);
  await pool.query(`UPDATE incidents SET status = 'RESOLVED'::incident_status WHERE status::text = 'DONE'`);
  });
}

async function ensureNotificationsTableForIncidents() {
  return once('schema:notifications', async () => {
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

  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
  });
}

function statusLabelVi(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'OPEN') return 'chờ xử lý';
  if (s === 'IN_PROGRESS') return 'đang xử lý';
  if (s === 'RESOLVED') return 'đã hoàn thành';
  if (s === 'CLOSED') return 'đã đóng';
  return s || 'không rõ';
}

async function notifyAdminsAboutNewTicket(client, ticket) {
  await ensureNotificationsTableForIncidents();
  const admins = await client.query(
    `SELECT user_id
     FROM users
     WHERE UPPER(role::text) = 'ADMIN' AND COALESCE(is_active, true) = true`
  );
  if (admins.rowCount === 0) return;

  const title = `Yêu cầu sửa chữa mới #${ticket.incident_id}`;
  const room = ticket.room_number ? `Phòng ${ticket.room_number}` : 'Chưa gán phòng';
  const reporter = ticket.reported_by_full_name || ticket.reported_by_email || `Tenant #${ticket.reported_by}`;
  const body = `${reporter} vừa gửi yêu cầu "${ticket.title}" (${room}). Vào mục Bảo trì để tiếp nhận và cập nhật trạng thái.`;

  for (const admin of admins.rows) {
    await client.query(
      `INSERT INTO notifications (user_id, title, body, created_by)
       VALUES ($1, $2, $3, $4)`,
      [admin.user_id, title, body, ticket.reported_by]
    );
  }
}

async function notifyTenantAboutTicketStatus(client, ticket, actorId) {
  await ensureNotificationsTableForIncidents();
  const title =
    String(ticket.status).toUpperCase() === 'RESOLVED'
      ? `Yêu cầu sửa chữa #${ticket.incident_id} đã hoàn thành`
      : `Cập nhật yêu cầu sửa chữa #${ticket.incident_id}`;
  const body =
    String(ticket.status).toUpperCase() === 'RESOLVED'
      ? `Yêu cầu "${ticket.title}" đã được đánh dấu hoàn thành. Bạn có thể xem/in biên nhận xử lý trong mục Hỗ trợ.`
      : `Yêu cầu "${ticket.title}" đã chuyển sang trạng thái ${statusLabelVi(ticket.status)}.`;

  await client.query(
    `INSERT INTO notifications (user_id, title, body, created_by)
     VALUES ($1, $2, $3, $4)`,
    [ticket.reported_by, title, body, actorId || null]
  );
}

async function getTicketReceipt(incidentId, viewer) {
  const result = await pool.query(
    `SELECT
       i.incident_id,
       i.title,
       i.description,
       i.status,
       i.priority,
       COALESCE(i.repair_cost, 0) AS repair_cost,
       i.created_at,
       i.updated_at,
       r.room_id,
       r.room_number,
       reporter.user_id AS reported_by_user_id,
       reporter.full_name AS reported_by_full_name,
       reporter.email AS reported_by_email,
       assignee.user_id AS assigned_to_user_id,
       assignee.full_name AS assigned_to_full_name,
       assignee.email AS assigned_to_email
     FROM incidents i
     LEFT JOIN rooms r ON r.room_id = i.room_id
     JOIN users reporter ON reporter.user_id = i.reported_by
     LEFT JOIN users assignee ON assignee.user_id = i.assigned_to
     WHERE i.incident_id = $1
       ${viewer?.role === 'TENANT' ? 'AND i.reported_by = $2' : ''}
     LIMIT 1`,
    viewer?.role === 'TENANT' ? [incidentId, viewer.userId] : [incidentId]
  );

  if (result.rowCount === 0) return null;
  const ticket = result.rows[0];
  const status = String(ticket.status || '').toUpperCase();
  if (status !== 'RESOLVED' && status !== 'DONE' && status !== 'CLOSED') {
    return { notReady: true, ticket };
  }

  return {
    receipt_no: `SC-${String(ticket.incident_id).padStart(6, '0')}`,
    issued_at: ticket.updated_at || new Date().toISOString(),
    ticket,
  };
}

router.get('/admin/tickets', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const result = await pool.query(
      `SELECT
         i.incident_id,
         i.title,
         i.description,
         i.status,
         i.priority,
         COALESCE(i.repair_cost, 0) AS repair_cost,
         i.created_at,
         i.updated_at,
         r.room_id,
         r.room_number,
         reporter.user_id AS reported_by_user_id,
         reporter.full_name AS reported_by_full_name,
         reporter.email AS reported_by_email,
         assignee.user_id AS assigned_to_user_id,
         assignee.full_name AS assigned_to_full_name,
         assignee.email AS assigned_to_email,
         COALESCE(i.attachment_urls, '[]'::jsonb) AS attachment_urls
       FROM incidents i
       LEFT JOIN rooms r ON r.room_id = i.room_id
       JOIN users reporter ON reporter.user_id = i.reported_by
       LEFT JOIN users assignee ON assignee.user_id = i.assigned_to
       ORDER BY i.incident_id DESC`
    );

    return res.json({ ok: true, tickets: result.rows });
  } catch (err) {
    console.error('List tickets error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

const adminTicketSelect = `
  SELECT
    i.incident_id,
    i.title,
    i.description,
    i.status,
    i.priority,
    COALESCE(i.repair_cost, 0) AS repair_cost,
    i.created_at,
    i.updated_at,
    r.room_id,
    r.room_number,
    reporter.user_id AS reported_by_user_id,
    reporter.full_name AS reported_by_full_name,
    reporter.email AS reported_by_email,
    assignee.user_id AS assigned_to_user_id,
    assignee.full_name AS assigned_to_full_name,
    assignee.email AS assigned_to_email,
    COALESCE(i.attachment_urls, '[]'::jsonb) AS attachment_urls
  FROM incidents i
  LEFT JOIN rooms r ON r.room_id = i.room_id
  JOIN users reporter ON reporter.user_id = i.reported_by
  LEFT JOIN users assignee ON assignee.user_id = i.assigned_to
`;

/** Đăng ký trước /admin/tickets/:id để không bị coi "staff" là id. */
router.get('/admin/tickets/staff', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    const result = await pool.query(
      `SELECT user_id, full_name, email
       FROM users
       WHERE UPPER(role::text) = 'ADMIN' AND COALESCE(is_active, true) = true
       ORDER BY full_name NULLS LAST, user_id`
    );
    return res.json({ ok: true, staff: result.rows });
  } catch (err) {
    console.error('Ticket staff list error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/tickets', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const { reported_by, title, description, room_id, priority, attachment_urls } = req.body || {};
    const uid = Number(reported_by);
    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ ok: false, message: 'reported_by (user_id tenant) là bắt buộc' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, message: 'title is required' });
    }

    const chk = await pool.query(`SELECT user_id FROM users WHERE user_id = $1 AND UPPER(role::text) = 'TENANT'`, [uid]);
    if (chk.rowCount === 0) {
      return res.status(400).json({ ok: false, message: 'Người báo cáo phải là tài khoản tenant' });
    }

    const allowedPri = new Set(['LOW', 'MEDIUM', 'HIGH']);
    const priRaw = String(priority || 'MEDIUM').trim().toUpperCase();
    const pri = allowedPri.has(priRaw) ? priRaw : 'MEDIUM';

    let urls = [];
    if (Array.isArray(attachment_urls)) {
      urls = attachment_urls.map((u) => String(u).trim()).filter(Boolean);
    } else if (typeof attachment_urls === 'string' && attachment_urls.trim()) {
      try {
        const parsed = JSON.parse(attachment_urls);
        urls = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
      } catch (e) {
        urls = [];
      }
    }
    if (urls.length > 5) {
      return res.status(400).json({ ok: false, message: 'Tối đa 5 ảnh đính kèm' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO incidents (room_id, reported_by, title, description, priority, attachment_urls)
       VALUES ($1, $2, $3, $4, $5::incident_priority, $6::jsonb)
       RETURNING incident_id, room_id, reported_by, assigned_to, title, description, status, priority, repair_cost, created_at, updated_at, attachment_urls`,
      [
        room_id ? Number(room_id) : null,
        uid,
        String(title).trim(),
        description ? String(description) : null,
        pri,
        JSON.stringify(urls),
      ]
    );

    const tenantNoticeTitle = `Yêu cầu sửa chữa #${result.rows[0].incident_id} đã được tạo`;
    const tenantNoticeBody = `Ban quản lý đã tạo phiếu "${result.rows[0].title}" cho bạn. Bạn có thể theo dõi trạng thái trong mục Hỗ trợ.`;
    await ensureNotificationsTableForIncidents();
    await client.query(
      `INSERT INTO notifications (user_id, title, body, created_by)
       VALUES ($1, $2, $3, $4)`,
      [uid, tenantNoticeTitle, tenantNoticeBody, req.auth.sub]
    );
    await client.query('COMMIT');

    return res.status(201).json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Admin create ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

router.post(
  '/admin/tickets/upload',
  requireAuth,
  requireAdmin,
  (req, res, next) => {
    incidentUpload.array('images', 5)(req, res, (err) => {
      if (err) {
        const msg = err.message || 'Upload không hợp lệ';
        const code = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(code).json({ ok: false, message: msg });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ ok: false, message: 'Vui lòng chọn ít nhất một ảnh' });
      }
      const file_urls = files.map((f) => `/uploads/incident-attachments/${f.filename}`);
      return res.json({ ok: true, file_urls });
    } catch (err) {
      console.error('Admin incident upload error:', err);
      return res.status(500).json({ ok: false, message: err?.message || 'upload failed' });
    }
  }
);

router.get('/admin/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const result = await pool.query(`${adminTicketSelect} WHERE i.incident_id = $1`, [incidentId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }
    return res.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('Admin ticket detail error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/tickets/:id/receipt', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const receipt = await getTicketReceipt(incidentId, { role: 'ADMIN' });
    if (!receipt) return res.status(404).json({ ok: false, message: 'ticket not found' });
    if (receipt.notReady) {
      return res.status(400).json({ ok: false, message: 'receipt is available after ticket is completed' });
    }
    return res.json({ ok: true, receipt });
  } catch (err) {
    console.error('Admin ticket receipt error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.put('/admin/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const allowed = ['status', 'priority', 'assigned_to', 'title', 'description', 'room_id', 'repair_cost'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const allowedIncidentStatus = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
    const statusEntry = entries.find(([k]) => k === 'status');
    if (statusEntry) {
      const raw = String(statusEntry[1] || '').trim().toUpperCase();
      if (!allowedIncidentStatus.has(raw)) {
        return res.status(400).json({ ok: false, message: 'invalid status' });
      }
    }

    const allowedPri = new Set(['LOW', 'MEDIUM', 'HIGH']);
    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'status') {
        const raw = String(value || '').trim().toUpperCase();
        values.push(raw);
        return `${key} = $${idx + 1}::incident_status`;
      }
      if (key === 'priority') {
        const raw = String(value || 'MEDIUM').trim().toUpperCase();
        const p = allowedPri.has(raw) ? raw : 'MEDIUM';
        values.push(p);
        return `${key} = $${idx + 1}::incident_priority`;
      }
      if (key === 'title') {
        values.push(String(value || '').trim());
        return `title = $${idx + 1}`;
      }
      if (key === 'description') {
        const d = value == null || String(value).trim() === '' ? null : String(value).trim();
        values.push(d);
        return `description = $${idx + 1}`;
      }
      if (key === 'room_id') {
        const v = value === '' || value == null ? null : Number(value);
        values.push(Number.isInteger(v) ? v : null);
        return `room_id = $${idx + 1}`;
      }
      if (key === 'assigned_to') {
        const v = value === '' || value == null ? null : Number(value);
        values.push(Number.isInteger(v) ? v : null);
        return `assigned_to = $${idx + 1}`;
      }
      if (key === 'repair_cost') {
        const v = value === '' || value == null ? 0 : Number(value);
        if (!Number.isFinite(v) || v < 0) {
          throw Object.assign(new Error('repair_cost must be a non-negative number'), { code: 'BAD_FIELD' });
        }
        values.push(v);
        return `repair_cost = $${idx + 1}`;
      }
      throw Object.assign(new Error('invalid field'), { code: 'BAD_FIELD' });
    });

    values.push(incidentId);

    const before = await client.query(
      `SELECT incident_id, reported_by, title, status FROM incidents WHERE incident_id = $1`,
      [incidentId]
    );
    const oldStatus = before.rows[0]?.status ? String(before.rows[0].status).toUpperCase() : null;

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE incidents
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE incident_id = $${values.length}
       RETURNING incident_id, room_id, reported_by, assigned_to, title, description, status, priority, repair_cost, created_at, updated_at, attachment_urls`,
      values
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }

    const updated = result.rows[0];
    const newStatus = String(updated.status || '').toUpperCase();
    if (statusEntry && oldStatus && oldStatus !== newStatus) {
      await notifyTenantAboutTicketStatus(client, updated, req.auth.sub);
    }
    await client.query('COMMIT');

    return res.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    if (err?.code === 'BAD_FIELD') {
      return res.status(400).json({ ok: false, message: err.message });
    }
    console.error('Update ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

router.delete('/admin/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureIncidentsTable();
    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }
    const result = await pool.query(`DELETE FROM incidents WHERE incident_id = $1 RETURNING incident_id`, [
      incidentId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }
    return res.json({ ok: true, deleted: incidentId });
  } catch (err) {
    console.error('Admin delete ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/tickets', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const uid = Number(req.auth.sub);
    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(401).json({ ok: false, message: 'invalid session' });
    }

    const result = await pool.query(
      `SELECT
         i.incident_id,
         i.title,
         i.description,
         i.status,
         i.priority,
         COALESCE(i.repair_cost, 0) AS repair_cost,
         i.created_at,
         i.updated_at,
         r.room_id,
         r.room_number,
         COALESCE(i.attachment_urls, '[]'::jsonb) AS attachment_urls
       FROM incidents i
       LEFT JOIN rooms r ON r.room_id = i.room_id
       WHERE i.reported_by = $1
       ORDER BY i.incident_id DESC`,
      [uid]
    );

    return res.json({ ok: true, tickets: result.rows });
  } catch (err) {
    console.error('Tenant tickets error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post(
  '/tenant/tickets/upload',
  requireAuth,
  requireTenant,
  (req, res, next) => {
    incidentUpload.array('images', 5)(req, res, (err) => {
      if (err) {
        const msg = err.message || 'Upload không hợp lệ';
        const code = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(code).json({ ok: false, message: msg });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ ok: false, message: 'Vui lòng chọn ít nhất một ảnh' });
      }
      const file_urls = files.map((f) => `/uploads/incident-attachments/${f.filename}`);
      return res.json({ ok: true, file_urls });
    } catch (err) {
      console.error('Incident upload error:', err);
      const msg = err?.message || 'upload failed';
      return res.status(500).json({ ok: false, message: msg });
    }
  }
);

router.post('/tenant/tickets', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const { title, description, room_id, priority, attachment_urls } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, message: 'title is required' });
    }

    const allowedPri = new Set(['LOW', 'MEDIUM', 'HIGH']);
    const priRaw = String(priority || 'MEDIUM').trim().toUpperCase();
    const pri = allowedPri.has(priRaw) ? priRaw : 'MEDIUM';

    let urls = [];
    if (Array.isArray(attachment_urls)) {
      urls = attachment_urls.map((u) => String(u).trim()).filter(Boolean);
    } else if (typeof attachment_urls === 'string' && attachment_urls.trim()) {
      try {
        const parsed = JSON.parse(attachment_urls);
        urls = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
      } catch (e) {
        urls = [];
      }
    }
    if (urls.length > 5) {
      return res.status(400).json({ ok: false, message: 'Tối đa 5 ảnh đính kèm' });
    }

    const reporterId = Number(req.auth.sub);
    if (!Number.isInteger(reporterId) || reporterId <= 0) {
      return res.status(401).json({ ok: false, message: 'invalid session' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO incidents (room_id, reported_by, title, description, priority, attachment_urls)
       VALUES ($1, $2, $3, $4, $5::incident_priority, $6::jsonb)
       RETURNING incident_id, room_id, reported_by, title, description, status, priority, repair_cost, created_at, updated_at, attachment_urls`,
      [
        room_id ? Number(room_id) : null,
        reporterId,
        String(title).trim(),
        description ? String(description) : null,
        pri,
        JSON.stringify(urls),
      ]
    );

    const notifyPayload = await client.query(
      `SELECT i.incident_id, i.reported_by, i.title, r.room_number,
              u.full_name AS reported_by_full_name, u.email AS reported_by_email
       FROM incidents i
       JOIN users u ON u.user_id = i.reported_by
       LEFT JOIN rooms r ON r.room_id = i.room_id
       WHERE i.incident_id = $1`,
      [result.rows[0].incident_id]
    );
    await notifyAdminsAboutNewTicket(client, notifyPayload.rows[0] || result.rows[0]);
    await client.query('COMMIT');

    return res.status(201).json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Create ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

const tenantTicketSelect = `
  SELECT
    i.incident_id,
    i.title,
    i.description,
    i.status,
    i.priority,
    COALESCE(i.repair_cost, 0) AS repair_cost,
    i.created_at,
    i.updated_at,
    r.room_id,
    r.room_number,
    COALESCE(i.attachment_urls, '[]'::jsonb) AS attachment_urls
  FROM incidents i
  LEFT JOIN rooms r ON r.room_id = i.room_id
`;

router.get('/tenant/tickets/:id/receipt', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const receipt = await getTicketReceipt(incidentId, { role: 'TENANT', userId: req.auth.sub });
    if (!receipt) return res.status(404).json({ ok: false, message: 'ticket not found' });
    if (receipt.notReady) {
      return res.status(400).json({ ok: false, message: 'receipt is available after ticket is completed' });
    }
    return res.json({ ok: true, receipt });
  } catch (err) {
    console.error('Tenant ticket receipt error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/tickets/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const result = await pool.query(`${tenantTicketSelect} WHERE i.incident_id = $1 AND i.reported_by = $2`, [
      incidentId,
      req.auth.sub,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }
    return res.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('Tenant ticket detail error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.put('/tenant/tickets/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const cur = await pool.query(
      `SELECT incident_id, status, reported_by FROM incidents WHERE incident_id = $1`,
      [incidentId]
    );
    const row = cur.rows[0];
    if (!row) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }
    if (Number(row.reported_by) !== Number(req.auth.sub)) {
      return res.status(403).json({ ok: false, message: 'forbidden' });
    }
    if (String(row.status).toUpperCase() !== 'OPEN') {
      return res.status(400).json({
        ok: false,
        message: 'Chỉ có thể chỉnh sửa yêu cầu đang chờ xử lý.',
      });
    }

    const allowed = ['title', 'description', 'priority', 'attachment_urls'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const allowedPri = new Set(['LOW', 'MEDIUM', 'HIGH']);
    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'priority') {
        const raw = String(value || 'MEDIUM').trim().toUpperCase();
        const p = allowedPri.has(raw) ? raw : 'MEDIUM';
        values.push(p);
        return `${key} = $${idx + 1}::incident_priority`;
      }
      if (key === 'attachment_urls') {
        let urls = [];
        if (Array.isArray(value)) {
          urls = value.map((u) => String(u).trim()).filter(Boolean);
        } else if (typeof value === 'string' && value.trim()) {
          try {
            const parsed = JSON.parse(value);
            urls = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
          } catch (e) {
            urls = [];
          }
        }
        if (urls.length > 5) {
          throw Object.assign(new Error('Tối đa 5 ảnh đính kèm'), { code: 'BAD_ATTACH' });
        }
        values.push(JSON.stringify(urls));
        return `${key} = $${idx + 1}::jsonb`;
      }
      if (key === 'title') {
        values.push(String(value || '').trim());
        return `title = $${idx + 1}`;
      }
      if (key === 'description') {
        const d = value == null || String(value).trim() === '' ? null : String(value).trim();
        values.push(d);
        return `description = $${idx + 1}`;
      }
      throw Object.assign(new Error('invalid field'), { code: 'BAD_FIELD' });
    });

    values.push(incidentId);
    values.push(req.auth.sub);

    const result = await pool.query(
      `UPDATE incidents
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE incident_id = $${values.length - 1} AND reported_by = $${values.length}
       RETURNING incident_id, room_id, reported_by, title, description, status, priority, repair_cost, created_at, updated_at, attachment_urls`,
      values
    );

    return res.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    if (err?.code === 'BAD_ATTACH' || err?.code === 'BAD_FIELD') {
      return res.status(400).json({ ok: false, message: err.message });
    }
    console.error('Tenant update ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.delete('/tenant/tickets/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const cur = await pool.query(
      `SELECT incident_id, status, reported_by FROM incidents WHERE incident_id = $1`,
      [incidentId]
    );
    const row = cur.rows[0];
    if (!row) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }
    if (Number(row.reported_by) !== Number(req.auth.sub)) {
      return res.status(403).json({ ok: false, message: 'forbidden' });
    }
    if (String(row.status).toUpperCase() !== 'OPEN') {
      return res.status(400).json({
        ok: false,
        message: 'Chỉ có thể hủy yêu cầu đang chờ xử lý.',
      });
    }

    await pool.query(`DELETE FROM incidents WHERE incident_id = $1 AND reported_by = $2`, [
      incidentId,
      req.auth.sub,
    ]);
    return res.json({ ok: true, deleted: incidentId });
  } catch (err) {
    console.error('Tenant delete ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

