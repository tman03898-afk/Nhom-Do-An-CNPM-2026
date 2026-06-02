# CHI TIẾT DFD VÀ THUẬT TOÁN 25 NGHIỆP VỤ

## 1. Quản lý hệ thống

### 1.1. Đăng nhập & Đăng xuất hệ thống
▶ Mô tả luồng dữ liệu:
• D1: Email đăng nhập, mật khẩu.
• D2: Không có.
• D3: Danh sách tài khoản hiện có.
• D4: Xóa phiên (nếu đăng xuất).
• D5: Thông tin phiên làm việc hoặc quyền hạn được cấp.
• D6: Thông báo: “Đăng nhập thành công” hoặc “Sai tên đăng nhập/mật khẩu”.

▶ Thuật toán:
• B1: Nhận D1 từ người dùng (Admin, Tenant).
• B2: Kết nối cơ sở dữ liệu.
• B3: Đọc D3 từ bộ nhớ phụ.
• B4: Kiểm tra quy định: Email tài khoản đã tồn tại chưa? Mật khẩu đã khớp chưa?
• B5: Nếu không thỏa mãn bất kỳ điều kiện nào ở B4, trả D6 (Báo lỗi) và đi đến bước 9 (Kết thúc).
• B6: Kiểm tra trạng thái tài khoản active/inactive:
  – Nếu active: Cấp quyền truy cập (D5) theo vai trò của tài khoản.
  – Nếu inactive: Trả D6 (Báo lỗi) và đi đến bước 9 (Kết thúc).
• B7: Trả D6 (Thông báo thành công) và chuyển hướng vào màn hình chính.
• B8: Đóng kết nối cơ sở dữ liệu.
• B9: Kết thúc.

### 1.2. Đặt lại mật khẩu (Quên mật khẩu)
▶ Mô tả luồng dữ liệu:
• D1: Email yêu cầu đặt lại mật khẩu, mật khẩu mới.
• D2: Không có.
• D3: Dữ liệu tài khoản theo Email.
• D4: Bản ghi mật khẩu mới (đã mã hóa).
• D5: Cập nhật giao diện trạng thái.
• D6: Thông báo thành công hoặc lỗi "Email không tồn tại".

▶ Thuật toán:
• B1: Nhận D1 từ người dùng.
• B2: Kết nối cơ sở dữ liệu.
• B3: Đọc D3 để xác thực Email.
• B4: Kiểm tra: Email có hợp lệ không? Mật khẩu mới có đủ độ dài không?
• B5: Nếu không hợp lệ, trả D6 (Báo lỗi) và đến B9.
• B6: Ghi D4 xuống bộ nhớ phụ.
• B7: Trả D6 (Thông báo thành công).
• B8: Đóng kết nối cơ sở dữ liệu.
• B9: Kết thúc.

### 1.3. Tạo tài khoản khách thuê
▶ Mô tả luồng dữ liệu:
• D1: Email, Họ tên, SĐT, Số phòng, Mật khẩu tạm thời.
• D2: Không có.
• D3: Danh sách Email hiện tại (để kiểm tra trùng lặp).
• D4: Bản ghi tài khoản khách thuê mới.
• D5: Giao diện danh sách tài khoản.
• D6: Báo tạo thành công hoặc lỗi.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Kiểm tra: Email đã tồn tại chưa? Các trường bắt buộc có trống không?
• B5: Nếu vi phạm, trả D6 và đến B9.
• B6: Ghi D4 vào bộ nhớ phụ.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 1.4. Cập nhật thông tin cá nhân
▶ Mô tả luồng dữ liệu:
• D1: Các thông tin cá nhân cần sửa (Họ tên, SĐT...).
• D2: Không có.
• D3: Hồ sơ tài khoản cá nhân hiện tại.
• D4: Bản ghi thông tin đã được chỉnh sửa.
• D5: Giao diện hồ sơ cá nhân mới.
• D6: Báo cập nhật thành công/thất bại.

