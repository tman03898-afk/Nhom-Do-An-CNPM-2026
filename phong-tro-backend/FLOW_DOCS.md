# Backend CRUD Flows — Tenant / Contract / Profile

## Mục tiêu
Tài liệu này mô tả chi tiết các luồng thêm / xóa / sửa chính liên quan đến:
- `tenant`
- `contract`
- profile tenant

Nó chỉ ra file code chính, hành động nào vào database, và các bước quan trọng theo luồng.

---

## 1. Tạo khách thuê (admin tạo tenant)

File chính:
- `phong-tro-backend/src/routes/auth.js`

Endpoint:
- `POST /auth/users/tenant`

Luồng:
1. Kiểm tra auth/role: `requireAuth`, `requireAdmin`.
2. Đọc body: `full_name`, `email`, `password`, `phone`, `room_number`.
3. Kiểm tra bắt buộc đủ trường.
4. Kiểm tra định dạng `phone` bằng helper `isValidPhoneNumber()`.
5. Tìm `room_id` từ `room_number`.
6. Hash password.
7. Tạo record mới tại `users`:
   - `INSERT INTO users (...) VALUES (...)`
8. Tạo record mới tại `tenants`:
   - `INSERT INTO tenants (user_id, phone, room_id) VALUES (...)`
9. Cập nhật `rooms`:
   - `UPDATE rooms SET status = 'RENTED' ...`

DB có thay đổi:
- Có. Thêm vào database.
- Vào bảng: `users`, `tenants`, `rooms`.

Vào DB trực tiếp ở file này; dòng chính: `INSERT INTO users`, `INSERT INTO tenants`, `UPDATE rooms`.

---

## 2. Xóa khách thuê (admin xóa tenant)

File chính:
- `phong-tro-backend/src/routes/tenants.js`

Endpoint:
- `DELETE /admin/tenants/:tenantId`

Luồng:
1. Kiểm tra auth/role: `requireAuth`, `requireAdmin`.
2. Lấy `tenantId` từ URL và kiểm tra số nguyên hợp lệ.
3. Đảm bảo schema tồn tại: `ensureTenantsTable()`, `ensureUsersTable()`, `ensureRoomsTable()`, `contractRouter.ensureContractsTable()`.
4. Query snapshot tenant + user + room.
5. Kiểm tra tenant tồn tại và role phải là `TENANT`.
6. Lấy danh sách hợp đồng liên quan từ `contracts`.
7. BEGIN transaction.
8. Ghi log xóa vào `adminRemovalLog`.
9. Dọn phụ thuộc hợp đồng:
   - xóa mỗi `contract_service_fees`, `utility_readings`, `invoice_service_fees`, `payments`, `invoices` cho từng hợp đồng
10. Xóa `contracts` liên quan:
    - `DELETE FROM contracts WHERE tenant_id = $1`
11. Xóa `invoices` liên quan:
    - `DELETE FROM invoices WHERE tenant_id = $1`
12. Xóa record `tenants`:
    - `DELETE FROM tenants WHERE tenant_id = $1`
13. Cập nhật `rooms` thành `AVAILABLE` nếu phòng không còn hợp đồng ACTIVE.
14. Cập nhật `users.is_active = FALSE` cho user liên quan.
15. COMMIT transaction.

DB có thay đổi:
- Có. Xóa data trong DB và update user/room.
- Xóa từ `contracts`, `invoices`, `tenants`.
- User không bị xóa, chỉ đặt `is_active = FALSE`.

Ghi chú:
- Đây là luồng xóa toàn bộ tenant với các phụ thuộc hợp đồng/hóa đơn.

---

## 3. Tạo hợp đồng (admin tạo contract)

File chính:
- `phong-tro-backend/src/routes/contracts.js`

Endpoint:
- `POST /admin/contracts`

