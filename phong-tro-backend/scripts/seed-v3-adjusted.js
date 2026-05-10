#!/usr/bin/env node
/**
 * Seed demo data (idempotent) for current DB schema/enums.
 *
 * Notes:
 * - Uses bcrypt hash provided by user (Tenant@123).
 * - Uses current enum labels in DB:
 *   - user_role: ADMIN | STAFF | TENANT
 *   - invoice_status: UNPAID | PARTIAL | PAID
 *   - fee_type: UTILITY | FIXED
 *   - payment_method: CASH | TRANSFER
 *   - incident_status: PENDING | IN_PROGRESS | DONE
 *   - room_status: AVAILABLE | RENTED | MAINTENANCE
 *   - contract_status: ACTIVE | EXPIRED | CANCELLED
 */
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const TENANT_PASSWORD_HASH =
  '$2b$10$jKHu0/BL1qavHOL4OC7Q5eG/G2e6OdUkz5LD1UTNWyrlSzGN5Ok0S'; // Tenant@123 (cost=10)

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Pick admin/staff IDs from existing DB.
    const adminRes = await client.query(`SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (!adminRes.rowCount) throw new Error('No ADMIN user found. Create/bootstrap admin first.');
    const adminId = Number(adminRes.rows[0].user_id);

    const staffRes = await client.query(`SELECT user_id FROM users WHERE role = 'STAFF' LIMIT 1`);
    const staffId = staffRes.rowCount ? Number(staffRes.rows[0].user_id) : adminId;

    // 1) users (TENANT) - idempotent by email
    await client.query(
      `
      INSERT INTO users (username, password_hash, full_name, email, phone, cccd, role, is_active)
      VALUES
        ('tenant01', $1, 'Nguyễn Văn A',  'tenant01@gmail.com', '0900000101', '012345670001', 'TENANT', true),
        ('tenant02', $1, 'Trần Thị B',    'tenant02@gmail.com', '0900000102', '012345670002', 'TENANT', true),
        ('tenant03', $1, 'Lê Văn C',      'tenant03@gmail.com', '0900000103', '012345670003', 'TENANT', true),
        ('tenant04', $1, 'Phạm Thị D',    'tenant04@gmail.com', '0900000104', '012345670004', 'TENANT', true),
        ('tenant05', $1, 'Hoàng Văn E',   'tenant05@gmail.com', '0900000105', '012345670005', 'TENANT', true),
        ('tenant06', $1, 'Ngô Thị F',     'tenant06@gmail.com', '0900000106', '012345670006', 'TENANT', true),
        ('tenant07', $1, 'Đặng Văn G',    'tenant07@gmail.com', '0900000107', '012345670007', 'TENANT', true),
        ('tenant08', $1, 'Bùi Thị H',     'tenant08@gmail.com', '0900000108', '012345670008', 'TENANT', true),
        ('tenant09', $1, 'Vũ Văn I',      'tenant09@gmail.com', '0900000109', '012345670009', 'TENANT', true),
        ('tenant10', $1, 'Đinh Thị J',    'tenant10@gmail.com', '0900000110', '012345670010', 'TENANT', true),
        ('tenant11', $1, 'Dương Văn K',   'tenant11@gmail.com', '0900000111', '012345670011', 'TENANT', true),
        ('tenant12', $1, 'Hà Thị L',      'tenant12@gmail.com', '0900000112', '012345670012', 'TENANT', true),
        ('tenant13', $1, 'Lý Văn M',      'tenant13@gmail.com', '0900000113', '012345670013', 'TENANT', true),
        ('tenant14', $1, 'Trịnh Thị N',   'tenant14@gmail.com', '0900000114', '012345670014', 'TENANT', true),
        ('tenant15', $1, 'Phan Văn O',    'tenant15@gmail.com', '0900000115', '012345670015', 'TENANT', true),
        ('tenant16', $1, 'Cao Thị P',     'tenant16@gmail.com', '0900000116', '012345670016', 'TENANT', true),
        ('tenant17', $1, 'Mai Văn Q',     'tenant17@gmail.com', '0900000117', '012345670017', 'TENANT', true),
        ('tenant18', $1, 'Lưu Thị R',     'tenant18@gmail.com', '0900000118', '012345670018', 'TENANT', true),
        ('tenant19', $1, 'Tô Văn S',      'tenant19@gmail.com', '0900000119', '012345670019', 'TENANT', true),
        ('tenant20', $1, 'Đỗ Thị T',      'tenant20@gmail.com', '0900000120', '012345670020', 'TENANT', true),
        ('tenant21', $1, 'Nguyễn Văn U',  'tenant21@gmail.com', '0900000121', '012345670021', 'TENANT', true),
        ('tenant22', $1, 'Trần Thị V',    'tenant22@gmail.com', '0900000122', '012345670022', 'TENANT', true)
      ON CONFLICT (email) DO NOTHING
      `,
      [TENANT_PASSWORD_HASH]
    );

    // 2) rooms - idempotent by room_number
    await client.query(`
      INSERT INTO rooms (room_number, floor, area, max_tenants, price, status, description)
      VALUES
        ('101', 1, 27.2, 3, 3000000, 'AVAILABLE', 'Phòng 101'),
        ('102', 1, 27.4, 4, 2700000, 'AVAILABLE', 'Phòng 102'),
        ('103', 1, 28.8, 3, 2800000, 'AVAILABLE', 'Phòng 103'),
        ('104', 1, 23.3, 3, 2800000, 'AVAILABLE', 'Phòng 104'),
        ('105', 1, 29.5, 4, 2600000, 'AVAILABLE', 'Phòng 105'),
        ('201', 2, 25.4, 3, 2600000, 'AVAILABLE', 'Phòng 201'),
        ('202', 2, 27.2, 4, 2800000, 'AVAILABLE', 'Phòng 202'),
        ('203', 2, 21.0, 4, 2700000, 'AVAILABLE', 'Phòng 203'),
        ('204', 2, 28.3, 3, 3000000, 'AVAILABLE', 'Phòng 204'),
        ('205', 2, 26.1, 4, 2200000, 'AVAILABLE', 'Phòng 205'),
        ('301', 3, 21.6, 3, 2800000, 'AVAILABLE', 'Phòng 301'),
        ('302', 3, 24.4, 3, 2800000, 'AVAILABLE', 'Phòng 302'),
        ('303', 3, 24.1, 2, 2900000, 'AVAILABLE', 'Phòng 303'),
        ('304', 3, 29.0, 2, 2100000, 'AVAILABLE', 'Phòng 304'),
        ('305', 3, 28.9, 2, 2700000, 'AVAILABLE', 'Phòng 305'),
        ('401', 4, 28.2, 4, 2300000, 'AVAILABLE', 'Phòng 401'),
        ('402', 4, 28.8, 2, 2100000, 'AVAILABLE', 'Phòng 402'),
        ('403', 4, 26.0, 4, 3000000, 'AVAILABLE', 'Phòng 403'),
        ('404', 4, 23.9, 3, 2900000, 'AVAILABLE', 'Phòng 404'),
        ('405', 4, 22.6, 3, 2100000, 'AVAILABLE', 'Phòng 405'),
        ('501', 5, 30.0, 3, 2900000, 'AVAILABLE', 'Phòng 501'),
        ('502', 5, 22.7, 2, 3000000, 'AVAILABLE', 'Phòng 502'),
        ('503', 5, 22.3, 2, 2200000, 'AVAILABLE', 'Phòng 503'),
        ('504', 5, 20.8, 4, 2900000, 'AVAILABLE', 'Phòng 504'),
        ('505', 5, 27.5, 2, 2700000, 'AVAILABLE', 'Phòng 505')
      ON CONFLICT (room_number) DO NOTHING
    `);

    // 3) service_fees - idempotent by fee_name
    await client.query(`
      INSERT INTO service_fees (fee_name, description, unit_price, unit, fee_type, is_active)
      SELECT * FROM (VALUES
        ('Điện',        'Tiền điện theo số kW',        3500,   'kWh',   'UTILITY'::fee_type, true),
        ('Nước',        'Tiền nước theo số m³',        15000,  'm³',    'UTILITY'::fee_type, true),
        ('Internet',    'Cước Internet hàng tháng',    100000, 'tháng', 'FIXED'::fee_type,   true),
        ('Rác',         'Phí vệ sinh rác',              20000, 'tháng', 'FIXED'::fee_type,   true),
        ('Gửi xe máy',  'Phí giữ xe máy',               80000, 'tháng', 'FIXED'::fee_type,   true),
        ('Gửi xe đạp',  'Phí giữ xe đạp',               20000, 'tháng', 'FIXED'::fee_type,   true),
        ('Thang máy',   'Phí thang máy',                50000, 'tháng', 'FIXED'::fee_type,   true),
        ('Bảo vệ',      'Phí bảo vệ tòa nhà',           30000, 'tháng', 'FIXED'::fee_type,   true),
        ('Điều hòa',    'Phí sử dụng điều hòa',         50000, 'tháng', 'FIXED'::fee_type,   true),
        ('Máy giặt',    'Phí sử dụng máy giặt',         30000, 'lần',   'FIXED'::fee_type,   true)
      ) AS v(fee_name, description, unit_price, unit, fee_type, is_active)
      WHERE NOT EXISTS (
        SELECT 1 FROM service_fees sf WHERE sf.fee_name = v.fee_name
      )
    `);

    // 4) tenants - idempotent by user_id (unique)
    await client.query(`
      INSERT INTO tenants (user_id, phone, room_id)
      SELECT u.user_id, v.phone, r.room_id
      FROM (VALUES
        ('tenant01', '0910000101', '101'), ('tenant02', '0910000102', '102'),
        ('tenant03', '0910000103', '103'), ('tenant04', '0910000104', '104'),
        ('tenant05', '0910000105', '105'), ('tenant06', '0910000106', '201'),
        ('tenant07', '0910000107', '202'), ('tenant08', '0910000108', '203'),
        ('tenant09', '0910000109', '204'), ('tenant10', '0910000110', '205'),
        ('tenant11', '0910000111', '301'), ('tenant12', '0910000112', '302'),
        ('tenant13', '0910000113', '303'), ('tenant14', '0910000114', '304'),
        ('tenant15', '0910000115', '305'), ('tenant16', '0910000116', '401'),
        ('tenant17', '0910000117', '402'), ('tenant18', '0910000118', '403'),
        ('tenant19', '0910000119', '404'), ('tenant20', '0910000120', '405'),
        ('tenant21', '0910000121', '501'), ('tenant22', '0910000122', '502')
      ) AS v(username, phone, room_number)
      JOIN users u ON u.username = v.username
      JOIN rooms r ON r.room_number = v.room_number
      ON CONFLICT (user_id) DO UPDATE
        SET phone = EXCLUDED.phone,
            room_id = EXCLUDED.room_id
    `);

    // 5) contracts - only create if room has no ACTIVE contract
    await client.query(
      `
      INSERT INTO contracts (room_id, tenant_id, created_by, start_date, end_date, deposit, status, rent_price, notes)
      SELECT r.room_id, t.tenant_id, $1,
             v.start_date, v.end_date, v.rent_price, 'ACTIVE'::contract_status, v.rent_price, v.notes
      FROM (VALUES
        ('101', '2025-01-01'::date, '2025-12-31'::date, 3000000, 'Hợp đồng phòng 101'),
        ('102', '2025-01-01',       '2025-12-31',        2700000, 'Hợp đồng phòng 102'),
        ('103', '2025-01-01',       '2025-12-31',        2800000, 'Hợp đồng phòng 103'),
        ('104', '2025-01-01',       '2025-12-31',        2800000, 'Hợp đồng phòng 104'),
        ('105', '2025-02-01',       '2026-01-31',        2600000, 'Hợp đồng phòng 105'),
        ('201', '2025-02-01',       '2026-01-31',        2600000, 'Hợp đồng phòng 201'),
        ('202', '2025-02-01',       '2026-01-31',        2800000, 'Hợp đồng phòng 202'),
        ('203', '2025-03-01',       '2026-02-28',        2700000, 'Hợp đồng phòng 203'),
        ('204', '2025-03-01',       '2026-02-28',        3000000, 'Hợp đồng phòng 204'),
        ('205', '2025-03-01',       '2026-02-28',        2200000, 'Hợp đồng phòng 205'),
        ('301', '2025-04-01',       '2026-03-31',        2800000, 'Hợp đồng phòng 301'),
        ('302', '2025-04-01',       '2026-03-31',        2800000, 'Hợp đồng phòng 302'),
        ('303', '2025-04-01',       '2026-03-31',        2900000, 'Hợp đồng phòng 303'),
        ('304', '2025-05-01',       '2026-04-30',        2100000, 'Hợp đồng phòng 304'),
        ('305', '2025-05-01',       '2026-04-30',        2700000, 'Hợp đồng phòng 305'),
        ('401', '2025-05-01',       '2026-04-30',        2300000, 'Hợp đồng phòng 401'),
        ('402', '2025-06-01',       '2026-05-31',        2100000, 'Hợp đồng phòng 402'),
        ('403', '2025-06-01',       '2026-05-31',        3000000, 'Hợp đồng phòng 403'),
        ('404', '2025-06-01',       '2026-05-31',        2900000, 'Hợp đồng phòng 404'),
        ('405', '2025-07-01',       '2026-06-30',        2100000, 'Hợp đồng phòng 405'),
        ('501', '2025-07-01',       '2026-06-30',        2900000, 'Hợp đồng phòng 501'),
        ('502', '2025-07-01',       '2026-06-30',        3000000, 'Hợp đồng phòng 502')
      ) AS v(room_number, start_date, end_date, rent_price, notes)
      JOIN rooms r ON r.room_number = v.room_number
      JOIN tenants t ON t.room_id = r.room_id
      WHERE NOT EXISTS (
        SELECT 1 FROM contracts ct
        WHERE ct.room_id = r.room_id AND ct.status = 'ACTIVE'
      )
      `,
      [adminId]
    );

    // 6) contract_service_fees - idempotent by (contract_id, fee_id)
    await client.query(`
      INSERT INTO contract_service_fees (contract_id, fee_id, agreed_price)
      SELECT ct.contract_id, sf.fee_id, sf.unit_price
      FROM contracts ct
      JOIN service_fees sf ON sf.fee_name IN ('Điện', 'Nước')
      WHERE ct.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM contract_service_fees csf
          WHERE csf.contract_id = ct.contract_id AND csf.fee_id = sf.fee_id
        )
    `);

    await client.query(`
      INSERT INTO contract_service_fees (contract_id, fee_id, agreed_price)
      SELECT ct.contract_id, sf.fee_id, sf.unit_price
      FROM contracts ct
      JOIN rooms r ON r.room_id = ct.room_id
      JOIN service_fees sf ON sf.fee_name = 'Internet'
      WHERE ct.status = 'ACTIVE'
        AND r.room_number IN ('101', '103', '202', '303', '501')
        AND NOT EXISTS (
          SELECT 1 FROM contract_service_fees csf
          WHERE csf.contract_id = ct.contract_id AND csf.fee_id = sf.fee_id
        )
    `);

    await client.query(`
      INSERT INTO contract_service_fees (contract_id, fee_id, agreed_price)
      SELECT ct.contract_id, sf.fee_id, sf.unit_price
      FROM contracts ct
      JOIN rooms r ON r.room_id = ct.room_id
      JOIN service_fees sf ON sf.fee_name = 'Gửi xe máy'
      WHERE ct.status = 'ACTIVE'
        AND r.room_number IN ('103', '204', '302', '403')
        AND NOT EXISTS (
          SELECT 1 FROM contract_service_fees csf
          WHERE csf.contract_id = ct.contract_id AND csf.fee_id = sf.fee_id
        )
    `);

    await client.query(`
      INSERT INTO contract_service_fees (contract_id, fee_id, agreed_price)
      SELECT ct.contract_id, sf.fee_id, sf.unit_price
      FROM contracts ct
      JOIN rooms r ON r.room_id = ct.room_id
      JOIN service_fees sf ON sf.fee_name = 'Thang máy'
      WHERE ct.status = 'ACTIVE'
        AND r.floor IN (4, 5)
        AND NOT EXISTS (
          SELECT 1 FROM contract_service_fees csf
          WHERE csf.contract_id = ct.contract_id AND csf.fee_id = sf.fee_id
        )
    `);

    // 7) utility_readings - idempotent by (contract_id, billing_month)
    await client.query(
      `
      INSERT INTO utility_readings (room_id, contract_id, billing_month, electricity_old, electricity_new, water_old, water_new, recorded_by)
      SELECT r.room_id, ct.contract_id, '2025-05-01'::date,
             v.elec_old, v.elec_new, v.water_old, v.water_new,
             $1
      FROM (VALUES
        ('101', 1230, 1285, 42, 47), ('102', 870,  920,  18, 22),
        ('103', 1540, 1598, 35, 39), ('104', 990,  1047, 28, 33),
        ('105', 660,  710,  12, 16), ('201', 1100, 1162, 55, 60),
        ('202', 780,  845,  20, 25), ('203', 1420, 1480, 38, 43),
        ('204', 930,  985,  22, 26), ('205', 2100, 2168, 70, 76),
        ('301', 1050, 1110, 31, 36), ('302', 840,  895,  15, 20),
        ('303', 1300, 1357, 44, 49), ('304', 620,  670,  10, 14),
        ('305', 1680, 1745, 58, 64), ('401', 950,  1008, 25, 30),
        ('402', 740,  790,  16, 20), ('403', 1190, 1255, 40, 45),
        ('404', 870,  925,  22, 27), ('405', 1450, 1510, 50, 55),
        ('501', 680,  730,  18, 22), ('502', 1010, 1068, 33, 38)
      ) AS v(room_number, elec_old, elec_new, water_old, water_new)
      JOIN rooms r ON r.room_number = v.room_number
      JOIN contracts ct ON ct.room_id = r.room_id AND ct.status = 'ACTIVE'
      WHERE NOT EXISTS (
        SELECT 1 FROM utility_readings ur
        WHERE ur.contract_id = ct.contract_id AND ur.billing_month = '2025-05-01'
      )
      `,
      [staffId]
    );

    // 8) invoices - idempotent by (contract_id, billing_month)
    await client.query(
      `
      INSERT INTO invoices (
        contract_id, tenant_id, billing_month, due_date,
        rent_amount, electricity_amount, water_amount, other_fees_amount, total_amount,
        status, created_by
      )
      SELECT
        ct.contract_id,
        ct.tenant_id,
        '2025-05-01'::date,
        '2025-05-10'::date,
        ct.rent_price,
        (ur.electricity_new - ur.electricity_old) * 3500,
        (ur.water_new       - ur.water_old)       * 15000,
        COALESCE((
          SELECT SUM(csf.agreed_price)
          FROM contract_service_fees csf
          JOIN service_fees sf ON sf.fee_id = csf.fee_id
          WHERE csf.contract_id = ct.contract_id
            AND sf.fee_type = 'FIXED'
        ), 0),
        ct.rent_price
          + (ur.electricity_new - ur.electricity_old) * 3500
          + (ur.water_new       - ur.water_old)       * 15000
          + COALESCE((
              SELECT SUM(csf.agreed_price)
              FROM contract_service_fees csf
              JOIN service_fees sf ON sf.fee_id = csf.fee_id
              WHERE csf.contract_id = ct.contract_id
                AND sf.fee_type = 'FIXED'
            ), 0),
        CASE
          WHEN r.room_number IN ('101','102','103','104','105','201','202','404','405','501','502') THEN 'PAID'::invoice_status
          ELSE 'UNPAID'::invoice_status
        END,
        $1
      FROM contracts ct
      JOIN rooms r ON r.room_id = ct.room_id
      JOIN utility_readings ur ON ur.contract_id = ct.contract_id AND ur.billing_month = '2025-05-01'
      WHERE ct.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM invoices inv
          WHERE inv.contract_id = ct.contract_id AND inv.billing_month = '2025-05-01'
        )
      `,
      [adminId]
    );

    // 9) invoice_service_fees - idempotent by (invoice_id, fee_id)
    await client.query(`
      INSERT INTO invoice_service_fees (invoice_id, fee_id, amount)
      SELECT inv.invoice_id, csf.fee_id, csf.agreed_price
      FROM invoices inv
      JOIN contract_service_fees csf ON csf.contract_id = inv.contract_id
      JOIN service_fees sf ON sf.fee_id = csf.fee_id
      WHERE inv.billing_month = '2025-05-01'
        AND sf.fee_type = 'FIXED'
        AND NOT EXISTS (
          SELECT 1 FROM invoice_service_fees isf
          WHERE isf.invoice_id = inv.invoice_id AND isf.fee_id = csf.fee_id
        )
    `);

    // 10) payments - only for PAID invoices, idempotent by invoice_id
    await client.query(
      `
      INSERT INTO payments (invoice_id, amount_paid, payment_method, note, recorded_by)
      SELECT
        inv.invoice_id,
        inv.total_amount,
        CASE WHEN ROW_NUMBER() OVER (ORDER BY inv.invoice_id) % 2 = 0
             THEN 'CASH'::payment_method
             ELSE 'TRANSFER'::payment_method
        END,
        CASE WHEN ROW_NUMBER() OVER (ORDER BY inv.invoice_id) % 2 = 0
             THEN 'Tiền mặt tại quầy'
             ELSE 'Chuyển khoản ngân hàng'
        END,
        $1
      FROM invoices inv
      WHERE inv.status = 'PAID'
        AND inv.billing_month = '2025-05-01'
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = inv.invoice_id)
      `,
      [staffId]
    );

    // 11) incidents - idempotent by (room_id, title)
    await client.query(
      `
      INSERT INTO incidents (room_id, reported_by, assigned_to, title, status)
      SELECT r.room_id, u_tenant.user_id, $1, v.title, v.status::incident_status
      FROM (VALUES
        ('101', 'Bóng đèn phòng 101 bị hỏng',        'DONE'),
        ('102', 'Vòi nước phòng 102 bị chảy',         'IN_PROGRESS'),
        ('103', 'Cửa sổ phòng 103 không đóng được',   'PENDING'),
        ('104', 'Điều hòa phòng 104 không mát',       'PENDING'),
        ('105', 'Tắc bồn rửa phòng 105',              'DONE'),
        ('201', 'Ổ điện phòng 201 bị chập',           'PENDING'),
        ('202', 'Trần nhà phòng 202 bị thấm nước',    'IN_PROGRESS'),
        ('203', 'Khóa cửa phòng 203 bị hỏng',         'DONE'),
        ('204', 'Quạt trần phòng 204 phát tiếng ồn',  'PENDING'),
        ('205', 'Bình nóng lạnh phòng 205 bị rò',     'DONE'),
        ('301', 'Tường phòng 301 bị ẩm mốc',          'IN_PROGRESS'),
        ('302', 'Bồn cầu phòng 302 bị nghẹt',         'DONE'),
        ('303', 'Internet phòng 303 chập chờn',       'PENDING'),
        ('304', 'Cửa chính phòng 304 bị kẹt',         'DONE'),
        ('305', 'Máy bơm tầng 3 yếu nước',            'PENDING')
      ) AS v(room_number, title, status)
      JOIN rooms r ON r.room_number = v.room_number
      JOIN tenants t ON t.room_id = r.room_id
      JOIN users u_tenant ON u_tenant.user_id = t.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM incidents i WHERE i.room_id = r.room_id AND i.title = v.title
      )
      `,
      [staffId]
    );

    // 12) assets - idempotent by (room_id, name)
    await client.query(`
      INSERT INTO assets (room_id, name, quantity, status, note)
      SELECT r.room_id, v.name, 1, v.status::asset_status, v.note
      FROM (VALUES
        ('101', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 01/2025'),
        ('101', 'Bình nóng lạnh Ariston',   'OK',     'Lắp đặt 01/2025'),
        ('102', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 01/2025'),
        ('102', 'Bình nóng lạnh Ariston',   'BROKEN', 'Rò nước nhẹ'),
        ('103', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 01/2025'),
        ('104', 'Điều hòa Panasonic 12000', 'BROKEN', 'Không đủ lạnh'),
        ('104', 'Bình nóng lạnh Ariston',   'OK',     'Lắp đặt 01/2025'),
        ('105', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 02/2025'),
        ('201', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 02/2025'),
        ('202', 'Điều hòa LG 9000BTU',      'OK',     'Lắp đặt 02/2025'),
        ('202', 'Bình nóng lạnh Rossi',     'OK',     'Lắp đặt 02/2025'),
        ('203', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 03/2025'),
        ('204', 'Điều hòa Daikin 12000BTU', 'OK',     'Lắp đặt 03/2025'),
        ('205', 'Điều hòa Panasonic 9000',  'BROKEN', 'Cần vệ sinh'),
        ('301', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 04/2025'),
        ('302', 'Điều hòa LG 9000BTU',      'OK',     'Lắp đặt 04/2025'),
        ('303', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 04/2025'),
        ('304', 'Bình nóng lạnh Ariston',   'OK',     'Lắp đặt 05/2025'),
        ('305', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 05/2025'),
        ('401', 'Điều hòa Panasonic 12000', 'OK',     'Lắp đặt 05/2025'),
        ('402', 'Bình nóng lạnh Rossi',     'BROKEN', 'Cần thay dây điện'),
        ('403', 'Điều hòa Daikin 12000BTU', 'OK',     'Lắp đặt 06/2025'),
        ('404', 'Điều hòa LG 9000BTU',      'OK',     'Lắp đặt 06/2025'),
        ('405', 'Bình nóng lạnh Ariston',   'OK',     'Lắp đặt 07/2025'),
        ('501', 'Điều hòa Daikin 9000BTU',  'OK',     'Lắp đặt 07/2025')
      ) AS v(room_number, name, status, note)
      JOIN rooms r ON r.room_number = v.room_number
      WHERE NOT EXISTS (
        SELECT 1 FROM assets a WHERE a.room_id = r.room_id AND a.name = v.name
      )
    `);

    // 13) notifications - idempotent by (user_id, title)
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message, is_read, created_by)
      SELECT u.user_id, v.title, v.message, v.is_read, $1
      FROM (VALUES
        ('tenant01', 'Hóa đơn tháng 5 đã thanh toán',  'Hóa đơn phòng 101 tháng 05/2025 đã xác nhận.',      true),
        ('tenant02', 'Hóa đơn tháng 5 đã thanh toán',  'Hóa đơn phòng 102 tháng 05/2025 đã xác nhận.',      true),
        ('tenant08', 'Nhắc nhở thanh toán',             'Hóa đơn phòng 203 tháng 05/2025 chưa thanh toán.',  false),
        ('tenant09', 'Nhắc nhở thanh toán',             'Hóa đơn phòng 204 tháng 05/2025 chưa thanh toán.',  false),
        ('tenant14', 'Nhắc nhở thanh toán',            'Hóa đơn phòng 304 đã quá hạn, vui lòng thanh toán.', false),
        ('tenant18', 'Nhắc nhở thanh toán',            'Hóa đơn phòng 403 đã quá hạn, vui lòng thanh toán.', false),
        ('tenant03', 'Sự cố',                          'Kỹ thuật sẽ đến kiểm tra cửa sổ phòng 103.',        false),
        ('tenant04', 'Sự cố',                          'Kỹ thuật sẽ đến kiểm tra điều hòa phòng 104.',      false)
      ) AS v(username, title, message, is_read)
      JOIN users u ON u.username = v.username
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n WHERE n.user_id = u.user_id AND n.title = v.title
      )
      `,
      [adminId]
    );

    // Update rooms with ACTIVE contract to RENTED
    await client.query(`
      UPDATE rooms r
      SET status = 'RENTED'::room_status, updated_at = NOW()
      WHERE EXISTS (
        SELECT 1 FROM contracts ct
        WHERE ct.room_id = r.room_id AND ct.status = 'ACTIVE'
      )
    `);

    await client.query('COMMIT');

    const summary = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'TENANT') AS tenant_users,
        (SELECT COUNT(*) FROM rooms) AS rooms,
        (SELECT COUNT(*) FROM tenants) AS tenants,
        (SELECT COUNT(*) FROM contracts) AS contracts,
        (SELECT COUNT(*) FROM invoices) AS invoices,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM incidents) AS incidents,
        (SELECT COUNT(*) FROM assets) AS assets,
        (SELECT COUNT(*) FROM notifications) AS notifications
    `);
    console.log('Seed V3 adjusted completed. Summary:', summary.rows[0]);
    console.log('Tenant login: email=tenant01@gmail.com ... tenant22@gmail.com, password=Tenant@123');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Seed failed:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    client.release();
    try {
      await pool.end();
    } catch (e) {}
  }
}

main();