▶ Thuật toán:
• B1: Nhận D1 từ người dùng.
• B2: Kết nối CSDL.
• B3: Đọc D3 để lấy dữ liệu cũ.
• B4: Kiểm tra định dạng dữ liệu đầu vào.
• B5: Nếu sai, trả D6 và đến B9.
• B6: Thực hiện ghi D4.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 1.5. Xem lịch sử xóa & Khôi phục
▶ Mô tả luồng dữ liệu:
• D1: Yêu cầu xem lịch sử hoặc ID bản ghi cần khôi phục.
• D2: Không có.
• D3: Bảng `removal_logs` (Lịch sử xóa).
• D4: Bản ghi được khôi phục trở lại bảng chính, xóa log.
• D5: Danh sách dữ liệu đã phục hồi.
• D6: Báo thành công/thất bại.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 lấy danh sách log.
• B4: Kiểm tra ID khôi phục có hợp lệ không.
• B5: Nếu không, trả D6 và đến B9.
• B6: Ghi D4 (chuyển data từ log về bảng chính).
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

## 2. Quản lý phòng trọ

### 2.1. Thêm/Sửa/Xóa phòng
▶ Mô tả luồng dữ liệu:
• D1: Thông tin phòng (Số phòng, Tầng, Giá thuê, Diện tích, Trạng thái).
• D2: Không có.
• D3: Danh sách phòng hiện tại.
• D4: Bản ghi phòng mới / cập nhật / xóa (chuyển log).
• D5: Danh sách phòng cập nhật.
• D6: Thông báo thao tác phòng thành công/lỗi.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 để check trùng mã phòng.
• B4: Kiểm tra ràng buộc (Giá/Diện tích > 0, phòng xóa có đang ACTIVE hợp đồng không).
• B5: Nếu vi phạm ràng buộc, trả D6 và đến B9.
• B6: Ghi D4 xuống bộ nhớ phụ.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 2.2. Quản lý danh mục tài sản phòng
▶ Mô tả luồng dữ liệu:
• D1: Thông tin tài sản (Tên, Số lượng, Trạng thái).
• D2: Không có.
• D3: Danh sách tài sản trong phòng.
• D4: Bản ghi tài sản được lưu/sửa.
• D5: Giao diện chi tiết phòng.
• D6: Báo thành công/thất bại.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 lấy dữ liệu tài sản.
• B4: Kiểm tra số lượng ≥ 1 và trạng thái thuộc (OK, BROKEN, MAINTENANCE, LOST).
• B5: Nếu sai, trả D6 và đến B9.
• B6: Ghi D4.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 2.3. Tra cứu và xem thông tin phòng
▶ Mô tả luồng dữ liệu:
• D1: Từ khóa tìm kiếm (Số phòng, trạng thái).
• D2: Không có.
• D3: Dữ liệu phòng khớp với từ khóa.
• D4: Không có.
• D5: Kết quả danh sách phòng.
• D6: Báo không tìm thấy (nếu mảng rỗng).

▶ Thuật toán:
• B1: Nhận D1 từ Admin/Guest/Tenant.
• B2: Kết nối CSDL.
• B3: Truy vấn D3 dựa trên bộ lọc từ khóa.
• B4: Kiểm tra số lượng kết quả.
• B5: Nếu rỗng, trả D6 (Không có dữ liệu).
• B6: Trả kết quả hiển thị ra D5.
• B7: Đóng kết nối.
• B8: Kết thúc.

## 3. Quản lý khách thuê

### 3.1. Thêm/Sửa/Xóa thông tin khách thuê
▶ Mô tả luồng dữ liệu:
• D1: Hồ sơ khách (Họ tên, CCCD, SĐT).
• D2: Không có.
• D3: Danh sách khách thuê.
• D4: Bản ghi hồ sơ khách mới/cập nhật.
• D5: Bảng danh sách khách thuê.
• D6: Thông báo thao tác thành công.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 check trùng CCCD/SĐT.
• B4: Kiểm tra định dạng liên lạc.
• B5: Nếu sai, trả D6 và đến B9.
• B6: Ghi D4.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

