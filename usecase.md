3.3. Đặc tả các Use Case

3.3.1. Quản lý hệ thống
3.3.1.1. Đăng nhập hệ thống
➢ Tóm tắt: Cho phép người dùng truy cập vào hệ thống.
➢ Dòng sự kiện chính:
1. Người dùng mở ứng dụng, hệ thống hiển thị màn hình Đăng nhập.
2. Người dùng nhập tên đăng nhập và mật khẩu, nhấn nút “Đăng nhập”.
3. Hệ thống kiểm tra thông tin nhập vào và đối chiếu thông tin với cơ sở dữ liệu.
4. Hệ thống xác thực thành công, kiểm tra trạng thái tài khoản (“Đang hoạt động”), xác định vai trò của tài khoản.
5. Hệ thống chuyển hướng người dùng vào màn hình chính (Dashboard) tương ứng với quyền hạn.

➢ Dòng sự kiện phụ:
- Nếu bỏ trống tên đăng nhập hoặc mật khẩu, hiển thị thông báo “Vui lòng nhập đầy đủ thông tin”.
- Nếu sai tên đăng nhập hoặc mật khẩu, hiển thị thông báo “Tên đăng nhập hoặc mật khẩu không chính xác”.
- Nếu tài khoản bị khóa, thông báo “Tài khoản bị vô hiệu hoá”.

➢ Tiền điều kiện: Có tài khoản hợp lệ.
➢ Hậu điều kiện: Truy cập thành công vào hệ thống.

3.3.1.2. Đặt lại mật khẩu (Quên mật khẩu)
➢ Tóm tắt: Cho phép người dùng lấy lại quyền truy cập khi quên mật khẩu qua mã OTP gửi về Email.
➢ Dòng sự kiện chính:
1. Người dùng chọn "Quên mật khẩu" tại màn hình đăng nhập.
2. Hệ thống yêu cầu nhập Email.
3. Người dùng nhập Email và nhấn "Gửi mã OTP".
4. Hệ thống tạo một mã OTP (6 chữ số) có thời hạn 15 phút và gửi vào Email của người dùng.
5. Người dùng nhập mã OTP nhận được vào màn hình xác thực.
6. Hệ thống xác minh mã OTP còn hiệu lực.
7. Người dùng nhập mật khẩu mới và xác nhận.
8. Hệ thống lưu mật khẩu mới (đã mã hóa) và thông báo thành công.

➢ Dòng sự kiện phụ:
- Nếu Email không tồn tại, báo lỗi "Email chưa được đăng ký".
- Nếu OTP hết hạn (sau 15 phút), báo lỗi "Mã xác thực đã hết hạn, vui lòng yêu cầu lại".

➢ Tiền điều kiện: Không yêu cầu đăng nhập.
➢ Hậu điều kiện: Mật khẩu mới được cập nhật.

3.3.1.3. Tạo tài khoản khách thuê
➢ Tóm tắt: Admin chủ động tạo tài khoản cho khách thuê mới.
➢ Dòng sự kiện chính:
1. Admin vào "Quản lý hệ thống" -> "Tạo tài khoản".
2. Admin nhập: Email, Họ tên, Số điện thoại và Mật khẩu tạm thời.
3. Nhấn "Tạo tài khoản".
4. Hệ thống kiểm tra tính duy nhất của Email.
5. Hệ thống mã hóa mật khẩu và lưu tài khoản với vai trò "TENANT".
6. Thông báo thành công cho Admin.

➢ Dòng sự kiện phụ:
- Nếu Email trùng, báo "Email đã tồn tại".

➢ Tiền điều kiện: Admin đã đăng nhập.
➢ Hậu điều kiện: Tài khoản Tenant được tạo thành công.

3.3.2. Quản lý phòng trọ
3.3.2.1. Tra cứu thông tin phòng (Guest)
➢ Tóm tắt: Khách vãng lai xem danh sách phòng trống để tìm thuê.
➢ Dòng sự kiện chính:
1. Khách truy cập trang chủ hệ thống.
2. Hệ thống hiển thị danh sách các phòng đang ở trạng thái "AVAILABLE".
3. Khách hàng sử dụng bộ lọc: Tầm giá, Diện tích.
4. Hệ thống truy vấn CSDL và trả về danh sách phòng thỏa mãn.
5. Khách click vào một phòng để xem chi tiết (Hình ảnh, giá, mô tả).

