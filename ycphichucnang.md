## Yêu cầu phi chức năng

### Yêu cầu hiệu quả
Yêu cầu hiệu quả liên quan đến tốc độ xử lý và khả năng sử dụng tài nguyên của hệ thống, đặc biệt là các tác vụ thường xuyên và quan trọng trong việc quản lý vận hành nhà trọ.

**- Bảng yêu cầu hiệu quả:**

| **STT** | **Nghiệp vụ** | **Tốc độ xử lý** | **Dung lượng lưu trữ** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Khách vãng lai xem phòng & Giữ chỗ | Tải trang & danh sách phòng < 2 giây | Cache hình ảnh phòng | Đếm ngược 15 phút chính xác |
| 2 | Quản lý hệ thống (Đăng ký / Đăng nhập) | Thao tác thành công < 2 giây | Tối ưu hóa session | Bảo mật mã hóa mật khẩu |
| 3 | Quản lý phòng trọ & Cơ sở vật chất | Lưu trữ/Cập nhật thông tin < 3 giây | Dung lượng văn bản nhẹ | Cập nhật trạng thái phòng trống tức thời |
| 4 | Quản lý dịch vụ (Điện, nước, internet) | Lưu trữ/Cập nhật chỉ số < 3 giây | Bộ nhớ đệm chỉ số cũ | Hỗ trợ nhập nhanh theo chu kỳ tháng |
| 5 | Quản lý khách thuê & Thanh toán | Tìm kiếm & cập nhật < 2 giây | Upload ảnh minh chứng (< 2MB/ảnh) | Tra cứu nhanh theo tên/phòng |
| 6 | Quản lý hợp đồng & Tính tiền phòng | Tính toán hóa đơn tự động < 3 giây | Tối ưu hóa công thức tính | Tự động cộng dồn tiền phòng + dịch vụ |
| 7 | Thông báo & Sự cố | Đẩy thông báo theo thời gian thực < 1 giây | Lưu trữ nội dung text nhẹ | Báo cáo trực tiếp (Realtime) |
| 8 | Báo cáo doanh thu và công nợ | Xử lý và kết xuất < 5 giây | Tối ưu truy vấn SQL (Index) | Dữ liệu hiển thị trực quan |

**- Bảng trách nhiệm yêu cầu hiệu quả:**

| **STT** | **Nghiệp vụ** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Khách xem phòng & Đặt cọc | Lướt xem phòng và thao tác trên web. | Phản hồi giao diện siêu tốc, tự động khóa phòng tạm thời (HELD). | Dành cho Khách vãng lai |
| 2 | Quản lý hệ thống (Đăng nhập) | Cung cấp đúng thông tin tài khoản. | Xác thực thông tin, điều hướng vào trang quản trị đúng vai trò. | Admin / Khách thuê |
| 3 | Quản lý phòng trọ & Cơ sở vật chất | Nhập thông tin phòng (số phòng, giá). | Kiểm tra tính hợp lệ, lưu trữ và cập nhật danh sách phòng. | |
| 4 | Quản lý dịch vụ (Điện, nước...) | Nhập chỉ số điện, nước đầu kỳ, cuối kỳ. | Tự động tính lượng tiêu thụ và thành tiền theo cấu hình biểu giá (Ví dụ: bậc thang). | |
| 5 | Quản lý khách thuê | Cung cấp thông tin cá nhân. | Lưu trữ hồ sơ khách thuê, liên kết khách vào phòng tương ứng. | |
| 6 | Quản lý hợp đồng & Tính tiền phòng | Chọn phòng, khách thuê, chốt hóa đơn. | Tự động tạo hợp đồng, tự động tạo hóa đơn hàng tháng. | |
| 7 | Thông báo & Sự cố | Gửi phản hồi sự cố hoặc soạn thông báo. | Phát thông báo đẩy tức thì tới Admin hoặc Khách thuê. | Tương tác hai chiều |
| 8 | Báo cáo doanh thu và công nợ | Chọn khoảng thời gian hoặc tháng. | Tổng hợp dữ liệu từ hóa đơn, vẽ biểu đồ trực quan và xuất file. | |

### Yêu cầu tiện dụng

**- Bảng yêu cầu tiện dụng:**

| **STT** | **Nghiệp vụ** | **Mức độ dễ học** | **Mức độ dễ sử dụng** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Khách vãng lai xem phòng | Không cần hướng dẫn | Giao diện trực quan, dễ dàng ấn lọc phòng và gửi yêu cầu giữ chỗ ngay trên Mobile. | Tối ưu Mobile First |
| 2 | Quản lý hệ thống | 3 phút đọc hướng dẫn | Đăng nhập nhanh bằng tài khoản, lưu phiên đăng nhập. Sai sót < 1%. | Giao diện trực quan |
| 3 | Quản lý phòng trọ & Cơ sở vật chất | 5 phút hướng dẫn | Hiển thị nhãn trạng thái phòng bằng màu sắc (Đỏ: Đã thuê, Xanh: Trống, Vàng: Giữ chỗ). | Dễ theo dõi tổng quan |
| 4 | Quản lý dịch vụ | 5 phút hướng dẫn | Giao diện nhập liệu dạng bảng giúp ghi nhận chỉ số cực nhanh. | Tiết kiệm thời gian |
| 5 | Quản lý khách thuê | 5 phút hướng dẫn | Form nhập thông tin được bố cục hợp lý, tự động validate dữ liệu. Sai sót < 1%. | Tối ưu UX/UI |
| 6 | Quản lý hợp đồng & Tính tiền phòng | 10 phút hướng dẫn | Tạo hóa đơn hàng loạt cực nhanh. Tự động gen QR Code hỗ trợ thanh toán. | Có bản xem trước hóa đơn |
| 7 | Báo cáo doanh thu và công nợ | 3 phút hướng dẫn | Biểu đồ và bảng số liệu hiển thị dòng tiền trực quan, rõ ràng các khoản nợ. | |

