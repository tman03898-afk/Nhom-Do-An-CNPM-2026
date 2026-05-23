# ERD — Mô tả bảng dữ liệu core (lấy từ PostgreSQL thực tế)

**Nguồn:** Truy vấn `information_schema` trên database dự án (tháng 5/2026)  
**Sơ đồ:** `docs/erd-core.png` · `docs/erd-core.mmd`  
**Ghi chú:** Bảng OTP/password reset (`password_reset_*`, `tenant_profile_otps`, …) là phụ trợ xác thực — không vẽ trong ERD core.

---

## Danh sách 15 bảng core

| Nhóm | Bảng | Vai trò |
|------|------|---------|
| Người dùng | `users`, `tenants` | Tài khoản đăng nhập & hồ sơ khách thuê |
| Phòng | `rooms`, `room_hold_requests`, `assets` | Phòng trọ, giữ chỗ, tài sản |
| Thuê | `contracts` | Hợp đồng |
| Tài chính | `invoices`, `payments`, `services`, `service_fees`, `utility_readings`, `tenant_service_subscriptions`, `tenant_fee_subscriptions` | Hóa đơn, thanh toán, dịch vụ, chỉ số |
| Vận hành | `incidents`, `notifications` | Ticket, thông báo |

---

## 1. users

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **user_id** | int | PK, NOT NULL | Khóa chính |
| username | varchar | NOT NULL | Tên đăng nhập |
| full_name | varchar | NOT NULL | Họ tên |
| email | varchar | NULL | Email |
| phone | varchar | NULL | Số điện thoại |
| cccd | varchar | NULL | CCCD |
| role | user_role | NOT NULL | ADMIN / TENANT |
| is_active | bool | DEFAULT true | Kích hoạt tài khoản |
| password_hash | text | NOT NULL | Mật khẩu băm bcrypt |
| date_of_birth | date | NULL | Ngày sinh |
| avatar_url | text | NULL | Ảnh đại diện |
| created_at | timestamp | NOT NULL | Ngày tạo |
| updated_at | timestamp | NOT NULL | Ngày cập nhật |

---

## 2. tenants

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **tenant_id** | int | PK | Khóa chính |
| user_id | int | FK → users, UNIQUE | 1 tenant = 1 user |
| phone | varchar | NULL | SĐT liên hệ |
| room_id | int | FK → rooms, NULL | Phòng đang thuê (gợi ý) |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 3. rooms

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **room_id** | int | PK | |
| room_number | varchar | NOT NULL, UNIQUE | Mã phòng |
| floor | smallint | NULL | Tầng |
| area | numeric | NOT NULL | Diện tích |
| max_tenants | smallint | DEFAULT 1 | Số người tối đa |
| price | numeric | NOT NULL | Giá thuê |
| status | room_status | DEFAULT AVAILABLE | AVAILABLE, HELD, RENTED, MAINTENANCE |
| description | text | NULL | Mô tả |
| room_type | varchar | NULL | Loại phòng |
| images | jsonb | DEFAULT [] | Danh sách URL ảnh |
| hold_until | timestamptz | NULL | Hết hạn giữ chỗ |
| active_hold_request_id | int | NULL | ID yêu cầu giữ đang active |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

---

## 4. room_hold_requests

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **hold_request_id** | int | PK | |
| room_id | int | FK → rooms | Phòng giữ |
| guest_name | varchar | NOT NULL | Tên khách |
| guest_phone | varchar | NULL | SĐT (ít nhất phone hoặc email) |
| guest_email | varchar | NULL | Email |
| preferred_view_date | date | NULL | Ngày hẹn xem |
| note | text | NULL | Ghi chú |
| request_status | hold_request_status | DEFAULT NEW | NEW, DEPOSIT_PENDING, … |
| hold_kind | varchar | DEFAULT TEMP | TEMP (15p) / DEPOSIT |
| hold_until | timestamptz | NULL | Thời điểm hết giữ |
| deposit_proof_url | text | NULL | Ảnh bill cọc |
| deposit_submitted_at | timestamptz | NULL | |
| deposit_verified_at | timestamptz | NULL | |
| deposit_verified_by | int | FK → users | Admin duyệt |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 5. contracts

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **contract_id** | int | PK | |
| tenant_id | int | FK → tenants | Khách thuê |
| room_id | int | FK → rooms | Phòng |
| created_by | int | FK → users | Admin lập HĐ |
| start_date | date | NOT NULL | Ngày bắt đầu |
| end_date | date | NULL | Ngày kết thúc |
| rent_price | numeric | DEFAULT 0 | Giá thuê/tháng |
| monthly_rent | numeric | NULL | Cột legacy |
| deposit | numeric | DEFAULT 0 | Tiền cọc |
| status | contract_status | DEFAULT ACTIVE | ACTIVE, EXPIRED, TERMINATED |
| notes | text | NULL | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

---

