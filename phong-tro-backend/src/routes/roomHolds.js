const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureRoomsTable, ensureUsersTable, ensureTenantsTable } = require('./_dbHelpers');
const { once } = require('./_schemaCache');
const {
  ensureContractsTable,
  ensureNotificationsTable,
  normalizeDate,
} = require('./contracts');
const {
  isValidEmail,
  pickCredentialNotifyChannel,
  deliverTenantCredentials,
} = require('../services/tenantCredentials');

const SALT_ROUNDS = 10;
const TEMP_HOLD_MINUTES = 15;

const holdDepositUploadDir = path.join(__dirname, '../../uploads/hold-deposit-proofs');
if (!fs.existsSync(holdDepositUploadDir)) {
  fs.mkdirSync(holdDepositUploadDir, { recursive: true });
}

const holdDepositUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, holdDepositUploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `hold-deposit-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname));
    if (ok && /^image\//.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
  },
});

const router = express.Router();

const REQUEST_STATUSES = [
  'NEW',
  'CONTACTED',
  'VIEW_SCHEDULED',
  'DEPOSIT_PENDING',
  'DEPOSITED',
  'CANCELLED',
  'COMPLETED',
];
const REQUEST_STATUS_LABELS = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  VIEW_SCHEDULED: 'Đã hẹn xem',
  DEPOSIT_PENDING: 'Đã gửi cọc — chờ xác minh',
  DEPOSITED: 'Đã cọc (đã xác minh)',
  CANCELLED: 'Từ chối / Hủy',
  COMPLETED: 'Hoàn tất',
};

function formatHoldRow(row) {
  if (!row) return null;
  const status = String(row.request_status || 'NEW').toUpperCase();
  const holdKind = String(row.hold_kind || 'TEMP').toUpperCase();
  return {
    hold_request_id: row.hold_request_id,
    room_id: row.room_id,
    room_number: row.room_number,
    guest_name: row.guest_name,
    guest_phone: row.guest_phone || null,
    guest_email: row.guest_email || null,
    preferred_view_date: row.preferred_view_date,
    note: row.note,
    request_status: status,
    request_status_label: REQUEST_STATUS_LABELS[status] || status,
    hold_kind: holdKind,
    hold_kind_label: holdKind === 'DEPOSIT' ? 'Đặt cọc' : 'Giữ chỗ 15 phút',
    hold_until: row.hold_until,
    deposit_proof_url: row.deposit_proof_url || null,
    deposit_submitted_at: row.deposit_submitted_at || null,
    deposit_verified_at: row.deposit_verified_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getDepositConfigFromEnv(roomNumber, amount) {
  const base = String(process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  const qrPath = process.env.DEPOSIT_QR_IMAGE_URL || '/uploads/deposit-qr.png';
  const qr_image_url = qrPath.startsWith('http') ? qrPath : base ? `${base}${qrPath}` : qrPath;
  return {
    amount: Number(amount) || 0,
    qr_image_url,
    bank_name: process.env.DEPOSIT_BANK_NAME || 'Ngân hàng TMCP',
    account_number: process.env.DEPOSIT_ACCOUNT_NUMBER || '0000000000',
    account_holder: process.env.DEPOSIT_ACCOUNT_HOLDER || 'THE SUN',
    transfer_note: `Coc phong ${roomNumber || ''}`.trim(),
  };
}

async function ensureHoldRequestStatusEnum() {
  return once('schema:hold_request_status', async () => {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hold_request_status') THEN
          CREATE TYPE hold_request_status AS ENUM (
            'NEW', 'CONTACTED', 'VIEW_SCHEDULED', 'DEPOSIT_PENDING', 'DEPOSITED', 'CANCELLED', 'COMPLETED'
          );
        END IF;
      END$$;
    `);
    const labels = [
      'NEW',
      'CONTACTED',
      'VIEW_SCHEDULED',
      'DEPOSIT_PENDING',
      'DEPOSITED',
      'CANCELLED',
      'COMPLETED',
    ];
    const { rows } = await pool.query(
      `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'hold_request_status'`
    );
    const existing = new Set(rows.map((r) => r.enumlabel));
    for (const label of labels) {
      if (!existing.has(label)) {
        await pool.query(`ALTER TYPE hold_request_status ADD VALUE '${label}'`);
      }
    }
  });
}

