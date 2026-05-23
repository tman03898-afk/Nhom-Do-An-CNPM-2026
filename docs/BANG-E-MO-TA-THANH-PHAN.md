# Bảng E — Mô tả các thành phần trong sơ đồ kiến trúc hệ thống (bản đầy đủ)

**Hệ thống:** The Sun — Quản lý phòng trọ  
**Mô hình:** Client–Server · Three-tier · Modular Monolith  
**Sơ đồ tham chiếu:** `docs/architecture-diagram-full.png`

---

| STT | Thành phần trên sơ đồ | Tầng / loại | Vị trí triển khai (code) | Mô tả chi tiết | Dữ liệu / giao tiếp chính |
|:---:|----------------------|-------------|---------------------------|----------------|---------------------------|
| 1 | HTTP Request | Luồng (Client) | Trình duyệt người dùng | Điểm khởi phát mọi tương tác web (truy cập trang, gửi form, upload file). Chỉ là kênh HTTP, không chứa logic nghiệp vụ. | Request → Frontend |
| 2 | Frontend — React SPA (Vite) | Presentation | `phong-tro-frontend/` | Ứng dụng một trang: hiển thị UI, điều hướng không reload toàn trang. Gọi REST API qua `lib/api.js`; không kết nối database trực tiếp. | JSON + JWT → API Gateway |
| 3 | Guest | Actor (Frontend) | `GuestRoute`, `HomePage`, `RoomDetailPage` | Khách chưa đăng nhập: xem danh sách/chi tiết phòng, gửi yêu cầu giữ chỗ hoặc đặt cọc. Dùng API public, không Bearer token. | Đọc `rooms`; ghi `room_hold_requests` |
| 4 | Admin | Actor (Frontend) | `AdminRoute`, `pages/admin/*` | Quản trị viên (`role=ADMIN`): quản lý phòng, tenant, HĐ, hóa đơn, thanh toán, dịch vụ, ticket, thống kê, duyệt giữ chỗ/cọc. | JWT ADMIN → toàn bộ API admin |
| 5 | Tenant | Actor (Frontend) | `TenantRoute`, `pages/tenant/*` | Khách thuê (`role=TENANT`): xem HĐ, hóa đơn, thanh toán, ticket, thông báo, đăng ký dịch vụ/phí, cập nhật hồ sơ. | JWT TENANT → API tenant |
| 6 | HTTP/JSON + JWT | Giao thức | Header `Authorization: Bearer` | Chuẩn REST: body JSON; token sau `POST /api/auth/login`; middleware server kiểm tra quyền từng route. | `{ ok, message, data }` |
| 7 | Backend Services Cluster | Application (nhóm) | `phong-tro-backend/`, `server.js` | Toàn bộ server: **một** tiến trình Node.js/Express (modular monolith), cổng 5000, nhiều module route. | — |
| 8 | API Gateway | Application (entry) | `src/app.js` | Cổng vào duy nhất: CORS, parse JSON (10MB), phục vụ `/uploads`, mount `/api`, routing tới module, xử lý lỗi 413. Vai trò tương đương gateway trong sơ đồ; triển khai bằng Express. | Phân luồng → Business Services |
| 9 | User Service | Business module | `auth.js`, `tenants.js`, `tenantProfile.js`, `adminProfile.js` | Quản lý danh tính: đăng nhập/đăng xuất, quên/đặt lại mật khẩu (OTP email), tạo tài khoản tenant, hồ sơ admin và tenant. | `users`, `tenants`, bảng OTP/reset |
| 10 | Room Service | Business module | `rooms.js` (`/api/rooms`), `assets.js` | Quản lý phòng trọ (CRUD, ảnh JSONB, trạng thái AVAILABLE/HELD/RENTED/MAINTENANCE) và tài sản trong phòng. Guest đọc; Admin ghi. | `rooms`, `assets` |
| 11 | Booking Service | Business module | `roomHolds.js` (`/api/room-holds`) | Giữ chỗ: TEMP (15 phút, tự hết hạn) hoặc DEPOSIT (upload bill, admin verify). Chốt thuê: prefill HĐ, finalize-contract, tạo user/tenant, gửi mật khẩu email/SMS. | `room_hold_requests`, cập nhật `rooms` |
| 12 | Contract Service | Business module | `contracts.js` | Hợp đồng thuê: admin tạo/sửa/xóa; tenant xem HĐ hiện tại. Liên kết Booking (sau finalize) và Room (RENTED). | `contracts` |
| 13 | Billing & Payment Service | Business module | `invoices.js`, `payments.js`, `services.js`, `tenantServiceSubscriptions.js`, `tenantFeeSubscriptions.js` | Chuỗi thu phí: cấu hình dịch vụ, chỉ số điện–nước (bậc thang), đăng ký dịch vụ/phí → tạo hóa đơn → tenant nộp thanh toán → admin duyệt. | `invoices`, `payments`, `services`, `utility_readings`, subscriptions |
| 14 | Operations Service | Business module | `incidents.js`, `notifications.js` | Vận hành: ticket sự cố (admin/tenant, biên lai); thông báo hệ thống (broadcast, inbox, đếm chưa đọc). | `incidents`, `notifications` |
| 15 | Analytics Service | Business module | `analytics.js` | Thống kê admin: tổng quan, thu tiền, chuỗi theo tháng, badge menu (số pending). | Truy vấn tổng hợp từ invoices, payments, rooms |
| 16 | Routes Layer | Internal (mỗi module) | `src/routes/*.js` | Khai báo endpoint HTTP, gắn middleware (`requireAuth`, `requireAdmin`, `requireTenant`). | Entry request vào module |
| 17 | Controller Layer | Internal | Handler `async (req, res)` trong route | Kiểm tra dữ liệu đầu vào, điều phối nghiệp vụ, trả mã HTTP và JSON. Logic nằm trong route (không tách thư mục controllers riêng). | req → res |
| 18 | Service Layer | Internal | `services/mail.js`, `sms.js`, `tenantCredentials.js`; `utils/*` | Tái sử dụng: gửi email/SMS, cấp credential tenant, tính giá điện–nước, rate limit. | Gọi từ controller |
| 19 | Database Layer | Internal | `config/db.js` (pg Pool) | Thực thi SQL, transaction; khởi tạo schema qua `_dbHelpers.js`, `_schemaCache.js`. | SQL ↔ PostgreSQL |
| 20 | PostgreSQL (Shared Database) | Data | PostgreSQL server | Một CSDL dùng chung cho tất cả Business Service; lưu quan hệ user–tenant–room–contract–invoice–hold–ticket. | Toàn bộ bảng nghiệp vụ |
| 21 | uploads/ (bổ sung) | File storage | `phong-tro-backend/uploads`, `GET /uploads/*` | Lưu ảnh phòng, minh chứng cọc/thanh toán; không lưu trong bảng DB (chỉ URL). | File trên disk |

---

## Chú thích hình (đề xuất chèn Word)

> *Hình X — Sơ đồ kiến trúc hệ thống The Sun theo mô hình Client–Server, ba tầng, backend modular monolith. Frontend React SPA gửi HTTP/JSON (JWT) tới API Gateway Express; Gateway định tuyến tới bảy nhóm nghiệp vụ: User, Room, Booking, Contract, Billing & Payment, Operations, Analytics; mỗi nhóm tuân kiến trúc nội bộ Routes – Controller – Service – Database; dữ liệu lưu tập trung tại PostgreSQL.*

---

*Phiên bản: đầy đủ 7 Business Service — đối chiếu `src/app.js` tháng 5/2026.*