## 6. invoices

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **invoice_id** | int | PK | |
| tenant_id | int | FK → tenants | |
| contract_id | int | FK → contracts | |
| billing_month | date | NOT NULL | Kỳ hóa đơn (đầu tháng) |
| due_date | date | NOT NULL | Hạn thanh toán |
| rent_amount | numeric | DEFAULT 0 | Tiền phòng |
| electricity_amount | numeric | DEFAULT 0 | Tiền điện |
| water_amount | numeric | DEFAULT 0 | Tiền nước |
| other_fees_amount | numeric | DEFAULT 0 | Phí khác / dịch vụ |
| total_amount | numeric | NOT NULL | Tổng |
| status | invoice_status | DEFAULT UNPAID | UNPAID, PAID, OVERDUE, … |
| created_by | int | FK → users | |
| electricity_breakdown | jsonb | NULL | Chi tiết bậc điện |
| water_breakdown | jsonb | NULL | Chi tiết bậc nước |
| utility_meter_snapshot | jsonb | NULL | Snapshot chỉ số |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 7. payments

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **payment_id** | int | PK | |
| invoice_id | int | FK → invoices | Hóa đơn thanh toán |
| amount | numeric | NOT NULL | Số tiền (schema mới) |
| amount_paid | numeric | NOT NULL | Số tiền (schema cũ) |
| method | payment_method | NOT NULL | BANK_TRANSFER, CASH, … |
| status | payment_status | DEFAULT PENDING | PENDING, APPROVED, REJECTED |
| proof_url | text | NULL | Ảnh chứng từ |
| note | text | NULL | |
| recorded_by | int | FK → users | Người ghi nhận |
| paid_at | timestamp | NOT NULL | Thời điểm thanh toán |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 8. services

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **service_id** | int | PK | |
| name | varchar | NOT NULL, UNIQUE | Tên dịch vụ |
| unit | varchar | NULL | Đơn vị (tháng, kWh…) |
| price | numeric | DEFAULT 0 | Đơn giá |
| is_active | bool | DEFAULT true | |
| allow_tenant_subscription | bool | DEFAULT true | Cho tenant đăng ký |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 9. service_fees

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **fee_id** | int | PK | |
| fee_name | varchar | NOT NULL | Tên phí |
| description | text | NULL | |
| unit_price | numeric | NOT NULL | |
| unit | varchar | NOT NULL | |
| fee_type | fee_type | NOT NULL | Loại phí |
| is_active | bool | NOT NULL | |

---

## 10. utility_readings

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **reading_id** | int | PK | |
| room_id | int | FK → rooms | |
| contract_id | int | FK → contracts, NULL | |
| billing_month | date | NULL | Kỳ ghi |
| utility_type | utility_type | NULL | ELECTRIC / WATER (schema mới) |
| previous_value | numeric | DEFAULT 0 | Chỉ số cũ |
| current_value | numeric | DEFAULT 0 | Chỉ số mới |
| electricity_old / electricity_new | numeric | NULL | Schema legacy |
| water_old / water_new | numeric | NULL | Schema legacy |
| electricity_img / water_img | varchar | NULL | Ảnh đồng hồ |
| recorded_by | int | FK → users | |
| recorded_at | timestamp | NOT NULL | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 11. tenant_service_subscriptions

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **subscription_id** | int | PK | |
| tenant_id | int | FK → tenants | |
| service_id | int | FK → services | |
| monthly_price | numeric | DEFAULT 0 | |
| status | varchar | ACTIVE / CANCELLED | |
| started_at | timestamptz | NOT NULL | |
| cancelled_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 12. tenant_fee_subscriptions

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **id** | int | PK | |
| tenant_id | int | FK → tenants | |
| fee_id | int | FK → service_fees | |
| monthly_price | numeric | DEFAULT 0 | |
| status | varchar | PENDING, ACTIVE, REJECTED, CANCELLED | |
| effective_from | date | NULL | |
| approved_by | int | FK → users | |
| approved_at / rejected_at | timestamptz | NULL | |
| reject_reason | text | NULL | |
| cancelled_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 13. incidents

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **incident_id** | int | PK | |
| room_id | int | FK → rooms | |
| reported_by | int | FK → users | Người báo |
| assigned_to | int | FK → users, NULL | Người xử lý |
| title | varchar | NOT NULL | |
| description | text | NULL | |
| status | incident_status | DEFAULT OPEN | OPEN, RESOLVED, … |
| priority | incident_priority | DEFAULT MEDIUM | |
| repair_cost | numeric | DEFAULT 0 | |
| image_url | varchar | NULL | |
| attachment_urls | jsonb | DEFAULT [] | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

---

## 14. notifications

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **notification_id** | int | PK | |
| user_id | int | FK → users | Người nhận |
| type | notification_type | NULL | |
| title | varchar | NOT NULL | |
| message | text | NULL | |
| body | text | NULL | Nội dung (song song message) |
| reference_id | int | NULL | Tham chiếu đối tượng |
| reference_type | varchar | NULL | Loại tham chiếu |
| is_read | bool | DEFAULT false | |
| created_by | int | FK → users | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## 15. assets

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|------------|------|-----------|-------|
| **asset_id** | int | PK | |
| room_id | int | FK → rooms, NULL | |
| name | varchar | NOT NULL | Tên tài sản |
| quantity | int | DEFAULT 1 | |
| status | asset_status | DEFAULT OK | OK, BROKEN, … |
| note | text | NULL | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

## Quan hệ chính (tóm tắt)

```
users 1 — 0..1 tenants
users 1 — n contracts (created_by)
users 1 — n room_hold_requests (deposit_verified_by)
users 1 — n payments, invoices, utility_readings, notifications, incidents

rooms 1 — n room_hold_requests, contracts, utility_readings, incidents, assets
rooms 0..1 — n tenants (room_id)

tenants 1 — n contracts, invoices, subscriptions

contracts 1 — n invoices, utility_readings
invoices 1 — n payments
services 1 — n tenant_service_subscriptions
service_fees 1 — n tenant_fee_subscriptions
```

---

*Chú thích hình ERD: Hình Y — Sơ đồ ERD các thực thể core hệ thống quản lý phòng trọ The Sun (nguồn: PostgreSQL).*
