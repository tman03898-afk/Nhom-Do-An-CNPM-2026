const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable } = require('./_dbHelpers');

const router = express.Router();
const ROOM_STATUSES = ['AVAILABLE', 'HELD', 'RENTED', 'MAINTENANCE'];
const { expireStaleRoomHolds } = require('./roomHolds');
const ROOM_TYPES = ['Phòng thường', 'Phòng gác lửng', 'Phòng ban công'];
const ROOM_SELECT =
  'room_id, room_number, floor, area, max_tenants, price, status, description, room_type, images, hold_until, active_hold_request_id, created_at, updated_at';

const roomUploadDir = path.join(__dirname, '../../uploads/room-images');
if (!fs.existsSync(roomUploadDir)) {
  fs.mkdirSync(roomUploadDir, { recursive: true });
}

const roomImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, roomUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('only image files allowed'));
  },
});

function parseImagesField(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseImagesField(parsed);
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}

function formatRoom(row) {
  if (!row) return null;

  return {
    room_id: row.room_id,
    room_number: row.room_number,
    floor: row.floor,
    area: row.area !== null ? Number(row.area) : null,
    max_tenants: row.max_tenants,
    price: row.price !== null ? Number(row.price) : null,
    status: String(row.status || '').trim().toUpperCase(),
    description: row.description,
    room_type: row.room_type || null,
    images: parseImagesField(row.images),
    hold_until: row.hold_until || null,
    active_hold_request_id: row.active_hold_request_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateRoomInput(payload, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const requiredFields = ['room_number', 'floor', 'area', 'price'];
  for (const field of requiredFields) {
    if (!partial && (payload[field] === undefined || payload[field] === null || payload[field] === '')) {
      errors.push(`${field} is required`);
    }
  }

  if (payload.room_number !== undefined) {
    if (typeof payload.room_number !== 'string' || !payload.room_number.trim()) {
      errors.push('room_number must be a non-empty string');
    } else {
      data.room_number = payload.room_number.trim();
    }
  }

  if (payload.floor !== undefined) {
    if (payload.floor === null || payload.floor === '') {
      data.floor = null;
    } else {
      const floor = Number(payload.floor);
      if (!Number.isInteger(floor)) {
        errors.push('floor must be an integer');
      } else {
        data.floor = floor;
      }
    }
  }

  if (payload.area !== undefined) {
    const area = Number(payload.area);
    if (Number.isNaN(area) || area <= 0) {
      errors.push('area must be a number greater than 0');
    } else {
      data.area = area;
    }
  }

  if (payload.max_tenants !== undefined) {
    const maxTenants = Number(payload.max_tenants);
    if (!Number.isInteger(maxTenants) || maxTenants <= 0) {
      errors.push('max_tenants must be an integer greater than 0');
    } else {
      data.max_tenants = maxTenants;
    }
  }

  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (Number.isNaN(price) || price < 0) {
      errors.push('price must be a number greater than or equal to 0');
    } else {
      data.price = price;
    }
  }

  if (payload.status !== undefined) {
    const st = String(payload.status).trim().toUpperCase();
    if (!ROOM_STATUSES.includes(st)) {
      errors.push(`status must be one of: ${ROOM_STATUSES.join(', ')}`);
    } else {
      data.status = st;
    }
  }

  if (payload.description !== undefined) {
    if (payload.description === null) {
      data.description = null;
    } else if (typeof payload.description !== 'string') {
      errors.push('description must be a string or null');
    } else {
      data.description = payload.description.trim() || null;
    }
  }

  if (payload.room_type !== undefined) {
    if (payload.room_type === null || payload.room_type === '') {
      data.room_type = null;
    } else if (!ROOM_TYPES.includes(String(payload.room_type))) {
      errors.push(`room_type must be one of: ${ROOM_TYPES.join(', ')}`);
    } else {
      data.room_type = payload.room_type;
    }
  }

  if (payload.images !== undefined) {
    data.images = JSON.stringify(parseImagesField(payload.images));
  }

  return { errors, data };
}

function handleDatabaseError(err, res) {
  if (err.code === '23505') {
    return res.status(409).json({ ok: false, message: 'room_number already exists' });
  }

  if (err.code === '23503') {
    return res.status(409).json({ ok: false, message: 'cannot delete room because it is referenced by other records' });
  }

  console.error('Room route error:', err);
  return res.status(500).json({ ok: false, message: 'internal error' });
}

router.get('/', async (req, res) => {
  try {
    await ensureRoomsTable();
    await expireStaleRoomHolds();

    const forGuest = String(req.query.for_guest || '').trim() === '1';
    const statusFilter = req.query.status
      ? String(req.query.status).trim().toUpperCase()
      : null;

    const params = [];
    let sql = `SELECT ${ROOM_SELECT} FROM rooms`;

    if (forGuest) {
      sql += ` WHERE status IN ('AVAILABLE'::room_status, 'HELD'::room_status)`;
    } else if (statusFilter) {
      if (!ROOM_STATUSES.includes(statusFilter)) {
        return res.status(400).json({
          ok: false,
          message: `status must be one of: ${ROOM_STATUSES.join(', ')}`,
        });
      }
      params.push(statusFilter);
      sql += ` WHERE status = $1::room_status`;
    }

    sql += ` ORDER BY room_number ASC, room_id ASC`;

    const result = await pool.query(sql, params);

    return res.json({ ok: true, rooms: result.rows.map(formatRoom) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

/** Admin: upload ảnh phòng (trả về URL tương đối /uploads/room-images/...) */
router.post(
  '/admin/upload-images',
  requireAuth,
  requireAdmin,
  (req, res, next) => {
    roomImageUpload.array('images', 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || 'upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ ok: false, message: 'no images uploaded' });
      }
      const urls = files.map((f) => `/uploads/room-images/${f.filename}`);
      return res.json({ ok: true, urls });
    } catch (err) {
      console.error('Room image upload error:', err);
      return res.status(500).json({ ok: false, message: 'upload failed' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    await ensureRoomsTable();
    await expireStaleRoomHolds();
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid room id' });
    }

    const result = await pool.query(`SELECT ${ROOM_SELECT} FROM rooms WHERE room_id = $1`, [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'room not found' });
    }

    return res.json({ ok: true, room: formatRoom(result.rows[0]) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureRoomsTable();
    const { errors, data } = validateRoomInput(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, message: 'validation error', errors });
    }

    const result = await pool.query(
      `INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description, room_type, images)
       VALUES ($1, $2, $3, $4, $5, $6::room_status, $7, $8, $9::jsonb)
       RETURNING ${ROOM_SELECT}`,
      [
        data.room_number,
        data.floor ?? null,
        data.area,
        data.max_tenants ?? 1,
        data.price,
        data.status ?? 'AVAILABLE',
        data.description ?? null,
        data.room_type ?? null,
        data.images ?? '[]',
      ]
    );

    return res.status(201).json({ ok: true, room: formatRoom(result.rows[0]) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureRoomsTable();
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid room id' });
    }

    const { errors, data } = validateRoomInput(req.body || {}, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, message: 'validation error', errors });
    }

    const entries = Object.entries(data);
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], index) => {
      values.push(value);
      if (key === 'status') {
        return `${key} = $${index + 1}::room_status`;
      }
      if (key === 'images') {
        return `${key} = $${index + 1}::jsonb`;
      }
      return `${key} = $${index + 1}`;
    });

    values.push(roomId);

    const result = await pool.query(
      `UPDATE rooms
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE room_id = $${values.length}
       RETURNING ${ROOM_SELECT}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'room not found' });
    }

    return res.json({ ok: true, room: formatRoom(result.rows[0]) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureRoomsTable();
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid room id' });
    }

    const result = await pool.query(
      `DELETE FROM rooms
       WHERE room_id = $1
       RETURNING room_id, room_number`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'room not found' });
    }

    return res.json({ ok: true, message: 'room deleted successfully', room: result.rows[0] });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

module.exports = router;