Luồng:
1. Kiểm tra auth/role: `requireAuth`, `requireAdmin`.
2. Đảm bảo schema: `ensureUsersTable()`, `ensureRoomsTable()`, `ensureTenantsTable()`, `ensureContractsTable()`, `ensureNotificationsTable()`.
3. Lấy body: `tenant_id` / `user_id`, `room_id` / `room_number`, `start_date`, `end_date`, `rent_price`, `deposit`, `notes`.
4. Nếu chỉ có `user_id`, tìm `tenant_id` tương ứng.
5. Nếu chỉ có `room_number`, tìm `room_id` tương ứng.
6. Kiểm tra tenant và room tồn tại.
7. Nếu tenant đã có `room_id` khác, cập nhật `tenants.room_id`.
8. Kiểm tra room chưa có hợp đồng `ACTIVE`.
9. Tính giá trị `rent_price` / `deposit`.
10. Insert contract vào `contracts`.
11. Tạo notification cho tenant và admin.
12. Update room status thành `RENTED`.
13. COMMIT.

DB có thay đổi:
- Có. Thêm `contracts`, thêm `notifications`, update `rooms`.

---

## 4. Xóa hợp đồng (admin xóa contract)

File chính:
- `phong-tro-backend/src/routes/contracts.js`

Endpoint:
- `DELETE /admin/contracts/:id`

Luồng:
1. Kiểm tra auth/role: `requireAuth`, `requireAdmin`.
2. Kiểm tra `contractId` hợp lệ.
3. Đảm bảo schema có bảng cần thiết.
4. Select contract và tenant/user/room snapshot.
5. BEGIN transaction.
6. Gọi `purgeContractDependencies(client, contractId)`:
   - xóa `contract_service_fees`
   - xóa `utility_readings`
   - xóa `invoice_service_fees`
   - xóa `payments`
   - xóa `invoices`
7. Ghi log xóa contract vào `adminRemovalLog`.
8. Xóa `contracts`.
9. Nếu room không còn hợp đồng ACTIVE, update `rooms` về `AVAILABLE`.
10. COMMIT.

DB có thay đổi:
- Có. Xóa contract và dữ liệu phụ thuộc vào DB.
- Không xóa tenant.

---

## 5. Cập nhật profile tenant

File chính:
- `phong-tro-backend/src/routes/tenantProfile.js`

Endpoint:
- `POST /tenant/profile/update`

Luồng:
1. Kiểm tra auth/role: `requireAuth`, `requireTenant`.
2. Đảm bảo schema tenant profile: `ensureTenantProfileSchema()`.
3. Yêu cầu OTP SMS (`otp`) hợp lệ.
4. Lấy profile hiện tại từ `users` + `tenants`.
5. Xác định các thay đổi:
   - `full_name`
   - `phone`
   - `cccd`
   - `date_of_birth`
   - `new_password`
   - `email`
6. Nếu đổi email: kiểm tra duplicate và so sánh mã email OTP.
7. So sánh mã OTP SMS từ `tenant_profile_otps`.
8. Nếu đổi mật khẩu: kiểm tra `current_password`, độ dài mới.
9. Nếu đổi số điện thoại: validate `isValidPhoneNumber(normalized)`.
10. Update `users` với các thay đổi thuộc users.
11. Update `tenants.phone` nếu phone thay đổi.
12. Xóa OTP/email OTP/recovery OTP cũ.
13. COMMIT.

DB có thay đổi:
- Có. Thay đổi `users` và/hoặc `tenants.phone`.

---

## 6. Helpers và schema liên quan

File schema / helper chính:
- `phong-tro-backend/src/routes/_dbHelpers.js`
  - `ensureUsersTable()`
  - `ensureTenantsTable()`
  - `tenants.user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE`
  - `tenants.room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL`
- `phong-tro-backend/src/routes/contracts.js`
  - `ensureContractsTable()`
  - `contracts.tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE`
  - `contracts.room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT`
- `phong-tro-backend/src/utils/phone.js`
  - `isValidPhoneNumber()`
- `phong-tro-backend/DB_SCHEMA_CURRENT.md`
  - tham khảo schema hiện tại và constraints
- `phong-tro-backend/constraint_db.sql`
  - thêm trigger, index, constraint email

---

## 7. Hướng dẫn mở file theo luồng

### Thêm tenant
- Mở `phong-tro-backend/src/routes/auth.js`
- Tìm `router.post('/auth/users/tenant'...`.
- Dòng DB chính: `INSERT INTO users ...` và `INSERT INTO tenants ...`.
- Cập nhật room: `UPDATE rooms SET status = 'RENTED'...`.

