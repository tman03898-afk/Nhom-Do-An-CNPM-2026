const express = require('express');

const pool = require('../config/db');

const router = express.Router();
const ROOM_STATUSES = ['AVAILABLE', 'RENTED', 'MAINTENANCE'];

function formatRoom(row) {
  if (!row) return null;

  return {
    room_id: row.room_id,
    room_number: row.room_number,
    floor: row.floor,
    area: row.area !== null ? Number(row.area) : null,
    max_tenants: row.max_tenants,
    price: row.price !== null ? Number(row.price) : null,
    status: row.status,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateRoomInput(payload, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const requiredFields = ['room_number', 'area', 'price'];
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
    if (!ROOM_STATUSES.includes(payload.status)) {
      errors.push(`status must be one of: ${ROOM_STATUSES.join(', ')}`);
    } else {
      data.status = payload.status;
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
    const result = await pool.query(
      `SELECT room_id, room_number, floor, area, max_tenants, price, status, description, created_at, updated_at
       FROM rooms
       ORDER BY room_id ASC`
    );

    return res.json({ ok: true, rooms: result.rows.map(formatRoom) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid room id' });
    }

    const result = await pool.query(
      `SELECT room_id, room_number, floor, area, max_tenants, price, status, description, created_at, updated_at
       FROM rooms
       WHERE room_id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'room not found' });
    }

    return res.json({ ok: true, room: formatRoom(result.rows[0]) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const { errors, data } = validateRoomInput(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, message: 'validation error', errors });
    }

    const result = await pool.query(
      `INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description)
       VALUES ($1, $2, $3, $4, $5, $6::room_status, $7)
       RETURNING room_id, room_number, floor, area, max_tenants, price, status, description, created_at, updated_at`,
      [
        data.room_number,
        data.floor ?? null,
        data.area,
        data.max_tenants ?? 1,
        data.price,
        data.status ?? 'AVAILABLE',
        data.description ?? null,
      ]
    );

    return res.status(201).json({ ok: true, room: formatRoom(result.rows[0]) });
  } catch (err) {
    return handleDatabaseError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  try {
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
      return `${key} = $${index + 1}`;
    });

    values.push(roomId);

    const result = await pool.query(
      `UPDATE rooms
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE room_id = $${values.length}
       RETURNING room_id, room_number, floor, area, max_tenants, price, status, description, created_at, updated_at`,
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

router.delete('/:id', async (req, res) => {
  try {
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