➢ Dòng sự kiện phụ: 
- Nếu không tìm thấy phòng thỏa mãn, báo "Không có phòng phù hợp".

➢ Tiền điều kiện: Không.
➢ Hậu điều kiện: Khách có đủ thông tin để quyết định giữ chỗ.

3.3.2.2. Thêm mới phòng trọ
➢ Tóm tắt: Cho phép Admin thêm một phòng mới vào hệ thống.
➢ Dòng sự kiện chính:
1. Admin chọn chức năng "Quản lý phòng trọ" và nhấn "Thêm phòng mới".
2. Hệ thống hiển thị form nhập thông tin phòng.
3. Admin nhập các thông tin: Số phòng, Tầng, Diện tích, Giá thuê, Số người tối đa.
4. Admin nhấn nút "Lưu".
5. Hệ thống kiểm tra Số phòng không bị trùng lặp.
6. Hệ thống lưu dữ liệu, thiết lập trạng thái phòng mặc định là "AVAILABLE".
7. Thông báo thêm phòng thành công.

➢ Dòng sự kiện phụ:
- Nếu Số phòng đã tồn tại, báo lỗi "Số phòng đã tồn tại trong hệ thống".

➢ Tiền điều kiện: Admin đã đăng nhập thành công.
➢ Hậu điều kiện: Thông tin phòng mới được lưu vào CSDL.

3.3.3. Quản lý khách thuê
3.3.3.1. Sửa/Cập nhật thông tin khách thuê (Admin)
➢ Tóm tắt: Admin cập nhật lại hồ sơ cá nhân của khách thuê khi có thay đổi.
➢ Dòng sự kiện chính:
1. Admin vào module "Quản lý khách thuê".
2. Chọn một khách hàng cụ thể và nhấn "Chỉnh sửa".
3. Hệ thống hiển thị form điền thông tin hiện tại của khách.
4. Admin thay đổi thông tin Số điện thoại và nhấn "Lưu".
5. Hệ thống kiểm tra định dạng dữ liệu (SĐT 10 số).
6. Hệ thống cập nhật CSDL và hiển thị thông báo thành công.

➢ Dòng sự kiện phụ:
- Nếu SĐT sai định dạng, hệ thống highlight ô nhập và báo "Số điện thoại không hợp lệ".

➢ Tiền điều kiện: Admin đăng nhập.
➢ Hậu điều kiện: Hồ sơ khách thuê được lưu mới.

3.3.4. Giữ chỗ & Đặt cọc
3.3.4.1. Yêu cầu giữ chỗ tạm thời (Guest)
➢ Tóm tắt: Cho phép Guest chọn phòng và giữ chỗ tạm thời để chuẩn bị đặt cọc.
➢ Dòng sự kiện chính:
1. Khách đang ở trang chi tiết phòng "AVAILABLE", nhấn nút "Giữ chỗ".
2. Hệ thống hiển thị biểu mẫu yêu cầu nhập Họ tên, Số điện thoại.
3. Khách điền thông tin và nhấn "Xác nhận".
4. Hệ thống đổi trạng thái phòng sang "HELD" và bắt đầu đếm ngược thời gian giữ chỗ (15 phút).
5. Hệ thống hiển thị giao diện hướng dẫn chuyển khoản.

➢ Dòng sự kiện phụ:
- Nếu hết 15 phút mà khách chưa tải lên minh chứng, hệ thống tự động hoàn trạng thái phòng về "AVAILABLE".

➢ Tiền điều kiện: Phòng đang ở trạng thái "AVAILABLE".
➢ Hậu điều kiện: Phòng chuyển sang trạng thái "HELD".

3.3.4.2. Duyệt / Từ chối đặt cọc (Admin)
➢ Tóm tắt: Admin kiểm tra minh chứng CK của Guest.
➢ Dòng sự kiện chính:
1. Admin mở danh sách "Giữ chỗ đang chờ duyệt".
2. Admin xem ảnh minh chứng và đối chiếu tài khoản ngân hàng.
3. Admin nhấn "Duyệt".
4. Hệ thống ghi nhận tiền cọc thành công, giữ nguyên trạng thái phòng là "HELD" (chờ làm hợp đồng).

➢ Dòng sự kiện phụ:
- Nếu ảnh giả mạo hoặc chưa nhận được tiền, Admin chọn "Từ chối". Hệ thống báo cho Guest và tự động hoàn phòng về "AVAILABLE".