### Xóa tenant
- Mở `phong-tro-backend/src/routes/tenants.js`
- Tìm `router.delete('/admin/tenants/:tenantId'...`.
- Dòng DB chính: xóa `contracts`, `invoices`, `tenants` và cập nhật `users.is_active`.
- Phụ thuộc contract: `contractRouter.purgeContractDependencies(client, crow.contract_id)`.

### Thêm contract
- Mở `phong-tro-backend/src/routes/contracts.js`
- Tìm `router.post('/admin/contracts'...`.
- Dòng DB chính: `INSERT INTO contracts ...`.
- Notification: `INSERT INTO notifications ...`.
- Phòng: `UPDATE rooms SET status = 'RENTED'...`.

### Xóa contract
- Mở `phong-tro-backend/src/routes/contracts.js`
- Tìm `router.delete('/admin/contracts/:id'...`.
- Dòng DB chính: `DELETE FROM contracts WHERE contract_id = $1`.
- Gọi hook dọn phụ thuộc: `purgeContractDependencies(...)`.

### Cập nhật profile tenant
- Mở `phong-tro-backend/src/routes/tenantProfile.js`
- Tìm `router.post('/tenant/profile/update'...`.
- Dòng DB chính: `UPDATE users SET ...` và `UPDATE tenants SET phone = ...`.

---

## 8. Câu trả lời nhanh

- `Xóa khách thuê` → có vào database xóa hợp đồng và hóa đơn, đồng thời tenant record bị xóa, user chỉ bị deactivate.
- `Xóa hợp đồng` → có vào database xóa contract và dữ liệu phụ thuộc.
- `Thêm tenant` → có vào database tạo user + tenant + update room.
- `Thêm contract` → có vào database tạo contract + notification + update room.
- `Sửa profile tenant` → có vào database cập nhật `users` và/hoặc `tenants`.

---

## 9. Ghi chú thêm

- Nếu muốn xem ràng buộc chính xác hiện có trong DB, mở `DB_SCHEMA_CURRENT.md`.
- Nếu muốn xem migration/constraint SQL, mở `constraint_db.sql`.
- Mọi luồng CRUD chính ở backend đều trực tiếp thay đổi database trong các routes được nêu ở trên.

---

## 10. Room holds (giữ chỗ / đặt cọc)

File chính:
- `phong-tro-backend/src/routes/roomHolds.js`

Endpoints (chính):
- `POST /public` — khách giữ chỗ (TEMP 15 phút hoặc DEPOSIT chờ admin).
- `POST /public/:id/deposit-proof` — khách tải ảnh minh chứng chuyển khoản.
- `GET /public/deposit-config` — lấy thông tin chuyển khoản / QR.
- `GET /admin` — admin: danh sách yêu cầu giữ chỗ.
- `PATCH /admin/:id` — admin cập nhật trạng thái yêu cầu.
- `POST /admin/:id/verify-deposit` — admin xác minh minh chứng đặt cọc.
- `POST /admin/:id/reject-deposit` — admin từ chối minh chứng cọc và mở lại phòng.
- `POST /admin/:id/hold-room` — admin giữ phòng cho khách (chuyển sang HELD với ngày giữ cụ thể).
- `POST /admin/:id/release-hold` — admin hủy giữ phòng (HELD → AVAILABLE).
- `GET /admin/:id/contract-prefill` — dữ liệu điền sẵn khi tạo hợp đồng từ yêu cầu giữ chỗ.
- `POST /admin/:id/finalize-contract` — admin tạo khách thuê + hợp đồng từ giữ chỗ (tạo user/tenant khi cần).
- `POST /admin/:id/mark-rented` — admin đánh dấu phòng là RENTED (không tự tạo hợp đồng).

