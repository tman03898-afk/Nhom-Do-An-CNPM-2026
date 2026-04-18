# 🏠 Hệ Thống Quản Lý Phòng Trọ

Web application hỗ trợ chủ trọ quản lý phòng, khách thuê, hóa đơn và các dịch vụ một cách tập trung, hiệu quả.

---

## 👥 Thành viên nhóm

| Họ tên | MSSV | Vai trò |
|--------|------|---------|
| Nguyễn Văn A | 123456 | Frontend |
| Nguyễn Văn B | 123457 | Backend |
| Nguyễn Văn C | 123458 | Database |

---

## 🛠️ Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | TBD |
| Database | MySQL |
| Thiết kế UI | Lovable.dev + Figma |

---

## 📁 Cấu trúc thư mục Frontend

```
phong-tro-frontend/
│
├── public/
│   └── images/                  # Ảnh tĩnh (logo, placeholder...)
│
├── src/
│   ├── assets/                  # Font, icon, ảnh dùng trong code
│   │
│   ├── components/              # Component dùng chung nhiều nơi
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── CustomSelect.jsx
│   │   │   └── ScrollToTop.jsx
│   │   ├── room/
│   │   │   ├── RoomCard.jsx
│   │   │   ├── RoomFilter.jsx
│   │   │   └── RoomDetail.jsx
│   │   ├── invoice/
│   │   │   ├── InvoiceCard.jsx
│   │   │   └── InvoiceTable.jsx
│   │   └── ticket/
│   │       └── TicketCard.jsx
│   │
│   ├── pages/                   # Các trang chính
│   │   ├── guest/
│   │   │   ├── HomePage.jsx
│   │   │   └── RoomDetailPage.jsx
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   ├── tenant/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ContractPage.jsx
│   │   │   ├── InvoicePage.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── TicketPage.jsx
│   │   │   └── NotificationPage.jsx
│   │   └── admin/
│   │       ├── DashboardPage.jsx
│   │       ├── RoomManagePage.jsx
│   │       ├── TenantManagePage.jsx
│   │       ├── InvoiceManagePage.jsx
│   │       ├── ServiceManagePage.jsx
│   │       ├── TicketManagePage.jsx
│   │       └── NotificationManagePage.jsx
│   │
│   ├── routes/                  # Cấu hình routing & phân quyền
│   │   ├── AppRouter.jsx        # Router chính
│   │   ├── GuestRoute.jsx       # Route public
│   │   ├── TenantRoute.jsx      # Route cần đăng nhập (tenant)
│   │   └── AdminRoute.jsx       # Route cần đăng nhập (admin)
│   │
│   ├── services/                # [Sẵn sàng cho phát triển]
│   │
│   ├── hooks/                   # [Sẵn sàng cho phát triển]
│   │
│   ├── context/                 # Global state
│   │   ├── AuthContext.jsx      # Lưu thông tin user đăng nhập
│   │   └── ToastContext.jsx     # Xử lý thông báo toast
│   │
│   ├── utils/                   # [Sẵn sàng cho phát triển]
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                # Tailwind imports
│
├── .env                         # Biến môi trường (API URL...)
├── .env.example                 # Mẫu file .env
├── .gitignore
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## ⚙️ Hướng dẫn cài đặt & chạy Frontend

### Yêu cầu
- Node.js >= 18
- npm >= 9

### Các bước

**1. Clone repo về máy**
```bash
git clone https://github.com/your-username/phong-tro-frontend.git
cd phong-tro-frontend
```

**2. Cài đặt dependencies**
```bash
npm install
```

**3. Tạo file .env**
```bash
cp .env.example .env
```
Chỉnh sửa file `.env`:
```
VITE_API_URL=http://localhost:8000/api
```

**4. Chạy project**
```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

---

## 🗺️ Các màn hình chính

| Màn hình | Đường dẫn | Actor |
|----------|-----------|-------|
| Trang chủ | `/` | Guest |
| Chi tiết phòng | `/rooms/:id` | Guest |
| Đăng nhập | `/login` | Tenant, Admin |
| Dashboard Tenant | `/tenant/dashboard` | Tenant |
| Hóa đơn | `/tenant/invoices` | Tenant |
| Hợp đồng | `/tenant/contract` | Tenant |
| Báo cáo sự cố | `/tenant/tickets` | Tenant |
| Thông báo | `/tenant/notifications` | Tenant |
| Dashboard Admin | `/admin/dashboard` | Admin |
| Quản lý phòng | `/admin/rooms` | Admin |
| Quản lý khách thuê | `/admin/tenants` | Admin |
| Quản lý hóa đơn | `/admin/invoices` | Admin |
| Quản lý dịch vụ | `/admin/services` | Admin |
| Quản lý yêu cầu | `/admin/tickets` | Admin |
| Gửi thông báo | `/admin/notifications` | Admin |

---

## 📌 Ghi chú
- Backend URL cấu hình trong file `.env`
- Backend chưa chốt công nghệ, cập nhật sau
- Chỉnh lại tên thành viên, MSSV và GitHub username trước khi nộp