**- Bảng trách nhiệm yêu cầu tiện dụng:**

| **STT** | **Nghiệp vụ** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Khách vãng lai xem phòng | Chọn phòng, xem ảnh và thao tác giữ chỗ. | Giao diện thân thiện Mobile, đếm ngược thời gian rõ ràng để kích thích hoàn tất cọc. | Tăng trải nghiệm |
| 2 | Quản lý hệ thống | Đọc tài liệu hướng dẫn sử dụng. | Cung cấp form đăng nhập rõ ràng, có thông báo lỗi chi tiết khi nhập sai. | |
| 3 | Quản lý phòng trọ | Thao tác trên giao diện danh sách. | Hiển thị rõ màu sắc tình trạng phòng, bộ lọc tìm kiếm phòng trống nhanh. | Giao diện thống nhất |
| 4 | Quản lý dịch vụ | Nhập số liệu thô (chỉ số điện, nước). | Tự động gợi ý số cũ, cảnh báo nếu số mới nhỏ hơn số cũ (lỗi nhập liệu). | |
| 5 | Quản lý khách thuê | Cung cấp đúng thông tin định danh. | Phân loại danh sách khách đang thuê, khách đã chuyển đi để dễ quản lý. | |
| 6 | Quản lý hợp đồng & Tính tiền phòng | Xác nhận các khoản thu thêm (nếu có). | Tự động tính toán tổng tiền, hỗ trợ xuất QR Code thanh toán ngân hàng. | Giảm thiểu sai sót |
| 7 | Báo cáo doanh thu và công nợ | Lựa chọn tiêu chí lọc (theo tháng/năm). | Hiển thị báo cáo dạng biểu đồ và bảng số liệu, hỗ trợ nút in nhanh. | |

### Yêu cầu tương thích
Yêu cầu tương thích mô tả khả năng hoạt động của phần mềm trên các môi trường hoặc với các thiết bị phần cứng khác nhau.

| **STT** | **Nghiệp vụ** | **Đối tượng liên quan** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Vận hành hệ thống (Dành cho Admin) | Trình duyệt Web (Chrome, Edge, Safari, Firefox phiên bản mới nhất). Giao diện responsive chạy tốt trên cả Laptop và Điện thoại. | Hệ thống chạy trên nền tảng Web. |
| 2 | Dành cho Khách thuê & Khách vãng lai (Guest) | Tương thích và tối ưu tuyệt đối trên màn hình thiết bị di động (iOS/Android) qua trình duyệt Web. | Dễ dàng xem phòng, giữ chỗ và tra cứu hóa đơn bằng điện thoại. |
| 3 | Kết xuất dữ liệu báo cáo | Phần mềm Microsoft Excel, Google Sheets, phần mềm đọc file PDF. | Xuất báo cáo dữ liệu định dạng CSV/PDF. |

### Yêu cầu tiến hoá
Yêu cầu tiến hóa mô tả khả năng thay đổi các quy định, tham số nghiệp vụ mà không cần lập trình lại hệ thống.

**- Bảng yêu cầu tiến hoá:**

| **STT** | **Nghiệp vụ** | **Tham số cần thay đổi** | **Miền giá trị cần thay đổi** |
| :---: | :--- | :--- | :--- |
| 1 | Thay đổi cấu hình dịch vụ | Đơn giá/biểu giá điện, đơn giá nước, tiền mạng, tiền rác... | Số dương hoặc cấu hình biểu giá (Ví dụ: Điện bậc thang). |
| 2 | Thay đổi quy định phòng trọ | Giá thuê phòng, số lượng người ở tối đa. | Tùy biến theo từng loại phòng/diện tích. |
| 3 | Thay đổi quy định hệ thống | Tên tòa nhà/dãy trọ, địa chỉ, số điện thoại hoặc thời gian giữ chỗ mặc định. | Chuỗi ký tự chuẩn hóa hoặc Số nguyên. |

**- Bảng trách nhiệm yêu cầu tiến hoá:**

| **STT** | **Nghiệp vụ** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Thay đổi cấu hình dịch vụ | Admin nhập biểu giá/đơn giá mới khi có thay đổi. | Ghi nhận giá trị mới. Hóa đơn tính tiền của tháng sau sẽ áp dụng biểu giá này. | Không ảnh hưởng hóa đơn cũ. |
| 2 | Thay đổi quy định phòng trọ | Cập nhật lại giá phòng hoặc số người ở tối đa trong mục quản lý. | Hệ thống áp dụng quy định mới cho các hợp đồng ký mới từ thời điểm này. | Giữ nguyên hợp đồng cũ. |
| 3 | Thay đổi quy định hệ thống | Thay đổi thông tin trên giao diện quản trị. | Cập nhật ngay lập tức các thông tin trên giao diện cho toàn bộ hệ thống. | Đồng bộ tức thời. |