Luồng chính và tác động DB:
1. Public create (`POST /public`):
   - Kiểm tra `room_id`, `guest_name` và `guest_phone`/`guest_email` (ít nhất 1).
   - Nếu phòng `AVAILABLE`, tạo record `room_hold_requests` với `hold_kind` = `TEMP` hoặc `DEPOSIT`.
   - Gọi `lockRoomForHold()` để cập nhật `rooms` (status = `HELD`, `hold_until`, `active_hold_request_id`).
   - Với `TEMP`: `hold_until` = now + 15 phút (mặc định) và tự hết hạn bởi `expireStaleRoomHolds()`.
   - Với `DEPOSIT`: khách phải upload minh chứng.
   - DB thay đổi: insert `room_hold_requests`, update `rooms`.

2. Khách gửi ảnh minh chứng (`POST /public/:id/deposit-proof`):
   - Lưu file ảnh vào `uploads/hold-deposit-proofs` và lưu `deposit_proof_url`.
   - Set `deposit_submitted_at`, đổi `request_status` → `DEPOSIT_PENDING` và clear `hold_until` trên `rooms`.
   - DB thay đổi: update `room_hold_requests`, update `rooms`.

3. Admin xác minh / từ chối cọc:
   - `POST /admin/:id/verify-deposit`: cập nhật `request_status` → `DEPOSITED`, set `deposit_verified_at`, `deposit_verified_by`.
   - `POST /admin/:id/reject-deposit`: gọi `releaseRoomHold()` để mở phòng; cập nhật note và `request_status` → `CANCELLED`.
   - DB thay đổi: update `room_hold_requests`, update `rooms`.

4. Admin giữ phòng thủ công (`POST /admin/:id/hold-room`):
   - Chuyển `room_hold_requests.hold_kind` → `DEPOSIT`, cập nhật `hold_until` theo số ngày admin chọn, set `request_status` → `DEPOSITED` và record `deposit_verified_by`.
   - Update `rooms` thành `HELD`.

5. Admin finalize contract từ giữ chỗ (`POST /admin/:id/finalize-contract`):
   - Tạo user + tenant nếu cần (INSERT `users`, INSERT `tenants`).
   - Tạo `contracts` (INSERT `contracts`) với `status = 'ACTIVE'`.
   - Tạo thông báo (`notifications`) cho tenant và admin.
   - Update `room_hold_requests.request_status` → `COMPLETED` và update `rooms` → `RENTED`.
   - DB thay đổi: inserts vào `users` (tuỳ trường hợp), `tenants`, `contracts`, `notifications`; updates `room_hold_requests`, `rooms`.

6. Tự động hết hạn giữ chỗ:
   - Hàm `expireStaleRoomHolds()` xóa/huỷ các `TEMP` đã quá `hold_until` và không có `deposit_submitted_at`.
   - Khi expire: gọi `releaseRoomHold()` để set `request_status` = `CANCELLED` và set `rooms` → `AVAILABLE`.

Files để mở khi debug / review:
- `phong-tro-backend/src/routes/roomHolds.js` — toàn bộ logic liên quan giữ chỗ/đặt cọc.
- `phong-tro-backend/src/routes/contracts.js` — khi chuyển giữ chỗ → tạo hợp đồng: `POST /admin/:id/finalize-contract` gọi các hàm tạo contract.
- `phong-tro-backend/src/routes/_dbHelpers.js` — đảm bảo các bảng `rooms`, `users`, `tenants`, `contracts`.
- `phong-tro-backend/uploads/hold-deposit-proofs/` — nơi lưu file ảnh minh chứng.

Ghi chú nhanh:
- `room_hold_requests` có các cột bổ sung: `hold_kind`, `deposit_proof_url`, `deposit_submitted_at`, `deposit_verified_at`, `deposit_verified_by`.
- `rooms` có `hold_until` và `active_hold_request_id` để liên kết trạng thái giữ chỗ.
- Luồng `finalize-contract` sẽ cố gắng tái sử dụng tenant hiện tại (theo email/SĐT) hoặc tạo `users` + `tenants` mới và gửi thông tin đăng nhập cho khách.

---

## 11. Kết thúc

Tài liệu này liệt kê các luồng CRUD chính và vị trí code để mở khi cần debug hoặc thay đổi hành vi. Nếu bạn muốn, tôi có thể bổ sung sơ đồ sequence (Mermaid) cho từng luồng.
