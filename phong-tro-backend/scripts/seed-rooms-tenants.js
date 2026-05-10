#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const SALT_ROUNDS = 10;

async function ensureRoomSchema() {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE room_status AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE');
      END IF;
    END$$;
  `);

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
}

function usernameFromEmail(email) {
  return String(email).split('@')[0];
}

function makePhone(i) {
  // VN-like demo numbers, stable + unique.
  const suffix = String(10000000 + i).slice(-8);
  return `09${suffix}`;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureRoomSchema();
    await ensureUsersTable();
    await ensureTenantsTable();

    // 1) Seed 10 rooms
    const rooms = Array.from({ length: 10 }).map((_, idx) => {
      const n = idx + 1;
      const floor = n <= 5 ? 1 : 2;
      return {
        room_number: `A${String(100 + n)}`,
        floor,
        area: 18 + (n % 3) * 2,
        max_tenants: 2,
        price: 2500000 + (n % 5) * 150000,
        status: 'AVAILABLE',
        description: `Phòng demo ${n}`,
      };
    });

    for (const r of rooms) {
      await client.query(
        `INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description)
         VALUES ($1, $2, $3, $4, $5, $6::room_status, $7)
         ON CONFLICT (room_number) DO NOTHING`,
        [r.room_number, r.floor, r.area, r.max_tenants, r.price, r.status, r.description]
      );
    }

    const createdRooms = await client.query(
      `SELECT room_id, room_number
       FROM rooms
       WHERE room_number LIKE 'A1%'
       ORDER BY room_number ASC
       LIMIT 10`
    );
    const roomRows = createdRooms.rows;

    // 2) Seed 20 tenant users + tenants
    const defaultTenantPassword = 'Tenant123!';
    const passwordHash = await bcrypt.hash(defaultTenantPassword, SALT_ROUNDS);

    const tenantEmails = Array.from({ length: 20 }).map((_, idx) => `tenant${idx + 1}@gmail.com`);

    const createdTenantUserIds = [];
    for (let i = 0; i < tenantEmails.length; i++) {
      const email = tenantEmails[i];
      // DB constraint allows only letters (incl accents) + spaces, no digits.
      const suffix = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
      const fullName = `Khach Thue ${suffix}${i >= 26 ? 'A' : ''}`.trim();
      const username = usernameFromEmail(email);

      const inserted = await client.query(
        `INSERT INTO users (username, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'TENANT')
         ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
         RETURNING user_id`,
        [username, fullName, email, passwordHash]
      );
      createdTenantUserIds.push(inserted.rows[0].user_id);
    }

    // Assign all tenants to rooms in round-robin (2 tenants/room for 10 rooms).
    for (let i = 0; i < createdTenantUserIds.length; i++) {
      const userId = createdTenantUserIds[i];
      const room = roomRows.length > 0 ? roomRows[i % roomRows.length] : null;

      const roomId = room ? room.room_id : null;

      await client.query(
        `INSERT INTO tenants (user_id, phone, room_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone, room_id = EXCLUDED.room_id`,
        [userId, makePhone(i + 1), roomId]
      );

      if (roomId) {
        await client.query(
          `UPDATE rooms
           SET status = 'RENTED'::room_status, updated_at = NOW()
           WHERE room_id = $1`,
          [roomId]
        );
      }
    }

    await client.query('COMMIT');

    const summary = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM rooms) AS rooms_count,
         (SELECT COUNT(*) FROM users WHERE role = 'TENANT') AS tenants_users_count,
         (SELECT COUNT(*) FROM tenants) AS tenants_table_count`
    );

    console.log('Seed completed.');
    console.log('Rooms added (desired): 10');
    console.log('Tenants added (desired): 20');
    console.log('Default tenant password:', defaultTenantPassword);
    console.log('DB summary:', summary.rows[0]);
    process.exit(0);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    try {
      await pool.end();
    } catch (e) {}
  }
}

main();