## 4. Giữ chỗ & Đặt cọc

### 4.1. Yêu cầu giữ chỗ tạm thời (Guest)
▶ Mô tả luồng dữ liệu:
• D1: ID Phòng muốn giữ, Họ tên, SĐT Guest.
• D2: Không có.
• D3: Tình trạng hiện tại của phòng (phải là AVAILABLE).
• D4: Tạo bản ghi HELD, lưu log thời gian giữ chỗ.
• D5: Màn hình chờ đếm ngược 15 phút.
• D6: Thông báo giữ chỗ thành công / thất bại (phòng đã có người giữ).

▶ Thuật toán:
• B1: Nhận D1 từ Guest.
• B2: Kết nối CSDL.
• B3: Đọc D3 để đảm bảo phòng đang `AVAILABLE`.
• B4: Nếu phòng không trống, trả D6 và đến B9.
• B5: Thực hiện khóa phòng (đổi status = HELD), ghi D4.
• B6: Kích hoạt tiến trình đếm ngược 15 phút.
• B7: Trả D5, D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 4.2. Gửi minh chứng đặt cọc (Guest)
▶ Mô tả luồng dữ liệu:
• D1: Ảnh biên lai chuyển khoản (File), Ghi chú.
• D2: Không có.
• D3: Tiến trình đếm ngược 15 phút của phòng.
• D4: Lưu link URL ảnh vào bản ghi giữ chỗ.
• D5: Cập nhật giao diện "Đã nộp minh chứng chờ duyệt".
• D6: Thông báo thành công / quá hạn.

▶ Thuật toán:
• B1: Nhận D1 từ Guest.
• B2: Kết nối CSDL.
• B3: Đọc D3 kiểm tra thời gian 15 phút còn hiệu lực không.
• B4: Nếu quá hạn, tự động trả phòng về `AVAILABLE`, trả D6 (Báo quá hạn) và đến B9.
• B5: Upload ảnh, lấy URL ghi D4 xuống DB.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 4.3. Duyệt/Từ chối đặt cọc (Admin)
▶ Mô tả luồng dữ liệu:
• D1: Quyết định Duyệt hoặc Từ chối của Admin.
• D2: Không có.
• D3: Bản ghi đặt cọc của Guest.
• D4: Xóa bản ghi (nếu từ chối) hoặc chuyển trạng thái chờ ký HĐ (nếu duyệt).
• D5: Danh sách đặt cọc.
• D6: Gửi email/thông báo kết quả cho Guest.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Nếu Từ chối: Đổi phòng về `AVAILABLE`, xóa yêu cầu (Ghi D4).
• B5: Nếu Duyệt: Giữ nguyên phòng `HELD` chờ tạo Hợp đồng.
• B6: Gửi kết quả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

## 5. Quản lý hợp đồng

### 5.1. Lập/Sửa/Hủy hợp đồng thuê phòng
▶ Mô tả luồng dữ liệu:
• D1: Thông tin HĐ (Khách đại diện, Phòng, Tiền cọc, Ngày bắt đầu/kết thúc).
• D2: Không có.
• D3: Trạng thái Phòng và hợp đồng hiện tại.
• D4: Bản ghi Hợp đồng mới (Cập nhật phòng thành RENTED).
• D5: Giao diện quản lý hợp đồng.
• D6: Báo thành công/lỗi.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 kiểm tra phòng có hợp đồng ACTIVE nào không.
• B4: Nếu có, trả D6 và đến B9.
• B5: Ghi D4 (Lưu HĐ, cập nhật phòng -> RENTED).
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

## 6. Quản lý dịch vụ