async function ensureRoomHoldRequestsTable() {
  await ensureRoomsTable();
  await ensureHoldRequestStatusEnum();
  return once('schema:room_hold_requests', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_hold_requests (
        hold_request_id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
        guest_name VARCHAR(150) NOT NULL,
        guest_phone VARCHAR(30) NOT NULL,
        preferred_view_date DATE,
        note TEXT,
        request_status hold_request_status NOT NULL DEFAULT 'NEW',
        hold_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS active_hold_request_id INTEGER`);
    await pool.query(`ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS hold_kind VARCHAR(20) NOT NULL DEFAULT 'TEMP'`);
    await pool.query(`ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS deposit_proof_url TEXT`);
    await pool.query(`ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS deposit_submitted_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ`);
    await pool.query(
      `ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS deposit_verified_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`
    );
    await pool.query(`ALTER TABLE room_hold_requests ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE room_hold_requests ALTER COLUMN guest_phone DROP NOT NULL`);
  });
}

function parseGuestContact(body) {
  const phoneRaw = String(body?.guest_phone || '').trim();
  const emailRaw = normalizeEmail(body?.guest_email || body?.email || '');
  const phone = phoneRaw && normalizePhoneDigits(phoneRaw).length >= 8 ? phoneRaw : null;
  const email = isValidEmail(emailRaw) ? emailRaw : null;

  if (!phone && !email) {
    return { error: 'Vui lòng nhập SĐT/Zalo hoặc email (ít nhất một)' };
  }
  if (phoneRaw && !phone && !email) {
    return { error: 'SĐT/Zalo không hợp lệ (tối thiểu 8 số) hoặc nhập email' };
  }
  return { phone, email };
}

/** Tự mở phòng: giữ tạm 15p hết hạn; đặt cọc không tự mở (chờ admin). */
async function expireStaleRoomHolds() {
  await ensureRoomHoldRequestsTable();
  const expired = await pool.query(
    `SELECT h.hold_request_id, h.room_id
     FROM room_hold_requests h
     JOIN rooms r ON r.active_hold_request_id = h.hold_request_id AND r.room_id = h.room_id
     WHERE r.status = 'HELD'::room_status
       AND COALESCE(h.hold_kind, 'TEMP') = 'TEMP'
       AND h.hold_until IS NOT NULL
       AND h.hold_until < NOW()
       AND h.deposit_submitted_at IS NULL
       AND h.request_status NOT IN ('CANCELLED', 'COMPLETED', 'DEPOSIT_PENDING', 'DEPOSITED')`
  );
  const client = await pool.connect();
  try {
    for (const row of expired.rows) {
      await client.query('BEGIN');
      await releaseRoomHold(client, row.hold_request_id, row.room_id);
      await client.query('COMMIT');
    }
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (err) {}
    console.error('expireStaleRoomHolds:', e);
  } finally {
    client.release();
  }
}

function addMinutesFromNow(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + Number(minutes || TEMP_HOLD_MINUTES));
  return d;
}

function addDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 3));
  return d;
}

async function releaseRoomHold(client, holdRequestId, roomId) {
  await client.query(
    `UPDATE room_hold_requests
     SET request_status = 'CANCELLED'::hold_request_status,
         hold_until = NULL,
         updated_at = NOW()
     WHERE hold_request_id = $1`,
    [holdRequestId]
  );
  await client.query(
    `UPDATE rooms
     SET status = 'AVAILABLE'::room_status,
         hold_until = NULL,
         active_hold_request_id = NULL,
         updated_at = NOW()
     WHERE room_id = $1
       AND (active_hold_request_id = $2 OR active_hold_request_id IS NULL)`,
    [roomId, holdRequestId]
  );
}

async function lockRoomForHold(client, { roomId, holdRequestId, holdUntil, holdKind }) {
  await client.query(
    `UPDATE room_hold_requests
     SET hold_until = $1,
         hold_kind = $2,
         updated_at = NOW()
     WHERE hold_request_id = $3`,
    [holdUntil, holdKind, holdRequestId]
  );
  await client.query(
    `UPDATE room_hold_requests
     SET request_status = 'CANCELLED'::hold_request_status,
         updated_at = NOW()
     WHERE room_id = $1
       AND hold_request_id <> $2
       AND request_status NOT IN ('CANCELLED', 'COMPLETED')`,
    [roomId, holdRequestId]
  );
  await client.query(
    `UPDATE rooms
     SET status = 'HELD'::room_status,
         hold_until = $1,
         active_hold_request_id = $2,
         updated_at = NOW()
     WHERE room_id = $3`,
    [holdUntil, holdRequestId, roomId]
  );
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function usernameFromEmail(email) {
  const base = String(email).split('@')[0].replace(/[^a-z0-9_]/gi, '_').slice(0, 50);
  return base || 'tenant';
}

function suggestEmailFromPhone(phone) {
  const digits = normalizePhoneDigits(phone).slice(-9) || String(Date.now()).slice(-9);
  return `khach.${digits}@thesun-guest.local`;
}

function defaultContractDates() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

async function loadHoldWithRoom(client, holdRequestId) {
  const res = await client.query(
    `SELECT h.*,
            r.room_id,
            r.room_number,
            r.floor,
            r.area,
            r.max_tenants,
            r.price,
            r.status AS room_status,
            r.description,
            r.room_type,
            r.hold_until AS room_hold_until,
            r.active_hold_request_id
     FROM room_hold_requests h
     JOIN rooms r ON r.room_id = h.room_id
     WHERE h.hold_request_id = $1
     LIMIT 1`,
    [holdRequestId]
  );
  return res.rowCount ? res.rows[0] : null;
}

async function findTenantByEmail(client, email) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return null;
  const res = await client.query(
    `SELECT t.tenant_id, t.user_id, t.room_id, t.phone,
            u.full_name, u.email, u.is_active,
            r.room_number AS tenant_room_number
     FROM tenants t
     JOIN users u ON u.user_id = t.user_id
     LEFT JOIN rooms r ON r.room_id = t.room_id
     WHERE lower(trim(u.email)) = $1
     ORDER BY t.tenant_id DESC
     LIMIT 1`,
    [normalized]
  );
  return res.rowCount ? res.rows[0] : null;
}

async function findTenantByPhone(client, phone) {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 8) return null;
  const tail = digits.slice(-9);
  const res = await client.query(
    `SELECT t.tenant_id, t.user_id, t.room_id, t.phone,
            u.full_name, u.email, u.is_active,
            r.room_number AS tenant_room_number
     FROM tenants t
     JOIN users u ON u.user_id = t.user_id
     LEFT JOIN rooms r ON r.room_id = t.room_id
     WHERE regexp_replace(COALESCE(t.phone, ''), '\\D', '', 'g') = $1
        OR regexp_replace(COALESCE(t.phone, ''), '\\D', '', 'g') LIKE '%' || $1
     ORDER BY t.tenant_id DESC
     LIMIT 1`,
    [tail]
  );
  return res.rowCount ? res.rows[0] : null;
}

async function resolveTenantFromHold(client, hold) {
  const email = hold.guest_email ? normalizeEmail(hold.guest_email) : null;
  const phone = hold.guest_phone ? String(hold.guest_phone).trim() : null;
  if (email) {
    const byEmail = await findTenantByEmail(client, email);
    if (byEmail) return byEmail;
  }
  if (phone) {
    const byPhone = await findTenantByPhone(client, phone);
    if (byPhone) return byPhone;
  }
  return null;
}

function formatRoomForPrefill(row) {
  const price = row.price !== null ? Number(row.price) : 0;
  return {
    room_id: row.room_id,
    room_number: row.room_number,
    floor: row.floor,
    area: row.area != null ? Number(row.area) : null,
    max_tenants: row.max_tenants,
    price,
    status: String(row.room_status || '').toUpperCase(),
    description: row.description,
    room_type: row.room_type,
    hold_until: row.room_hold_until,
  };
}

function buildPrefillPayload(hold, tenantRow) {
  const room = formatRoomForPrefill(hold);
  const price = room.price || 0;
  const dates = defaultContractDates();
  const holdEmail = hold.guest_email ? normalizeEmail(hold.guest_email) : null;
  const holdPhone = hold.guest_phone ? String(hold.guest_phone).trim() : null;
  let suggestedEmail = tenantRow ? tenantRow.email : null;
  if (!suggestedEmail) {
    if (holdEmail) suggestedEmail = holdEmail;
    else if (holdPhone) suggestedEmail = suggestEmailFromPhone(holdPhone);
  }
  const notify_channel = pickCredentialNotifyChannel(holdEmail, holdPhone);
  return {
    hold_request_id: hold.hold_request_id,
    guest_name: hold.guest_name,
    guest_phone: holdPhone,
    guest_email: holdEmail,
    notify_channel,
    preferred_view_date: hold.preferred_view_date,
    note: hold.note,
    request_status: String(hold.request_status || 'NEW').toUpperCase(),
    room,
    tenant: tenantRow
      ? {
          tenant_id: tenantRow.tenant_id,
          user_id: tenantRow.user_id,
          full_name: tenantRow.full_name,
          email: tenantRow.email,
          phone: tenantRow.phone,
          room_number: tenantRow.tenant_room_number,
        }
      : null,
    will_create_tenant: !tenantRow,
    suggested_email: suggestedEmail,
    rent_price: price,
    deposit: price,
    default_start_date: dates.start_date,
    default_end_date: dates.end_date,
  };
}

/** Thông tin chuyển khoản / QR đặt cọc */
router.get('/public/deposit-config', async (req, res) => {
  try {
    const roomId = Number(req.query?.room_id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'room_id không hợp lệ' });
    }
    const roomRes = await pool.query(
      `SELECT room_id, room_number, price FROM rooms WHERE room_id = $1 LIMIT 1`,
      [roomId]
    );
    if (!roomRes.rowCount) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy phòng' });
    }
    const room = roomRes.rows[0];
    return res.json({
      ok: true,
      deposit: getDepositConfigFromEnv(room.room_number, room.price),
    });
  } catch (err) {
    console.error('deposit-config:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Khách giữ chỗ / đặt cọc — khóa phòng ngay (TEMP: 15 phút; DEPOSIT: đến khi admin mở) */
router.post('/public', async (req, res) => {
  const client = await pool.connect();
  try {
    await expireStaleRoomHolds();
    const roomId = Number(req.body?.room_id);
    const guestName = String(req.body?.guest_name || '').trim();
    const contact = parseGuestContact(req.body);
    if (contact.error) {
      return res.status(400).json({ ok: false, message: contact.error });
    }
    const { phone: guestPhone, email: guestEmail } = contact;
    const note = req.body?.note != null ? String(req.body.note).trim() || null : null;
    const holdModeRaw = String(req.body?.hold_mode || 'temp').toLowerCase();
    const holdKind = holdModeRaw === 'deposit' ? 'DEPOSIT' : 'TEMP';
    let preferredViewDate = req.body?.preferred_view_date || null;
    if (preferredViewDate) {
      const m = String(preferredViewDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
      preferredViewDate = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    }

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ ok: false, message: 'room_id không hợp lệ' });
    }
    if (!guestName || guestName.length < 2) {
      return res.status(400).json({ ok: false, message: 'Vui lòng nhập họ tên' });
    }
    await client.query('BEGIN');
    const roomRes = await client.query(
      `SELECT room_id, room_number, status, price FROM rooms WHERE room_id = $1 FOR UPDATE`,
      [roomId]
    );
    if (!roomRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Không tìm thấy phòng' });
    }
    const room = roomRes.rows[0];
    const st = String(room.status || '').toUpperCase();
    if (st !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        ok: false,
        message: st === 'HELD' ? 'Phòng đang được giữ cho khách khác' : 'Phòng hiện không nhận giữ chỗ',
      });
    }

    const holdUntil = holdKind === 'TEMP' ? addMinutesFromNow(TEMP_HOLD_MINUTES) : null;

    const ins = await client.query(
      `INSERT INTO room_hold_requests
         (room_id, guest_name, guest_phone, guest_email, preferred_view_date, note, request_status, hold_kind, hold_until)
       VALUES ($1, $2, $3, $4, $5::date, $6, 'NEW'::hold_request_status, $7, $8)
       RETURNING hold_request_id`,
      [roomId, guestName, guestPhone, guestEmail, preferredViewDate, note, holdKind, holdUntil]
    );
    const holdRequestId = ins.rows[0].hold_request_id;

    await lockRoomForHold(client, {
      roomId,
      holdRequestId,
      holdUntil,
      holdKind,
    });

    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status
       FROM room_hold_requests h
       JOIN rooms r ON r.room_id = h.room_id
       WHERE h.hold_request_id = $1`,
      [holdRequestId]
    );

    const deposit =
      holdKind === 'DEPOSIT' ? getDepositConfigFromEnv(room.room_number, room.price) : null;

    return res.status(201).json({
      ok: true,
      message:
        holdKind === 'DEPOSIT'
          ? 'Phòng đã được giữ. Vui lòng chuyển khoản và tải ảnh minh chứng.'
          : `Phòng đã được giữ ${TEMP_HOLD_MINUTES} phút. Đội ngũ The Sun sẽ liên hệ bạn sớm.`,
      request: {
        ...formatHoldRow(detail.rows[0]),
        room_status: 'HELD',
      },
      hold_minutes: holdKind === 'TEMP' ? TEMP_HOLD_MINUTES : null,
      deposit,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('room hold public create:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/** Khách gửi ảnh minh chứng đặt cọc */
router.post('/public/:id/deposit-proof', holdDepositUpload.single('proof'), async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'Vui lòng tải ảnh minh chứng chuyển khoản' });
    }

    const proofUrl = `/uploads/hold-deposit-proofs/${req.file.filename}`;

    await client.query('BEGIN');
    const row = await client.query(
      `SELECT h.*, r.room_id, r.status AS room_status, r.room_number
       FROM room_hold_requests h
       JOIN rooms r ON r.room_id = h.room_id
       WHERE h.hold_request_id = $1
       FOR UPDATE`,
      [id]
    );
    if (!row.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = row.rows[0];
    if (String(hold.hold_kind || '').toUpperCase() !== 'DEPOSIT') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Yêu cầu này không phải đặt cọc' });
    }
    if (['CANCELLED', 'COMPLETED'].includes(String(hold.request_status))) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Yêu cầu đã kết thúc' });
    }

    await client.query(
      `UPDATE room_hold_requests
       SET deposit_proof_url = $1,
           deposit_submitted_at = NOW(),
           request_status = 'DEPOSIT_PENDING'::hold_request_status,
           hold_until = NULL,
           updated_at = NOW()
       WHERE hold_request_id = $2`,
      [proofUrl, id]
    );
    await client.query(
      `UPDATE rooms
       SET hold_until = NULL,
           updated_at = NOW()
       WHERE room_id = $1 AND active_hold_request_id = $2`,
      [hold.room_id, id]
    );
    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status
       FROM room_hold_requests h
       JOIN rooms r ON r.room_id = h.room_id
       WHERE h.hold_request_id = $1`,
      [id]
    );

    return res.json({
      ok: true,
      message: 'Đã nhận minh chứng đặt cọc. Trạng thái: Đã cọc — chờ admin xác minh.',
      request: formatHoldRow(detail.rows[0]),
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('deposit-proof:', err);
    return res.status(500).json({ ok: false, message: err.message || 'internal error' });
  } finally {
    client.release();
  }
});

/** Admin: danh sách yêu cầu giữ chỗ */
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    await expireStaleRoomHolds();
    const statusFilter = req.query.status ? String(req.query.status).trim().toUpperCase() : null;
    const params = [];
    let sql = `
      SELECT h.*, r.room_number, r.status AS room_status, r.hold_until AS room_hold_until
      FROM room_hold_requests h
      JOIN rooms r ON r.room_id = h.room_id`;
    if (statusFilter && REQUEST_STATUSES.includes(statusFilter)) {
      params.push(statusFilter);
      sql += ` WHERE h.request_status = $1::hold_request_status`;
    }
    sql += ` ORDER BY
      CASE h.request_status
        WHEN 'NEW' THEN 0
        WHEN 'DEPOSIT_PENDING' THEN 1
        WHEN 'CONTACTED' THEN 2
        WHEN 'VIEW_SCHEDULED' THEN 3
        WHEN 'DEPOSITED' THEN 4
        ELSE 9
      END,
      h.created_at DESC`;

    const result = await pool.query(sql, params);
    return res.json({
      ok: true,
      requests: result.rows.map((row) => ({
        ...formatHoldRow(row),
        room_status: String(row.room_status || '').toUpperCase(),
        room_hold_until: row.room_hold_until,
      })),
      status_labels: REQUEST_STATUS_LABELS,
    });
  } catch (err) {
    console.error('room hold admin list:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Admin: cập nhật trạng thái yêu cầu */
router.patch('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    const nextStatus = String(req.body?.request_status || '').trim().toUpperCase();
    if (!REQUEST_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ ok: false, message: 'request_status không hợp lệ' });
    }

    const result = await pool.query(
      `UPDATE room_hold_requests
       SET request_status = $1::hold_request_status,
           note = COALESCE($2, note),
           updated_at = NOW()
       WHERE hold_request_id = $3
       RETURNING *`,
      [nextStatus, req.body?.note != null ? String(req.body.note).trim() || null : null, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }

    const row = await pool.query(
      `SELECT h.*, r.room_number FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    return res.json({ ok: true, request: formatHoldRow(row.rows[0]) });
  } catch (err) {
    console.error('room hold patch:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Admin: xác minh minh chứng đặt cọc */
router.post('/admin/:id/verify-deposit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    const result = await pool.query(
      `UPDATE room_hold_requests
       SET request_status = 'DEPOSITED'::hold_request_status,
           deposit_verified_at = NOW(),
           deposit_verified_by = $1,
           updated_at = NOW()
       WHERE hold_request_id = $2
         AND request_status = 'DEPOSIT_PENDING'::hold_request_status
       RETURNING *`,
      [req.auth?.sub || null, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy hoặc chưa gửi minh chứng cọc' });
    }
    const row = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    return res.json({
      ok: true,
      message: 'Đã xác minh đặt cọc',
      request: formatHoldRow(row.rows[0]),
    });
  } catch (err) {
    console.error('verify-deposit:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Admin: từ chối minh chứng cọc — mở lại phòng */
router.post('/admin/:id/reject-deposit', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    await client.query('BEGIN');
    const row = await client.query(
      `SELECT h.*, r.room_id FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    if (!row.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = row.rows[0];
    await releaseRoomHold(client, id, hold.room_id);
    await client.query(
      `UPDATE room_hold_requests SET note = COALESCE($1, note) WHERE hold_request_id = $2`,
      [req.body?.note != null ? String(req.body.note).trim() : 'Admin từ chối minh chứng cọc', id]
    );
    await client.query('COMMIT');
    const detail = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    return res.json({
      ok: true,
      message: 'Đã từ chối cọc và mở lại phòng',
      request: formatHoldRow(detail.rows[0]),
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('reject-deposit:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/** Admin: giữ phòng cho khách (AVAILABLE → HELD) */
router.post('/admin/:id/hold-room', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const holdDays = Math.min(7, Math.max(1, Number(req.body?.hold_days) || 3));
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    await client.query('BEGIN');
    const reqRow = await client.query(
      `SELECT h.*, r.status AS room_status, r.room_number
       FROM room_hold_requests h
       JOIN rooms r ON r.room_id = h.room_id
       WHERE h.hold_request_id = $1
       FOR UPDATE`,
      [id]
    );
    if (!reqRow.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = reqRow.rows[0];
    const roomStatus = String(hold.room_status || '').toUpperCase();
    if (roomStatus !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Chỉ giữ được phòng đang Còn trống' });
    }
    if (['CANCELLED', 'COMPLETED'].includes(String(hold.request_status))) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Yêu cầu đã hủy hoặc hoàn tất' });
    }

    const holdUntil = addDaysFromNow(holdDays);

    await client.query(
      `UPDATE room_hold_requests
       SET hold_until = $1,
           hold_kind = 'DEPOSIT',
           request_status = 'DEPOSITED'::hold_request_status,
           deposit_verified_at = COALESCE(deposit_verified_at, NOW()),
           deposit_verified_by = COALESCE(deposit_verified_by, $3),
           updated_at = NOW()
       WHERE hold_request_id = $2`,
      [holdUntil, id, req.auth?.sub || null]
    );
    await client.query(
      `UPDATE rooms
       SET status = 'HELD'::room_status,
           hold_until = $1,
           active_hold_request_id = $2,
           updated_at = NOW()
       WHERE room_id = $3`,
      [holdUntil, id, hold.room_id]
    );
    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status, r.hold_until AS room_hold_until
       FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    return res.json({
      ok: true,
      message: `Đã giữ phòng ${hold.room_number} đến ${holdUntil.toLocaleDateString('vi-VN')}`,
      request: {
        ...formatHoldRow(detail.rows[0]),
        room_status: 'HELD',
        room_hold_until: detail.rows[0].room_hold_until,
      },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('room hold-room:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/** Admin: hủy giữ phòng (HELD → AVAILABLE) */
router.post('/admin/:id/release-hold', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    await client.query('BEGIN');
    const reqRow = await client.query(
      `SELECT h.*, r.room_id, r.status AS room_status, r.room_number, r.active_hold_request_id
       FROM room_hold_requests h
       JOIN rooms r ON r.room_id = h.room_id
       WHERE h.hold_request_id = $1
       FOR UPDATE`,
      [id]
    );
    if (!reqRow.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = reqRow.rows[0];

    await client.query(
      `UPDATE room_hold_requests
       SET request_status = 'CANCELLED'::hold_request_status,
           hold_until = NULL,
           updated_at = NOW()
       WHERE hold_request_id = $1`,
      [id]
    );

    if (Number(hold.active_hold_request_id) === id || String(hold.room_status).toUpperCase() === 'HELD') {
      await client.query(
        `UPDATE rooms
         SET status = 'AVAILABLE'::room_status,
             hold_until = NULL,
             active_hold_request_id = NULL,
             updated_at = NOW()
         WHERE room_id = $1`,
        [hold.room_id]
      );
    }

    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT h.*, r.room_number, r.status AS room_status FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    return res.json({
      ok: true,
      message: 'Đã hủy giữ chỗ, phòng trở lại Còn trống',
      request: formatHoldRow(detail.rows[0]),
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('room release-hold:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/** Admin: dữ liệu điền sẵn khi tạo HĐ từ yêu cầu giữ chỗ */
router.get('/admin/:id/contract-prefill', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    await ensureRoomHoldRequestsTable();
    const hold = await loadHoldWithRoom(pool, id);
    if (!hold) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const tenantRow = await resolveTenantFromHold(pool, hold);
    return res.json({ ok: true, prefill: buildPrefillPayload(hold, tenantRow) });
  } catch (err) {
    console.error('room hold contract-prefill:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * Admin: tạo/cập nhật khách thuê + hợp đồng từ giữ chỗ.
 * Admin chỉ cần gửi start_date, end_date (và email/mật khẩu nếu tạo tài khoản mới).
 */
router.post('/admin/:id/finalize-contract', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    const start = normalizeDate(req.body?.start_date);
    const end = normalizeDate(req.body?.end_date);
    if (!start || !end) {
      return res.status(400).json({ ok: false, message: 'start_date và end_date là bắt buộc' });
    }
    if (end < start) {
      return res.status(400).json({ ok: false, message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }

    await ensureRoomHoldRequestsTable();
    await ensureUsersTable();
    await ensureTenantsTable();
    await ensureContractsTable();
    await ensureNotificationsTable();

    await client.query('BEGIN');

    const hold = await loadHoldWithRoom(client, id);
    if (!hold) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }

    const roomStatus = String(hold.room_status || '').toUpperCase();
    if (!['AVAILABLE', 'HELD', 'RENTED'].includes(roomStatus)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Phòng không ở trạng thái cho phép tạo hợp đồng' });
    }

    const activeRoom = await client.query(
      `SELECT 1 FROM contracts WHERE room_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [hold.room_id]
    );
    if (activeRoom.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Phòng đã có hợp đồng đang hiệu lực' });
    }

    const roomPrice = Number(hold.price || 0);
    const rentVal = Number(req.body?.rent_price || roomPrice || 0);
    const depositVal = Number(req.body?.deposit || rentVal || roomPrice || 0);
    if (!(rentVal > 0) || !(depositVal > 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Giá thuê và tiền cọc phải lớn hơn 0' });
    }

    const holdEmail = hold.guest_email ? normalizeEmail(hold.guest_email) : null;
    const holdPhone = hold.guest_phone ? String(hold.guest_phone).trim() : null;

    let tenantRow = await resolveTenantFromHold(client, hold);
    let createdCredentials = null;

    if (!tenantRow) {
      const rawEmail =
        req.body?.email && isValidEmail(req.body.email)
          ? normalizeEmail(req.body.email)
          : holdEmail || (holdPhone ? suggestEmailFromPhone(holdPhone) : null);
      const normalizedEmail = normalizeEmail(rawEmail);
      if (!isValidEmail(normalizedEmail)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, message: 'Cần email hợp lệ để tạo tài khoản (guest phải có email hoặc SĐT)' });
      }

      let password = String(req.body?.password || '').trim();
      if (!password) {
        const tail = normalizePhoneDigits(holdPhone).slice(-4) || '0000';
        password = `TheSun@${tail}`;
      }
      if (password.length < 6) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, message: 'Mật khẩu tối thiểu 6 ký tự' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const username = usernameFromEmail(normalizedEmail);
      const guestName = String(hold.guest_name || '').trim() || 'Khách thuê';

      const userResult = await client.query(
        `INSERT INTO users (username, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'TENANT')
         RETURNING user_id, full_name, email`,
        [username, guestName, normalizedEmail, passwordHash]
      );
      const createdUser = userResult.rows[0];

      const tenantIns = await client.query(
        `INSERT INTO tenants (user_id, phone, room_id)
         VALUES ($1, $2, $3)
         RETURNING tenant_id, user_id, phone, room_id`,
        [createdUser.user_id, holdPhone || null, hold.room_id]
      );
      tenantRow = {
        ...tenantIns.rows[0],
        full_name: createdUser.full_name,
        email: createdUser.email,
      };
      createdCredentials = { email: normalizedEmail, password };
    } else {
      await client.query(
        `UPDATE tenants SET room_id = $1, phone = COALESCE(NULLIF(TRIM($2::text), ''), phone), updated_at = NOW()
         WHERE tenant_id = $3`,
        [hold.room_id, holdPhone, tenantRow.tenant_id]
      );
      if (holdEmail) {
        await client.query(
          `UPDATE users SET email = $1, updated_at = NOW() WHERE user_id = $2 AND lower(trim(email)) LIKE '%@thesun-guest.local'`,
          [holdEmail, tenantRow.user_id]
        );
      }
      if (String(hold.guest_name || '').trim()) {
        await client.query(
          `UPDATE users SET full_name = $1, updated_at = NOW() WHERE user_id = $2`,
          [String(hold.guest_name).trim(), tenantRow.user_id]
        );
      }
    }

    const notes =
      req.body?.notes != null
        ? String(req.body.notes)
        : `Tạo từ yêu cầu giữ chỗ #${id}${hold.note ? ` — ${hold.note}` : ''}`;

    const contractResult = await client.query(
      `INSERT INTO contracts (tenant_id, room_id, start_date, end_date, rent_price, monthly_rent, deposit, status, notes, created_by)
       VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, 'ACTIVE', $8, $9)
       RETURNING contract_id, tenant_id, room_id, start_date, end_date, rent_price, deposit, status, notes`,
      [
        tenantRow.tenant_id,
        hold.room_id,
        start,
        end,
        rentVal,
        rentVal,
        depositVal,
        notes,
        req.auth?.sub || null,
      ]
    );
    const contract = contractResult.rows[0];

    const titleForTenant = 'Hợp đồng mới';
    const bodyForTenant = `Hợp đồng #${contract.contract_id} cho phòng ${hold.room_number} đã được tạo. Bắt đầu: ${contract.start_date}, kết thúc: ${contract.end_date}.`;
    if (tenantRow.user_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by) VALUES ($1, $2, $3, $4)`,
        [Number(tenantRow.user_id), titleForTenant, bodyForTenant, req.auth?.sub || null]
      );
    }
    if (req.auth?.sub) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by) VALUES ($1, $2, $3, $4)`,
        [
          Number(req.auth.sub),
          'Hợp đồng đã tạo',
          `Đã tạo hợp đồng #${contract.contract_id} cho phòng ${hold.room_number} (giữ chỗ #${id}).`,
          Number(req.auth.sub),
        ]
      );
    }

    await client.query(
      `UPDATE room_hold_requests
       SET request_status = 'COMPLETED'::hold_request_status, hold_until = NULL, updated_at = NOW()
       WHERE hold_request_id = $1`,
      [id]
    );
    await client.query(
      `UPDATE rooms
       SET status = 'RENTED'::room_status,
           hold_until = NULL,
           active_hold_request_id = NULL,
           updated_at = NOW()
       WHERE room_id = $1`,
      [hold.room_id]
    );

    await client.query('COMMIT');

    let credentials_delivery = null;
    if (createdCredentials) {
      credentials_delivery = await deliverTenantCredentials({
        guestEmail: holdEmail,
        guestPhone: holdPhone,
        fullName: hold.guest_name,
        loginEmail: createdCredentials.email,
        password: createdCredentials.password,
        roomNumber: hold.room_number,
        contractId: contract.contract_id,
      });
    }

    const notifyLabel =
      credentials_delivery?.channel === 'email'
        ? 'email'
        : credentials_delivery?.channel === 'sms'
          ? 'SMS/Zalo'
          : null;

    return res.status(201).json({
      ok: true,
      message: notifyLabel
        ? `Đã tạo hợp đồng #${contract.contract_id}. Đã gửi tài khoản qua ${notifyLabel}.`
        : `Đã tạo hợp đồng #${contract.contract_id} cho ${hold.guest_name} — phòng ${hold.room_number}`,
      contract: {
        ...contract,
        room_number: hold.room_number,
        full_name: hold.guest_name,
      },
      tenant: {
        tenant_id: tenantRow.tenant_id,
        user_id: tenantRow.user_id,
        full_name: tenantRow.full_name || hold.guest_name,
        email: holdEmail || tenantRow.email,
        phone: holdPhone,
      },
      created_credentials: createdCredentials,
      credentials_delivery,
      hold_request_id: id,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Email đã tồn tại — nhập email khác cho khách mới' });
    }
    if (err.code === '23514' && String(err.constraint || '').includes('email')) {
      return res.status(400).json({
        ok: false,
        message: 'Email không hợp lệ theo quy tắc hệ thống. Dùng địa chỉ email đúng định dạng (vd: ten@gmail.com hoặc email trường .edu.vn).',
      });
    }
    console.error('room hold finalize-contract:', err);
    return res.status(500).json({
      ok: false,
      message: process.env.NODE_ENV === 'development' ? err.message || 'internal error' : 'internal error',
    });
  } finally {
    client.release();
  }
});

/** Admin: khách thuê — phòng → RENTED (hợp đồng tạo thủ công ở module Hợp đồng) */
router.post('/admin/:id/mark-rented', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }

    await client.query('BEGIN');
    const reqRow = await client.query(
      `SELECT h.*, r.room_id, r.room_number FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    if (!reqRow.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = reqRow.rows[0];

    await client.query(
      `UPDATE room_hold_requests
       SET request_status = 'COMPLETED'::hold_request_status, hold_until = NULL, updated_at = NOW()
       WHERE hold_request_id = $1`,
      [id]
    );
    await client.query(
      `UPDATE rooms
       SET status = 'RENTED'::room_status,
           hold_until = NULL,
           active_hold_request_id = NULL,
           updated_at = NOW()
       WHERE room_id = $1`,
      [hold.room_id]
    );
    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: `Phòng ${hold.room_number} đã chuyển Đã thuê. Tạo hợp đồng tại Quản lý hợp đồng.`,
      room_id: hold.room_id,
      request_id: id,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('room mark-rented:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/** Admin: xóa vĩnh viễn yêu cầu giữ chỗ */
router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid id' });
    }
    await client.query('BEGIN');
    const row = await client.query(
      `SELECT h.*, r.room_id, r.active_hold_request_id FROM room_hold_requests h JOIN rooms r ON r.room_id = h.room_id WHERE h.hold_request_id = $1`,
      [id]
    );
    if (!row.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    const hold = row.rows[0];
    if (hold.active_hold_request_id === id) {
      await releaseRoomHold(client, id, hold.room_id);
    }
    await client.query(`DELETE FROM room_hold_requests WHERE hold_request_id = $1`, [id]);
    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Đã xóa yêu cầu giữ chỗ' });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('room hold delete:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

module.exports = router;
module.exports.ensureRoomHoldRequestsTable = ensureRoomHoldRequestsTable;
module.exports.expireStaleRoomHolds = expireStaleRoomHolds;
module.exports.REQUEST_STATUS_LABELS = REQUEST_STATUS_LABELS;
