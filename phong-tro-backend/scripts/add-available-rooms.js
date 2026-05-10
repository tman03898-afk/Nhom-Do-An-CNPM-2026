#!/usr/bin/env node
const pool = require('../src/config/db');

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

async function main() {
  const count = Number(process.argv[2] || 10);
  if (!Number.isInteger(count) || count <= 0) {
    console.error('Usage: node scripts/add-available-rooms.js 10');
    process.exit(1);
  }

  try {
    await ensureRoomSchema();

    const existing = await pool.query(
      `SELECT room_number
       FROM rooms
       WHERE room_number LIKE 'B2%'
       ORDER BY room_number ASC`
    );
    const existingSet = new Set(existing.rows.map((r) => r.room_number));

    const roomsToInsert = [];
    // Generate B201..B299, insert first N that don't exist.
    for (let n = 201; n <= 299 && roomsToInsert.length < count; n++) {
      const roomNumber = `B${n}`;
      if (existingSet.has(roomNumber)) continue;
      const idx = roomsToInsert.length + 1;
      roomsToInsert.push({
        room_number: roomNumber,
        floor: 2,
        area: 20 + (idx % 3) * 2,
        max_tenants: 2,
        price: 2700000 + (idx % 5) * 150000,
        status: 'AVAILABLE',
        description: `Phòng trống ${idx}`,
      });
    }

    for (const r of roomsToInsert) {
      await pool.query(
        `INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description)
         VALUES ($1, $2, $3, $4, $5, $6::room_status, $7)
         ON CONFLICT (room_number) DO NOTHING`,
        [r.room_number, r.floor, r.area, r.max_tenants, r.price, r.status, r.description]
      );
    }

    const summary = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM rooms) AS rooms_total,
         (SELECT COUNT(*) FROM rooms WHERE status = 'AVAILABLE') AS rooms_available,
         (SELECT COUNT(*) FROM rooms WHERE status = 'RENTED') AS rooms_rented`
    );

    console.log(`Added available rooms (requested): ${count}`);
    console.log(`Added available rooms (inserted): ${roomsToInsert.length}`);
    console.log('DB summary:', summary.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error adding available rooms:', err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

main();

