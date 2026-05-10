const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable } = require('./_dbHelpers');

const router = express.Router();

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
  await ensureEnumType('incident_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  await ensureEnumType('incident_priority', ['LOW', 'MEDIUM', 'HIGH']);

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
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb`);
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

router.put('/admin/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const incidentId = Number(req.params.id);
    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid ticket id' });
    }

    const allowed = ['status', 'priority', 'assigned_to', 'title', 'description', 'room_id'];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'status') {
        values.push(String(value));
        return `${key} = $${idx + 1}::incident_status`;
      }
      if (key === 'priority') {
        values.push(String(value));
        return `${key} = $${idx + 1}::incident_priority`;
      }
      values.push(value);
      return `${key} = $${idx + 1}`;
    });

    values.push(incidentId);

    const result = await pool.query(
      `UPDATE incidents
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE incident_id = $${values.length}
       RETURNING incident_id, room_id, reported_by, assigned_to, title, description, status, priority, created_at, updated_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'ticket not found' });
    }

    return res.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/tickets', requireAuth, requireTenant, async (req, res) => {
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
         i.created_at,
         i.updated_at,
         r.room_id,
         r.room_number,
         COALESCE(i.attachment_urls, '[]'::jsonb) AS attachment_urls
       FROM incidents i
       LEFT JOIN rooms r ON r.room_id = i.room_id
       WHERE i.reported_by = $1
       ORDER BY i.incident_id DESC`,
      [req.auth.sub]
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
  incidentUpload.array('images', 5),
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
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureIncidentsTable();

    const { title, description, room_id, priority, attachment_urls } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, message: 'title is required' });
    }

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

    const result = await pool.query(
      `INSERT INTO incidents (room_id, reported_by, title, description, priority, attachment_urls)
       VALUES ($1, $2, $3, $4, $5::incident_priority, $6::jsonb)
       RETURNING incident_id, room_id, reported_by, title, description, status, priority, created_at, updated_at, attachment_urls`,
      [
        room_id ? Number(room_id) : null,
        req.auth.sub,
        String(title).trim(),
        description ? String(description) : null,
        priority ? String(priority) : 'MEDIUM',
        JSON.stringify(urls),
      ]
    );

    return res.status(201).json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

