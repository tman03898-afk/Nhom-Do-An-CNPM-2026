# 🏠 The Sun Apartment — Frontend (frontend-dev)

Giao diện người dùng cho hệ thống quản lý phòng trọ **The Sun Apartment**, xây dựng bằng React 19 + Vite + Tailwind CSS.

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
| React | ^19.2.4 | UI framework |
| Vite | ^8.0.1 | Build tool |
| Tailwind CSS | ^3.4.19 | Styling |
| React Router DOM | ^7.14.0 | Routing & phân quyền |
| Recharts | ^3.8.1 | Biểu đồ thống kê |
| jsPDF | ^4.2.1 | Xuất PDF |
| jspdf-autotable | ^5.0.7 | Bảng trong PDF |
| lucide-react | ^1.7.0 | Icons |
| vite-plugin-pwa | ^1.3.0 | Progressive Web App |

---

## 📁 Cấu trúc thư mục

```
phong-tro-frontend/
│
├── public/                      # Tài nguyên tĩnh (favicon, images...)
│
├── src/
│   ├── components/              # Component dùng chung
│   │   ├── common/              # Header, Footer...
│   │   ├── invoice/             # Component hiển thị hóa đơn, điện nước
│   │   └── rooms/               # Modal giữ chỗ, quản lý phòng
│   │
│   ├── context/
│   │   ├── AuthContext.jsx      # Quản lý trạng thái đăng nhập
│   │   └── ToastContext.jsx     # Thông báo toast toàn cục
│   │
│   ├── layouts/
│   │   ├── AdminLayout.jsx      # Layout dành cho admin
│   │   └── TenantLayout.jsx     # Layout dành cho khách thuê
│   │
│   ├── lib/                     # Helper & tiện ích
│   │   ├── api.js               # Axios instance & API calls
│   │   ├── apiCache.js          # Cache API response
│   │   ├── contractRules.js     # Logic kiểm tra hợp đồng
│   │   ├── exportContractPdf.js # Xuất hợp đồng ra PDF
│   │   ├── guestRoomMedia.js    # Media phòng trọ cho guest
│   │   ├── roomHero.jsx         # Hero image phòng
│   │   ├── roomHolds.js         # Logic giữ chỗ
│   │   ├── supportContact.js    # Thông tin liên hệ hỗ trợ
│   │   └── ticketReceipt.js     # Biên lai sự cố
│   │
│   ├── pages/
│   │   ├── guest/               # Trang công khai (chưa đăng nhập)
│   │   │   ├── HomePage.jsx     # Trang chủ & danh sách phòng
│   │   │   └── RoomDetailPage.jsx  # Chi tiết phòng & giữ chỗ
│   │   │
│   │   ├── auth/                # Xác thực
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   │
│   │   ├── tenant/              # Trang dành cho khách thuê
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ContractPage.jsx
│   │   │   ├── InvoicePage.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── ServicesPage.jsx
│   │   │   ├── TicketPage.jsx
│   │   │   ├── NotificationPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   │
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
│   │
│   ├── routes/
│   │   └── AppRouter.jsx        # Router chính & phân quyền
│   │
│   ├── utils/                   # Tiện ích
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── .env                         # Biến môi trường (không commit)
├── index.html
├── vite.config.js               # Cấu hình Vite + PWA
├── tailwind.config.js
└── package.json
```

---

## ⚙️ Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js >= 18
- npm >= 9
- Backend đang chạy (xem nhánh `be-dev`)

### Các bước

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

**5. Build production**
```bash
npm run build
```

---

## 🗺️ Các màn hình

### 👤 Guest (Chưa đăng nhập)
| Màn hình | Đường dẫn |
|----------|-----------|
| Trang chủ & danh sách phòng | `/` |
| Chi tiết phòng & giữ chỗ | `/rooms/:id` |

### 🔐 Auth
| Màn hình | Đường dẫn |
|----------|-----------|
| Đăng nhập | `/login` |
| Quên mật khẩu | `/forgot-password` |
| Đặt lại mật khẩu | `/reset-password` |

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

## 📌 Ghi chú
- App hỗ trợ **PWA** — có thể cài đặt trên điện thoại như native app
- Tên app: **The Sun Apartment** (short: The Sun)
- Theme color: `#14B8A6` (teal)
- Backend API URL cấu hình qua biến `VITE_API_URL` trong `.env`
- Không commit file `.env` lên Git
- Backend repo nằm ở nhánh `be-dev`
- Nhánh `main` chứa toàn bộ project (frontend + backend)