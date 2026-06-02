# 🏠 The Sun Apartment — Backend (be-dev)

API server cho hệ thống quản lý phòng trọ **The Sun Apartment**, xây dựng bằng Node.js + Express + PostgreSQL.

---

## 👥 Thành viên nhóm

| Họ tên | MSSV | Vai trò |
|--------|------|---------|
| Đào Thanh Mân | 24521039 | Frontend |
| Nguyễn Hoàng Quân | 24521440 | Backend |
| Nguyễn Xuân Thịnh | 24521701 | Database |

---

## 🛠️ Tech Stack

| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| Node.js | >= 18 | Runtime |
| Express | ^5.2.1 | Web framework |
| PostgreSQL | — | Database (Supabase) |
| jsonwebtoken | ^9.0.3 | JWT Authentication |
| bcryptjs | ^3.0.3 | Mã hoá mật khẩu |
| Multer | ^2.1.1 | Upload file |
| Nodemailer | ^8.0.7 | Gửi email |
| Twilio | ^6.0.2 | Gửi SMS |
| dotenv | ^17.4.2 | Biến môi trường |
| nodemon | ^3.1.14 | Dev auto-reload |

---

## 📁 Cấu trúc thư mục

```
phong-tro-backend/
│
├── src/
│   ├── routes/                  # Định nghĩa API endpoints
│   │   ├── auth.js              # Xác thực & phân quyền (login, register...)
│   │   ├── rooms.js             # Quản lý phòng trọ
│   │   ├── roomHolds.js         # Giữ chỗ & đặt cọc
│   │   ├── tenants.js           # Quản lý khách thuê
│   │   ├── tenantProfile.js     # Hồ sơ cá nhân khách thuê
│   │   ├── contracts.js         # Hợp đồng thuê phòng
│   │   ├── invoices.js          # Hóa đơn hàng tháng
│   │   ├── payments.js          # Thanh toán
│   │   ├── services.js          # Dịch vụ phụ thu
│   │   ├── tenantServiceSubscriptions.js  # Đăng ký dịch vụ
│   │   ├── tenantFeeSubscriptions.js      # Đăng ký phí cố định
│   │   ├── incidents.js         # Báo cáo sự cố
│   │   ├── notifications.js     # Thông báo
│   │   ├── assets.js            # Tài sản phòng
│   │   ├── analytics.js         # Báo cáo & thống kê
│   │   ├── adminProfile.js      # Hồ sơ admin
│   │   ├── adminRemovalLog.js   # Lịch sử xoá tài khoản
│   │   └── zalo.js              # Tích hợp Zalo
│   │
│   ├── config/
│   │   └── db.js                # Kết nối PostgreSQL
│   │
│   ├── middleware/              # Middleware xác thực, upload...
│   ├── services/
│   │   ├── mail.js              # Gửi email (Nodemailer)
│   │   ├── sms.js               # Gửi SMS (Twilio)
│   │   └── tenantCredentials.js # Tạo thông tin đăng nhập khách
│   │
│   ├── utils/
│   │   ├── electricityTierPricing.js  # Tính tiền điện bậc thang
│   │   └── waterTierPricing.js        # Tính tiền nước bậc thang
│   │
│   └── app.js                   # Khởi tạo Express app
│
├── scripts/                     # Script tiện ích
│   ├── bootstrap-admin.js       # Tạo tài khoản admin đầu tiên
│   ├── reset-admin-password.js  # Reset mật khẩu admin
│   ├── seed-rooms-tenants.js    # Seed dữ liệu mẫu
│   ├── add-available-rooms.js   # Thêm phòng trống
│   └── seed-guest-showcase-rooms.js  # Seed phòng showcase
│
├── uploads/                     # File upload (ảnh, biên lai...)
├── .env                         # Biến môi trường (không commit)
├── server.js                    # Entry point
└── package.json
```

---

## ⚙️ Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js >= 18
- npm >= 9
- PostgreSQL (hoặc tài khoản Supabase)

### Các bước

**1. Di chuyển vào thư mục backend**
```bash
cd phong-tro-backend
```

**2. Cài đặt dependencies**
```bash
npm install
```

**3. Tạo file `.env`**
```env
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret
```

**4. Tạo tài khoản admin đầu tiên**
```bash
npm run bootstrap-admin
```

**5. (Tuỳ chọn) Seed dữ liệu mẫu**
```bash
npm run seed-demo-data
npm run seed-guest-rooms
```

**6. Chạy server**
```bash
# Development (nodemon - auto reload)
npm run dev

# Production
npm start
```

Server chạy tại `http://localhost:3000`

---

## 🔌 API Endpoints chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/login` | Đăng nhập |
| GET | `/api/rooms` | Danh sách phòng |
| GET | `/api/rooms/:id` | Chi tiết phòng |
| POST | `/api/room-holds` | Giữ chỗ phòng |
| GET | `/api/tenants` | Danh sách khách thuê |
| GET | `/api/contracts` | Danh sách hợp đồng |
| GET | `/api/invoices` | Danh sách hóa đơn |
| POST | `/api/payments` | Ghi nhận thanh toán |
| GET | `/api/incidents` | Danh sách sự cố |
| POST | `/api/notifications` | Gửi thông báo |
| GET | `/api/analytics` | Báo cáo & thống kê |

---

## 🗄️ Database Schema

Database sử dụng **PostgreSQL** với các bảng chính:

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản người dùng (admin & tenant) |
| `tenants` | Thông tin khách thuê |
| `rooms` | Thông tin phòng trọ |
| `contracts` | Hợp đồng thuê phòng |
| `invoices` | Hóa đơn hàng tháng |
| `payments` | Lịch sử thanh toán |
| `service_fees` | Danh mục dịch vụ & phí |
| `utility_readings` | Chỉ số điện nước |
| `incidents` | Báo cáo sự cố |
| `notifications` | Thông báo hệ thống |
| `assets` | Tài sản trong phòng |

Chi tiết schema xem tại [`DB_SCHEMA_CURRENT.md`](./phong-tro-backend/DB_SCHEMA_CURRENT.md).

---

## 📌 Ghi chú
- File `.env` **không được commit** lên Git
- File ảnh upload lưu tại `uploads/`
- Frontend repo nằm ở nhánh `frontend-dev`
- Nhánh `main` chứa toàn bộ project (frontend + backend)
