# Báo cáo các nội dung còn thiếu trên giao diện so với Yêu cầu (yc.md)

Dựa trên bảng đối chiếu giữa các Use Case trong file `yc.md` và mã nguồn thực tế, dưới đây là danh sách các tính năng **còn thiếu** (chưa được triển khai trên giao diện người dùng):

---

## Phần I. Giao diện Admin

### 1. Quản lý khách thuê (`TenantManagePage.jsx`)
*   **Cập nhật/chỉnh sửa khách thuê**: Trang quản lý khách thuê hiện tại chỉ có nút "Thêm khách" và biểu tượng "Xóa" (thùng rác). Hoàn toàn chưa có nút hay form để Admin có thể cập nhật/sửa thông tin (tên, số điện thoại, email) của khách thuê đã tồn tại.

### 2. Quản lý hợp đồng (`ContractManagePage.jsx`)
*   **Cập nhật/chỉnh sửa hợp đồng**: Trang quản lý hợp đồng cung cấp các chức năng Thêm hợp đồng mới, Thanh lý hợp đồng, và Xuất file. Tuy nhiên, chưa có thao tác để Admin "Sửa" một hợp đồng (ví dụ: sửa ngày kết thúc, sửa tiền cọc) khi lỡ nhập sai.

### 3. Quản lý hóa đơn (`InvoiceManagePage.jsx`)
*   **Cập nhật/chỉnh sửa hóa đơn**: Mặc dù Admin có thể nhập lại chỉ số điện nước (hệ thống sẽ ghi đè tính lại), nhưng không có nút "Sửa hóa đơn" độc lập để tùy biến các khoản thu khác (ví dụ giảm giá đột xuất) sau khi hóa đơn đã được tạo.
*   **Hủy hóa đơn**: Trong mã nguồn có trạng thái `CANCELLED` (đã hủy) để phục vụ cho các bộ lọc hoặc biểu đồ, nhưng trên UI của bảng danh sách hóa đơn không hề có nút hành động "Hủy hóa đơn" nào để Admin thực hiện tác vụ này.

### 4. Quản lý thông báo (`NotificationManagePage.jsx`)
*   **Xóa thông báo**: Trang thông báo có giao diện soạn thảo thông báo và danh sách thông báo đã nhận. Tuy nhiên đối với Admin, không có chức năng "Xóa" một thông báo đã gửi đi.

### 5. Quản lý hệ thống (Tính năng chung)
*   **Cập nhật thông tin cá nhân (Admin)**: File `yc.md` yêu cầu Admin có quyền cập nhật thông tin cá nhân và khôi phục mật khẩu. Hiện tại hệ thống chưa có trang Profile (Hồ sơ) hoặc Settings riêng biệt dành cho tài khoản Admin trên sidebar để thực hiện các thao tác này.

---

## Phần II. Giao diện Tenant (Người thuê)

### 1. Quản lý phòng & Quản lý tài sản
*   **Tra cứu chi tiết phòng và tài sản**: File `yc.md` định nghĩa Tenant có quyền *Tra cứu và xem phòng (phòng của mình)* và *Tra cứu và xem tài sản (phòng của mình)*. Tuy nhiên, hiện tại Tenant chỉ thấy được "Số phòng" nằm trên hợp đồng (trang `ContractPage`) hoặc Dashboard. **Chưa có khu vực nào** cho phép Tenant xem chi tiết về phòng (diện tích, mô tả) hay liệt kê các tài sản, nội thất bàn giao kèm theo phòng.
*   **💡 Hướng giải quyết đề xuất**: Không cần tạo trang mới rườm rà. Nên tích hợp chức năng này thẳng vào trang `ContractPage.jsx` (bằng cách thêm một khu vực hoặc Tab "Tài sản bàn giao" bên dưới hợp đồng), vì tài sản thường đi liền với hợp đồng thuê nhà.

### 2. Quản lý hợp đồng (`ContractPage.jsx` - Tenant)
*   **Tải/Xuất hợp đồng PDF**: Giao diện đã hiển thị thông tin hợp đồng rất đầy đủ và có sẵn một nút giao diện là **"Tải PDF"** ở góc phải trang. Tuy nhiên nút này hiện tại chỉ làm cảnh (mock UI), chưa được gắn sự kiện `onClick` để gọi API tải file PDF thật.

---

## Phần III. Các thành phần giao diện tĩnh (Mock Data / Hardcode) cần dọn dẹp
Ngoài các tính năng trong `yc.md`, trong quá trình rà soát mã nguồn Admin đã phát hiện một số trang vẫn còn chứa các khối giao diện (UI) dùng dữ liệu giả (Hardcoded). Cần được thay thế bằng dữ liệu thật từ API hoặc gỡ bỏ:

1. **Bảng điều khiển (`DashboardPage.jsx`)**
   *   **Biểu đồ "Doanh thu tháng"**: Đang dùng ảnh SVG tĩnh vẽ tay, chưa dùng thư viện (như Recharts) để load dữ liệu thật.
   *   **Hoạt động gần đây**: Đang hiển thị dòng text tĩnh cứng ("Đang cập nhật hoạt động...").

2. **Quản lý thanh toán (`PaymentManagePage.jsx`)**
   *   Cuối trang có 2 thẻ bị hardcode dữ liệu hoàn toàn:
       *   **Thống kê doanh thu tháng 9**: Đang điền cứng "Tăng 12.5% so với tháng trước" và "452.800.000 VND".
       *   **Trạng thái thu hộ**: Các thanh tiến độ "Tiền phòng 85%", "Dịch vụ 62%" đều là dữ liệu tĩnh.

3. **Quản lý phòng (`RoomManagePage.jsx`)**
   *   Cuối trang có 2 thẻ UI demo tĩnh cứng:
       *   **Phân tích thị trường**: Chứa text giả "Xu hướng tăng trưởng mạnh", "tăng 15%".
       *   **Căn hộ cao cấp (Penthouse)**: Dùng ảnh dummy và text "+12 Đăng ký xem".

---

## Phần IV. Các thành phần giao diện tĩnh (Mock Data / Hardcode) bên Tenant
Tương tự như Admin, giao diện Tenant cũng còn sót lại một số thành phần dùng dữ liệu tĩnh:

1. **Bảng điều khiển (`DashboardPage.jsx` - Tenant)**
   *   **Banner Quảng cáo**: Thẻ "Nâng cấp không gian sống" (dùng ảnh nội thất Unsplash) hiện tại chỉ là demo tĩnh.

2. **Hợp đồng thuê nhà (`ContractPage.jsx`)**
   *   **Điều khoản & Quy định**: Toàn bộ mảng quy định (`const rules = [...]`) như "Thanh toán trước ngày 05...", "Giờ giấc tự do..." đang bị hardcode cứng trong code frontend. Thực tế thông tin này nên được lưu trên Database (quy định chung của khu trọ).
   *   **Hình ảnh trang trí căn hộ**: Khối "Căn hộ đã được kiểm định an toàn" đang dùng ảnh Unsplash mặc định thay vì ảnh thực tế của phòng.

3. **Hồ sơ cá nhân (`ProfilePage.jsx`)**
   *   **Hotline CSKH**: Số điện thoại "1800 1234" đang bị điền cứng. Thay vào đó nên lấy từ cấu hình hệ thống (ví dụ sử dụng biến môi trường `import.meta.env.VITE_SUPPORT_HOTLINE`).