### 6.1. Cấu hình dịch vụ và biểu giá
▶ Mô tả luồng dữ liệu:
• D1: Tên dịch vụ (Điện, Nước, Rác...), Biểu giá.
• D2: Không có.
• D3: Bảng giá dịch vụ hiện tại.
• D4: Bản ghi giá mới.
• D5: Danh sách bảng giá.
• D6: Báo thành công.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Kiểm tra Đơn giá/Biểu giá hợp lệ.
• B5: Nếu sai, trả D6 và đến B9.
• B6: Ghi D4.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

### 6.2. Đăng ký/Hủy đăng ký dịch vụ phụ
▶ Mô tả luồng dữ liệu:
• D1: Chọn Phòng/Hợp đồng và loại dịch vụ muốn gán.
• D2: Không có.
• D3: Các dịch vụ đang được gán.
• D4: Bản ghi liên kết dịch vụ - phòng.
• D5: Giao diện dịch vụ phòng.
• D6: Báo thành công.

▶ Thuật toán:
• B1: Nhận D1.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Xử lý logic Đăng ký (INSERT) hoặc Hủy (DELETE).
• B5: Ghi D4.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 6.3. Chốt chỉ số điện, nước tháng
▶ Mô tả luồng dữ liệu:
• D1: Chỉ số điện, nước mới.
• D2: Không có.
• D3: Chỉ số tháng cũ.
• D4: Bản ghi chỉ số tháng mới.
• D5: Bảng chỉ số điện nước.
• D6: Báo thành công/lỗi.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 (lấy số cũ).
• B4: Kiểm tra: Số mới phải ≥ Số cũ.
• B5: Nếu vi phạm, trả D6 và đến B9.
• B6: Ghi D4.
• B7: Trả D6.
• B8: Đóng kết nối.
• B9: Kết thúc.

## 7. Quản lý hóa đơn & thanh toán

### 7.1. Lập/Sửa/Hủy hoá đơn tính tiền
▶ Mô tả luồng dữ liệu:
• D1: ID Hợp đồng, Hạn thanh toán.
• D2: Không có.
• D3: Tiền phòng, Chỉ số điện nước, Các dịch vụ phụ đã đăng ký.
• D4: Bản ghi Hóa đơn mới (trạng thái UNPAID).
• D5: Chi tiết hóa đơn vừa lập.
• D6: Báo lập thành công.

▶ Thuật toán:
• B1: Nhận D1.
• B2: Kết nối CSDL.
• B3: Đọc D3 lấy toàn bộ thông số chi phí.
• B4: Thực hiện tính toán: Tổng = Phòng + (Số mới-cũ)*Giá + Phí phụ.
• B5: Ghi D4 xuống DB.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 7.2. Upload minh chứng thanh toán
▶ Mô tả luồng dữ liệu:
• D1: File ảnh biên lai chuyển khoản.
• D2: Không có.
• D3: Trạng thái hóa đơn (phải là UNPAID).
• D4: Link ảnh minh chứng.
• D5: Giao diện hóa đơn cập nhật trạng thái.
• D6: Báo tải ảnh thành công.

▶ Thuật toán:
• B1: Nhận D1 từ Tenant.
• B2: Kết nối CSDL.
• B3: Đọc D3 kiểm tra hóa đơn.
• B4: Nếu đã PAID, chặn thao tác, trả D6 và đến B9.
• B5: Ghi D4.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 7.3. Xác nhận và ghi nhận thanh toán
▶ Mô tả luồng dữ liệu:
• D1: Quyết định xác nhận nhận đủ tiền.
• D2: Không có.
• D3: Hóa đơn đang chờ xác nhận.
• D4: Cập nhật hóa đơn -> PAID, tạo bản ghi Giao dịch.
• D5: Bảng danh sách hóa đơn.
• D6: Thông báo gửi đến Tenant.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Ghi D4 (đổi trạng thái PAID).
• B5: Trả D6, gửi push notification cho Tenant.
• B6: Đóng kết nối.
• B7: Kết thúc.

## 8. Quản lý sự cố & bảo trì

