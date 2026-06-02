**- Bảng trách nhiệm yêu cầu nghiệp vụ:**

| **STT** | **Tên yêu cầu** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Quản lý hệ thống | Admin/Tenant: Đăng nhập (BM 1.1), cung cấp thông tin tạo/sửa tài khoản khách (BM 1.2, 1.3). | Xác thực email đăng nhập (QĐ 1.1), kiểm tra các quy định tạo/xóa tài khoản (QĐ 1.2, QĐ 1.3) và lưu vào CSDL. | Bảo mật |
| 2 | Quản lý phòng trọ | Admin: Cung cấp thông tin phòng (BM 2.1) hoặc thông tin tài sản (BM 2.2). | Kiểm tra quy định QĐ 2.1, QĐ 2.2. Ghi nhận thông tin phòng và danh mục thiết bị vào CSDL. | |
| 3 | Quản lý khách thuê | Admin: Cung cấp hoặc chỉnh sửa hồ sơ thông tin khách thuê (BM 3). | Kiểm tra định dạng liên lạc (QĐ 3). Cập nhật hồ sơ cá nhân của khách trong hệ thống. | |
| 4 | Giữ chỗ & Đặt cọc | Guest: Gửi yêu cầu giữ chỗ (BM 4.1) và upload biên lai cọc (BM 4.2). | Tự động đổi phòng sang `HELD` và kích hoạt đếm ngược 15 phút. | Tự động hóa |
| 5 | Quản lý hợp đồng | Admin: Điền thông tin phòng, khách thuê đại diện và tiền đặt cọc (BM 5). | Kiểm tra quy định QĐ 5 (chỉ 1 HĐ ACTIVE/phòng). Ghi nhận hợp đồng và đổi trạng thái phòng sang "RENTED". | Tự động cập nhật |
| 6 | Quản lý dịch vụ | Admin: Chọn phòng/khách đăng ký dịch vụ phụ (BM 6.2) và chốt số điện nước thực tế. | Kiểm tra tính liên tục số liệu. Lưu trữ thông tin và cộng dồn vào hóa đơn tổng. | |
| 7 | Hóa đơn & thanh toán | Admin/Tenant: Xác nhận lập hóa đơn (BM 7.1) hoặc gửi minh chứng (BM 7.2), Admin duyệt (BM 7.3). | Tính tiền phòng + dịch vụ + điện nước tự động (QĐ 7.1). Ghi nhận giao dịch đóng tiền và đổi sang "PAID". | Tự động tính toán |
| 8 | Quản lý sự cố & bảo trì | Tenant gửi báo sự cố (BM 8.1). Admin tiếp nhận xử lý (BM 8.2). | Ghi nhận sự cố, chuyển đổi trạng thái xử lý (QĐ 8: OPEN, IN_PROGRESS, RESOLVED, CLOSED). | Tương tác hai chiều |
| 9 | Quản lý thông báo | Admin: Soạn tiêu đề, nội dung và chọn đối tượng nhận thông báo (BM 9.1). | Kiểm tra quy định QĐ 9.1. Phát thông báo thời gian thực đến khách thuê hợp lệ. | |
| 10 | Báo cáo & thống kê | Admin: Chọn thời gian báo cáo, yêu cầu xuất dữ liệu (BM 10.1, BM 10.2). | Tính toán doanh thu, phòng trống theo QĐ 10. Kết xuất biểu đồ và tệp CSV. | Có xuất file CSV |