➢ Tiền điều kiện: Guest đã upload minh chứng cọc.
➢ Hậu điều kiện: Yêu cầu được duyệt, sẵn sàng chuyển thành Hợp đồng.

3.3.5. Quản lý hợp đồng
3.3.5.1. Lập hợp đồng thuê phòng
➢ Tóm tắt: Admin tạo hợp đồng chính thức, ghi nhận việc thuê phòng.
➢ Dòng sự kiện chính:
1. Admin chọn chức năng "Lập hợp đồng".
2. Hệ thống hiển thị biểu mẫu tạo hợp đồng.
3. Admin chọn Phòng, Khách thuê đại diện, nhập Ngày bắt đầu/kết thúc, Tiền cọc.
4. Admin nhấn "Lưu hợp đồng".
5. Hệ thống kiểm tra: Phòng không có hợp đồng nào khác đang "ACTIVE".
6. Hệ thống lưu hợp đồng (trạng thái ACTIVE) và cập nhật phòng sang "RENTED".

➢ Dòng sự kiện phụ:
- Nếu phòng đang có hợp đồng ACTIVE khác, hệ thống từ chối.

➢ Tiền điều kiện: Admin đã đăng nhập.
➢ Hậu điều kiện: Hợp đồng được lưu, trạng thái phòng đổi thành RENTED.

3.3.5.2. Thanh lý / Hủy hợp đồng
➢ Tóm tắt: Admin kết thúc hợp đồng thuê phòng.
➢ Dòng sự kiện chính:
1. Admin chọn hợp đồng đang "ACTIVE" và nhấn "Thanh lý".
2. Hệ thống tính toán công nợ cuối cùng.
3. Admin xác nhận đã hoàn tất thủ tục trả cọc/thu nợ.
4. Admin nhấn "Xác nhận thanh lý".
5. Hệ thống đổi trạng thái hợp đồng thành "TERMINATED".
6. Hệ thống tự động đổi trạng thái phòng từ "RENTED" sang "AVAILABLE".

➢ Dòng sự kiện phụ:
- Nếu khách còn nợ hóa đơn, hệ thống hiển thị cảnh báo.

➢ Tiền điều kiện: Hợp đồng đang ACTIVE.
➢ Hậu điều kiện: Phòng chuyển về trạng thái AVAILABLE.

3.3.6. Quản lý dịch vụ
3.3.6.1. Cấu hình dịch vụ và biểu giá
➢ Tóm tắt: Admin thiết lập đơn giá hoặc biểu giá (bậc thang) cho dịch vụ.
➢ Dòng sự kiện chính:
1. Admin vào "Cấu hình dịch vụ", chọn dịch vụ (vd: Điện).
2. Hệ thống hiển thị giao diện nhập cấu hình (JSON hoặc form).
3. Admin nhập Mức 1 (0-50: 1800đ), Mức 2 (51-100: 2000đ).
4. Admin nhấn "Lưu".
5. Hệ thống kiểm tra các đơn giá > 0 và lưu vào CSDL.

➢ Tiền điều kiện: Admin đăng nhập.
➢ Hậu điều kiện: Biểu giá mới được lưu thành công.

3.3.6.2. Chốt chỉ số điện, nước tháng
➢ Tóm tắt: Cập nhật chỉ số tiêu thụ của phòng.
➢ Dòng sự kiện chính:
1. Admin chọn chức năng "Chốt điện nước" cho một tháng.
2. Hệ thống hiển thị danh sách phòng RENTED kèm chỉ số cũ.
3. Admin nhập Chỉ số mới và nhấn "Cập nhật".
4. Hệ thống kiểm tra: Số mới phải ≥ Số cũ.
5. Hệ thống lưu dữ liệu vào CSDL.

➢ Dòng sự kiện phụ:
- Nếu Số mới < Số cũ, báo lỗi "Chỉ số mới không được nhỏ hơn chỉ số cũ".

➢ Tiền điều kiện: Phòng đang RENTED.
➢ Hậu điều kiện: Sẵn sàng để tính hóa đơn.

