const pool = require('../config/db');

async function ensureEnumType(typeName, values) {
  const escaped = values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
        CREATE TYPE ${typeName} AS ENUM (${escaped});
      END IF;
    END$$;
  `);
}

async function ensureRoomsTable() {
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
}

async function ensureUsersTable() {
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
}

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

module.exports = {
  ensureEnumType,
  ensureRoomsTable,
  ensureUsersTable,
  ensureTenantsTable,
};

