# 🏠 The Sun Apartment — Hệ Thống Quản Lý Phòng Trọ

Web application hỗ trợ chủ trọ quản lý phòng, khách thuê, hợp đồng, hóa đơn, dịch vụ và sự cố một cách tập trung, hiệu quả.

---

## 👥 Thành viên nhóm

| Họ tên | MSSV | Vai trò |
|--------|------|---------|
| Đào Thanh Mân | 24521039 | Frontend |
| Nguyễn Hoàng Quân | 24521440 | Backend |
| Nguyễn Xuân Thịnh | 24521701 | Database |

---

## 🛠️ Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 19 (Vite 8) + Tailwind CSS 3 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (jsonwebtoken) |
| File Upload | Multer |
| Email | Nodemailer |
| SMS | Twilio |
| PWA | vite-plugin-pwa |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable |

---

## 📁 Cấu trúc thư mục

```
Mau2/
├── phong-tro-frontend/     # React + Vite frontend
├── phong-tro-backend/      # Node.js + Express backend
└── docs/                   # Tài liệu dự án
```

### Frontend (`phong-tro-frontend/`)

```
phong-tro-frontend/
│
├── public/                      # Tài nguyên tĩnh
│
├── src/
│   ├── components/              # Component dùng chung
│   ├── context/                 # Global state (AuthContext, ToastContext...)
│   ├── layouts/                 # Layout wrapper
│   ├── lib/                     # Thư viện / helpers
│   ├── pages/
│   │   ├── guest/               # Trang dành cho khách chưa đăng nhập
│   │   ├── auth/                # Đăng nhập / xác thực
│   │   ├── tenant/              # Trang dành cho khách thuê
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ContractPage.jsx
│   │   │   ├── InvoicePage.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── ServicesPage.jsx
│   │   │   ├── TicketPage.jsx
│   │   │   ├── NotificationPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   └── admin/               # Trang dành cho quản trị viên
│   │       ├── DashboardPage.jsx
│   │       ├── RoomManagePage.jsx
│   │       ├── TenantManagePage.jsx
│   │       ├── ContractManagePage.jsx
│   │       ├── InvoiceManagePage.jsx
│   │       ├── PaymentManagePage.jsx
│   │       ├── ServiceManagePage.jsx
│   │       ├── AssetManagePage.jsx
│   │       ├── TicketManagePage.jsx
│   │       ├── NotificationManagePage.jsx
│   │       ├── AnalyticsPage.jsx
│   │       ├── AdminProfilePage.jsx
│   │       └── RemovalHistoryPage.jsx
│   ├── routes/                  # Cấu hình routing & phân quyền
│   ├── utils/                   # Tiện ích
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── .env                         # Biến môi trường
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### Backend (`phong-tro-backend/`)

```
phong-tro-backend/
│
├── src/
│   ├── routes/                  # Định nghĩa API endpoints
│   │   ├── auth.js              # Xác thực & phân quyền
│   │   ├── rooms.js             # Quản lý phòng
│   │   ├── roomHolds.js         # Giữ chỗ & đặt cọc
│   │   ├── tenants.js           # Quản lý khách thuê
│   │   ├── tenantProfile.js     # Hồ sơ khách thuê
│   │   ├── contracts.js         # Hợp đồng thuê
│   │   ├── invoices.js          # Hóa đơn
│   │   ├── payments.js          # Thanh toán
│   │   ├── services.js          # Dịch vụ phụ thu
│   │   ├── incidents.js         # Báo cáo sự cố
│   │   ├── notifications.js     # Thông báo
│   │   ├── assets.js            # Tài sản phòng
│   │   ├── analytics.js         # Báo cáo & thống kê
│   │   ├── adminProfile.js      # Hồ sơ admin
│   │   ├── adminRemovalLog.js   # Lịch sử xoá admin
│   │   └── zalo.js              # Tích hợp Zalo
│   ├── config/                  # Cấu hình DB
│   ├── middleware/              # Middleware (auth, upload...)
│   ├── services/                # Business logic
│   ├── utils/                   # Tiện ích
│   └── app.js                   # Khởi tạo Express app
│
├── scripts/                     # Script tiện ích
│   ├── bootstrap-admin.js       # Tạo tài khoản admin đầu tiên
│   ├── reset-admin-password.js  # Reset mật khẩu admin
│   └── seed-*.js                # Seed dữ liệu mẫu
│
├── uploads/                     # File upload (ảnh, biên lai...)
├── .env                         # Biến môi trường
├── server.js                    # Entry point
└── package.json
```

---

## ⚙️ Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js >= 18
- npm >= 9
- PostgreSQL (hoặc kết nối Supabase)

---

### 🖥️ Backend

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
# Development (nodemon)
npm run dev

# Production
npm start
```

Server chạy tại `http://localhost:3000` (hoặc port trong `.env`)

---

### 🌐 Frontend

**1. Di chuyển vào thư mục frontend**
```bash
cd phong-tro-frontend
```

**2. Cài đặt dependencies**
```bash
npm install
```

**3. Tạo file `.env`**
```env
VITE_API_URL=http://localhost:3000/api
```

**4. Chạy project**
```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

---

## 🗺️ Các màn hình chính

### 👤 Guest (Chưa đăng nhập)
| Màn hình | Đường dẫn |
|----------|-----------|
| Trang chủ & danh sách phòng | `/` |
| Chi tiết phòng | `/rooms/:id` |

### 🔐 Auth
| Màn hình | Đường dẫn |
|----------|-----------|
| Đăng nhập | `/login` |

### 🏠 Tenant (Khách thuê)
| Màn hình | Đường dẫn |
|----------|-----------|
| Dashboard | `/tenant/dashboard` |
| Hợp đồng | `/tenant/contract` |
| Hóa đơn | `/tenant/invoices` |
| Thanh toán | `/tenant/payment` |
| Dịch vụ đăng ký | `/tenant/services` |
| Báo cáo sự cố | `/tenant/tickets` |
| Thông báo | `/tenant/notifications` |
| Hồ sơ cá nhân | `/tenant/profile` |

### ⚙️ Admin (Quản trị viên)
| Màn hình | Đường dẫn |
|----------|-----------|
| Dashboard & tổng quan | `/admin/dashboard` |
| Quản lý phòng | `/admin/rooms` |
| Quản lý khách thuê | `/admin/tenants` |
| Quản lý hợp đồng | `/admin/contracts` |
| Quản lý hóa đơn | `/admin/invoices` |
| Quản lý thanh toán | `/admin/payments` |
| Quản lý dịch vụ | `/admin/services` |
| Quản lý tài sản | `/admin/assets` |
| Quản lý sự cố | `/admin/tickets` |
| Gửi thông báo | `/admin/notifications` |
| Báo cáo & thống kê | `/admin/analytics` |
| Hồ sơ admin | `/admin/profile` |
| Lịch sử xoá tài khoản | `/admin/removal-history` |

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
- App hỗ trợ **PWA** (Progressive Web App) — có thể cài đặt trên điện thoại
- File ảnh upload được lưu tại `phong-tro-backend/uploads/`
- Backend URL cấu hình qua biến `VITE_API_URL` trong `.env` của frontend
- Không commit file `.env` lên Git
