const pool = require('../config/db');
const { once } = require('./_schemaCache');

/**
 * Ngày dạng YYYY-MM-DD theo đúng năm/tháng/ngày lịch (không dùng Date#toISOString — tránh lệch múi giờ VN).
 */
function formatCalendarDateString(year, month1to12, day = 1) {
  const y = Number(year);
  const m = Number(month1to12);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(d) || d < 1 || d > 31) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Thêm từng nhãn enum còn thiếu (DB cũ có thể đã tạo type với ít giá trị hơn code hiện tại).
 * Chỉ dùng typeName hợp lệ (chữ, số, gạch dưới) — tránh SQL injection.
 */
async function ensureEnumMissingValues(typeName, values) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(typeName)) {
    throw new Error(`ensureEnumMissingValues: invalid typeName ${typeName}`);
  }
  const { rows } = await pool.query(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1`,
    [typeName]
  );
  const existing = new Set(rows.map((r) => String(r.enumlabel)));
  for (const raw of values) {
    const label = String(raw);
    if (existing.has(label)) continue;
    const escaped = label.replace(/'/g, "''");
    try {
      await pool.query(`ALTER TYPE ${typeName} ADD VALUE '${escaped}'`);
    } catch (err) {
      // Trùng nhãn / chạy song song — an toàn bỏ qua
      if (err.code === '42710' || String(err.message || '').includes('already exists')) {
        continue;
      }
      throw err;
    }
    existing.add(label);
  }
}

async function ensureEnumType(typeName, values) {
  return once(`schema:enum:${typeName}`, async () => {
    const escaped = values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
          CREATE TYPE ${typeName} AS ENUM (${escaped});
        END IF;
      END$$;
    `);
    await ensureEnumMissingValues(typeName, values);
  });
}

async function ensureRoomsTable() {
  return once('schema:rooms', async () => {
    await ensureEnumType('room_status', ['AVAILABLE', 'RENTED', 'MAINTENANCE']);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id SERIAL PRIMARY KEY,
        room_number VARCHAR(50) NOT NULL UNIQUE,
        floor INTEGER,
        area NUMERIC,
        max_tenants INTEGER NOT NULL DEFAULT 1,
        price NUMERIC,
        status room_status NOT NULL DEFAULT 'AVAILABLE',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });
}

async function ensureUsersTable() {
  return once('schema:users', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TENANT')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);

    await pool.query(`
      UPDATE users
      SET role = 'TENANT'
      WHERE role IS NULL
    `);

    await pool.query(`
      UPDATE users
      SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), email)
      WHERE full_name IS NULL OR TRIM(full_name) = ''
    `);

    await pool.query(`
      UPDATE users
      SET username = COALESCE(NULLIF(TRIM(username), ''), SPLIT_PART(email, '@', 1))
      WHERE username IS NULL OR TRIM(username) = ''
    `);
  });
}

async function ensureTenantsTable() {
  return once('schema:tenants', async () => {
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
  });
}

module.exports = {
  ensureEnumType,
  ensureRoomsTable,
  ensureUsersTable,
  ensureTenantsTable,
  formatCalendarDateString,
};