3.3.7. Quản lý hóa đơn & thanh toán
3.3.7.1. Lập hóa đơn tính tiền tháng
➢ Tóm tắt: Tính toán tổng số tiền khách phải đóng trong tháng.
➢ Dòng sự kiện chính:
1. Admin chọn "Tạo hóa đơn" cho một Hợp đồng.
2. Hệ thống tự động lấy: Tiền phòng, Tiền điện/nước (theo bậc thang), Phí dịch vụ khác.
3. Hệ thống tính tổng tiền.
4. Admin nhấn "Phát hành hóa đơn".
5. Hệ thống lưu hóa đơn (trạng thái "UNPAID") và gửi thông báo cho Khách thuê.

➢ Dòng sự kiện phụ:
- Nếu phòng chưa chốt điện nước, hệ thống cảnh báo.

➢ Tiền điều kiện: Đã chốt điện nước tháng.
➢ Hậu điều kiện: Hóa đơn được phát hành.

3.3.7.2. Upload minh chứng thanh toán (Tenant)
➢ Tóm tắt: Khách nộp bằng chứng CK.
➢ Dòng sự kiện chính:
1. Khách thuê chọn hóa đơn đang "UNPAID".
2. Nhấn nút "Thanh toán".
3. Khách tải lên ảnh chụp màn hình CK.
4. Nhấn "Gửi minh chứng".
5. Hệ thống lưu ảnh, đổi trạng thái thanh toán sang "PENDING".

➢ Tiền điều kiện: Hóa đơn chưa được thanh toán đủ.
➢ Hậu điều kiện: Yêu cầu chờ Admin duyệt.

3.3.7.3. Xác nhận thanh toán (Admin duyệt)
➢ Tóm tắt: Admin kiểm tra và duyệt ghi nhận thanh toán.
➢ Dòng sự kiện chính:
1. Admin chọn khoản thanh toán đang "PENDING".
2. Admin đối chiếu với tài khoản ngân hàng.
3. Admin nhấn nút "Duyệt".
4. Hệ thống cập nhật khoản thanh toán sang "APPROVED".
5. Hệ thống cập nhật Hóa đơn sang trạng thái "PAID".

➢ Dòng sự kiện phụ:
- Nếu tiền chưa vào, Admin chọn "Từ chối". Hóa đơn vẫn UNPAID.

➢ Tiền điều kiện: Khách đã upload minh chứng.
➢ Hậu điều kiện: Hóa đơn hoàn tất (PAID).

3.3.8. Quản lý sự cố & bảo trì
3.3.8.1. Báo cáo sự cố phòng (Tenant)
➢ Tóm tắt: Khách thông báo vật tư hỏng hóc.
➢ Dòng sự kiện chính:
1. Khách thuê chọn "Báo sự cố".
2. Nhập Tiêu đề, Mô tả và đính kèm hình ảnh.
3. Nhấn "Gửi".
4. Hệ thống ghi nhận sự cố (Trạng thái OPEN) và báo cho Admin.

➢ Tiền điều kiện: Khách thuê đã đăng nhập.
➢ Hậu điều kiện: Admin nhận được yêu cầu xử lý.

3.3.9. Quản lý thông báo
3.3.9.1. Gửi thông báo khu trọ (Admin)
➢ Tóm tắt: Admin phát thông báo hàng loạt (thu tiền, cắt điện/nước) cho các khách thuê.
➢ Dòng sự kiện chính:
1. Admin vào "Quản lý thông báo" -> "Tạo thông báo mới".
2. Nhập Tiêu đề và Nội dung chi tiết.
3. Chọn đối tượng nhận: "Tất cả khách thuê" hoặc chọn từng cá nhân.
4. Nhấn "Gửi thông báo".
5. Hệ thống lưu thông báo vào CSDL và đồng thời gửi notification trên app của các Tenant được chọn.

➢ Tiền điều kiện: Admin đăng nhập.
➢ Hậu điều kiện: Khách thuê nhận được thông báo thời gian thực.

3.3.10. Báo cáo thống kê
3.3.10.1. Lập báo cáo doanh thu & công nợ
➢ Tóm tắt: Admin xem thống kê tài chính.
➢ Dòng sự kiện chính:
1. Admin vào "Báo cáo doanh thu".
2. Hệ thống query Hóa đơn "PAID" để tính Doanh thu thực nhận.
3. Hệ thống query Hóa đơn "UNPAID" để tính Công nợ tồn đọng.
4. Hệ thống render biểu đồ.
5. Admin nhấn "Xuất CSV", hệ thống tải file.

➢ Tiền điều kiện: Admin đăng nhập.
➢ Hậu điều kiện: Admin có file báo cáo tài chính.