### 8.1. Gửi yêu cầu báo sự cố phòng
▶ Mô tả luồng dữ liệu:
• D1: Tiêu đề, Mô tả, Ảnh sự cố.
• D2: Không có.
• D3: Thông tin phòng của Tenant.
• D4: Bản ghi Ticket sự cố (trạng thái OPEN).
• D5: Danh sách sự cố của Tenant.
• D6: Báo gửi thành công.

▶ Thuật toán:
• B1: Nhận D1 từ Tenant.
• B2: Kết nối CSDL.
• B3: Kiểm tra tính hợp lệ dữ liệu.
• B4: Nếu thiếu tiêu đề/mô tả, trả D6 và đến B8.
• B5: Ghi D4.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 8.2. Tiếp nhận, phân công & xử lý sự cố
▶ Mô tả luồng dữ liệu:
• D1: Trạng thái xử lý mới (IN_PROGRESS, RESOLVED, CLOSED).
• D2: Không có.
• D3: Bản ghi sự cố.
• D4: Bản ghi sự cố được cập nhật.
• D5: Giao diện xử lý sự cố.
• D6: Thông báo tiến độ cho Tenant.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3.
• B4: Ghi D4.
• B5: Trả D6 (phát thông báo Realtime).
• B6: Đóng kết nối.
• B7: Kết thúc.

## 9. Quản lý thông báo

### 9.1. Gửi/Xóa thông báo khu trọ
▶ Mô tả luồng dữ liệu:
• D1: Tiêu đề, Nội dung, Người nhận.
• D2: Không có.
• D3: Danh sách Khách thuê hợp lệ.
• D4: Bản ghi Thông báo.
• D5: Danh sách thông báo đã phát.
• D6: Báo thành công.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 lấy danh sách thiết bị/email.
• B4: Kiểm tra tính hợp lệ (Nội dung không rỗng).
• B5: Ghi D4 và phát qua WebSocket/Email.
• B6: Trả D6.
• B7: Đóng kết nối.
• B8: Kết thúc.

### 9.2. Nhận và xem thông báo
▶ Mô tả luồng dữ liệu:
• D1: Yêu cầu đánh dấu "Đã đọc".
• D2: Không có.
• D3: Danh sách thông báo của User.
• D4: Cập nhật trạng thái Read = true.
• D5: Hiển thị chi tiết thông báo.
• D6: Không có.

▶ Thuật toán:
• B1: Nhận D1 từ Tenant.
• B2: Kết nối CSDL.
• B3: Lấy dữ liệu D3 hiển thị ra D5.
• B4: Ghi D4 (đánh dấu đã đọc).
• B5: Đóng kết nối.
• B6: Kết thúc.

## 10. Báo cáo thống kê

### 10.1. Lập báo cáo doanh thu & công nợ
▶ Mô tả luồng dữ liệu:
• D1: Tháng/Năm cần thống kê.
• D2: Không có.
• D3: Tất cả hóa đơn trong khoảng thời gian.
• D4: Không có.
• D5: Biểu đồ doanh thu, Nút xuất CSV.
• D6: Báo không có dữ liệu (nếu rỗng).

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 và thực hiện truy vấn `SUM()` doanh thu (PAID) và công nợ (UNPAID).
• B4: Tính toán hoàn tất, đẩy dữ liệu ra D5.
• B5: Đóng kết nối.
• B6: Kết thúc.

### 10.2. Lập báo cáo phòng trống
▶ Mô tả luồng dữ liệu:
• D1: Yêu cầu xem thống kê.
• D2: Không có.
• D3: Danh sách phòng và trạng thái.
• D4: Không có.
• D5: Biểu đồ tròn tỷ lệ lấp đầy.
• D6: Không có.

▶ Thuật toán:
• B1: Nhận D1 từ Admin.
• B2: Kết nối CSDL.
• B3: Đọc D3 và đếm tổng số phòng, số phòng RENTED, AVAILABLE.
• B4: Tính Tỷ lệ lấp đầy = (RENTED / Tổng) * 100%.
• B5: Trả D5.
• B6: Đóng kết nối.
• B7: Kết thúc.