#!/usr/bin/env node
/**
 * Thêm ~10 phòng demo cho trang guest (đủ loại: thường / gác lửng / ban công).
 * Chạy: npm run seed-guest-rooms
 * An toàn: ON CONFLICT (room_number) DO NOTHING — không ghi đè phòng đã có.
 */
const pool = require('../src/config/db');

const SHOWCASE_ROOMS = [
  {
    room_number: 'A101',
    floor: 1,
    area: 20,
    max_tenants: 1,
    price: 1950000,
    status: 'AVAILABLE',
    description: 'Phòng thường studio gọn, nội thất cơ bản, yên tĩnh tầng 1.',
  },
  {
    room_number: 'A102',
    floor: 1,
    area: 22,
    max_tenants: 2,
    price: 2200000,
    status: 'AVAILABLE',
    description: 'Phòng thường đầy đủ tiện nghi, bàn học + tủ lạnh.',
  },
  {
    room_number: 'A103',
    floor: 1,
    area: 26,
    max_tenants: 2,
    price: 2850000,
    status: 'AVAILABLE',
    description: 'Phòng gác lửng loft, ngủ trên gác, sinh hoạt tầng dưới rộng.',
  },
  {
    room_number: 'A104',
    floor: 1,
    area: 28,
    max_tenants: 2,
    price: 3100000,
    status: 'AVAILABLE',
    description: 'Phòng gác lửng cao, trần 4m, kệ sách và đèn led ấm.',
  },
  {
    room_number: 'A105',
    floor: 1,
    area: 24,
    max_tenants: 2,
    price: 2650000,
    status: 'AVAILABLE',
    description: 'Phòng ban công hướng Đông, sáng sớm, thoáng mát.',
  },
  {
    room_number: 'A106',
    floor: 1,
    area: 27,
    max_tenants: 2,
    price: 2950000,
    status: 'AVAILABLE',
    description: 'Phòng ban công riêng, cửa kính lớn, phơi đồ tiện.',
  },
  {
    room_number: 'B301',
    floor: 3,
    area: 19,
    max_tenants: 1,
    price: 2100000,
    status: 'AVAILABLE',
    description: 'Phòng thường cho 1 người, gần thang máy, wifi riêng tầng.',
  },
  {
    room_number: 'B302',
    floor: 3,
    area: 25,
    max_tenants: 2,
    price: 2750000,
    status: 'AVAILABLE',
    description: 'Phòng gác lửng tầng 3, view hẻm cây, máy lạnh Inverter.',
  },
  {
    room_number: 'B303',
    floor: 3,
    area: 30,
    max_tenants: 2,
    price: 3200000,
    status: 'AVAILABLE',
    description: 'Phòng ban công rộng 30m², sofa + bếp mini, đầy đủ nội thất.',
  },
  {
    room_number: 'B304',
    floor: 3,
    area: 23,
    max_tenants: 2,
    price: 2400000,
    status: 'AVAILABLE',
    description: 'Phòng thường 2 người, máy giặt chung tầng, an ninh 24/7.',
  },
];

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
  try {
    await ensureRoomSchema();

    let inserted = 0;
    let skipped = 0;

    for (const r of SHOWCASE_ROOMS) {
      const result = await pool.query(
        `INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description)
         VALUES ($1, $2, $3, $4, $5, $6::room_status, $7)
         ON CONFLICT (room_number) DO NOTHING
         RETURNING room_id`,
        [r.room_number, r.floor, r.area, r.max_tenants, r.price, r.status, r.description]
      );
      if (result.rowCount > 0) inserted += 1;
      else skipped += 1;
    }

    const summary = await pool.query(
      `SELECT
         COUNT(*)::int AS rooms_total,
         COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS rooms_available
       FROM rooms`
    );

    console.log('The Sun — seed phòng guest showcase');
    console.log(`  Mẫu trong script: ${SHOWCASE_ROOMS.length}`);
    console.log(`  Thêm mới: ${inserted}`);
    console.log(`  Đã tồn tại (bỏ qua): ${skipped}`);
    console.log('  Tổng DB:', summary.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('seed-guest-showcase-rooms error:', err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

main();
