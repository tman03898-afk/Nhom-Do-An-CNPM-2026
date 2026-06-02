## Yêu cầu hệ thống

### Yêu cầu bảo mật
Yêu cầu bảo mật đảm bảo tính toàn vẹn, bảo mật của dữ liệu vận hành khu trọ (hợp đồng, hóa đơn, thông tin cá nhân khách thuê) và thiết lập cơ chế phân quyền truy cập rõ ràng giữa các nhóm người dùng trong hệ thống.

**- Bảng yêu cầu bảo mật:**

| **STT** | **Nghiệp vụ** | **Thao tác cụ thể** | **Admin** | **Tenant** | **Khách vãng lai** |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **Quản lý hệ thống** | Đăng nhập & Đăng xuất hệ thống | ✓ | ✓ | |
| 2 | | Đặt lại mật khẩu (Quên mật khẩu) | ✓ | ✓ | |
| 3 | | Tạo tài khoản khách thuê | ✓ | | |
| 4 | | Cập nhật thông tin cá nhân | ✓ | ✓ | |
| 5 | | Xem lịch sử xóa & Khôi phục | ✓ | | |
| 6 | **Quản lý phòng trọ** | Thêm/Sửa/Xoá phòng | ✓ | | |
| 7 | | Quản lý danh mục tài sản phòng | ✓ | | |
| 8 | | Tra cứu và xem thông tin phòng | ✓ | ✓ | ✓ |
| 9 | **Quản lý khách thuê** | Thêm/Sửa/Xóa thông tin khách thuê | ✓ | | |
| 10 | **Giữ chỗ & Đặt cọc** | Yêu cầu giữ chỗ tạm thời (Guest) | | | ✓ |
| 11 | | Gửi minh chứng đặt cọc (Guest) | | | ✓ |
| 12 | | Duyệt/Từ chối đặt cọc (Admin) | ✓ | | |
| 13 | **Quản lý hợp đồng** | Lập/Sửa (Gia hạn)/Hủy hợp đồng thuê phòng | ✓ | | |
| 14 | **Quản lý dịch vụ** | Cấu hình dịch vụ và biểu giá | ✓ | | |
| 15 | | Đăng ký/Hủy đăng ký dịch vụ (cho từng phòng) | ✓ | ✓ | |
| 16 | | Chốt chỉ số điện, nước tháng | ✓ | | |
| 17 | **Quản lý hóa đơn & thanh toán** | Lập/Sửa/Hủy hoá đơn tính tiền tháng | ✓ | | |
| 18 | | Upload minh chứng thanh toán | | ✓ | |
| 19 | | Xác nhận và ghi nhận thanh toán | ✓ | | |
| 20 | **Quản lý sự cố & bảo trì** | Gửi yêu cầu báo sự cố phòng | | ✓ | |
| 21 | | Tiếp nhận, phân công & xử lý sự cố | ✓ | | |
| 22 | **Quản lý thông báo** | Gửi/Xóa thông báo khu trọ | ✓ | | |
| 23 | | Nhận và xem thông báo | ✓ | ✓ | |
| 24 | **Báo cáo thống kê** | Lập báo cáo doanh thu & công nợ | ✓ | | |
| 25 | | Lập báo cáo phòng trống | ✓ | | |

**- Bảng trách nhiệm yêu cầu bảo mật:**

| **STT** | **Vai trò** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Admin | Đăng nhập bằng Email và Mật khẩu quản trị (quyền cao nhất). | Xác thực danh tính và cấp toàn quyền truy cập, quản trị toàn bộ dữ liệu của hệ thống. | Tài khoản Admin được tạo sẵn và cấu hình kín khi triển khai hệ thống. |
| 2 | Tenant | Đăng nhập bằng Email và Mật khẩu tạm thời do Admin cấp (có thể đổi lại). | Xác thực quyền truy cập và chặn các chức năng quản trị. Chỉ truy xuất dữ liệu thuộc về cá nhân khách thuê đó. | Đảm bảo không có tình trạng khách xem chéo hóa đơn/hợp đồng của nhau. |
| 3 | Guest | Không cần đăng nhập, chỉ truy cập thông qua các đường dẫn công khai (Public). | Chỉ cho phép xem danh sách phòng trống và gửi yêu cầu giữ chỗ. Chặn mọi nỗ lực truy cập vào các trang nội bộ (Private Routes). | Bảo vệ API Endpoint bằng JWT Middleware. |

### Yêu cầu an toàn
Yêu cầu an toàn tập trung vào việc đảm bảo tính toàn vẹn dữ liệu (chống xóa nhầm, mất mát) và khả năng phục hồi khi có sự cố, giải quyết rủi ro về lưu trữ và bảo mật dữ liệu trong quá trình vận hành khu trọ.

**- Bảng yêu cầu an toàn:**

| **STT** | **Nghiệp vụ** | **Đối tượng** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | An toàn xóa dữ liệu | Khách thuê & Hợp đồng | Khi xóa khách thuê hoặc hợp đồng, phải gỡ bỏ toàn bộ phụ phí liên quan và tự động lưu vết vào Lịch sử xóa để truy vết sau này. |
| 2 | Không cho phép xóa | Hóa đơn & Giao dịch | Hóa đơn đã tạo ưu tiên Hủy (CANCELLED) thay vì xóa. Các giao dịch thanh toán đã xác nhận tuyệt đối không được xóa để đối soát. |
| 3 | Không cho phép xóa | Lịch sử chỉ số điện/nước | Chỉ số điện/nước đã chốt không được phép xóa để đảm bảo tính minh bạch. |
| 4 | Giới hạn quyền chỉnh sửa| Thống kê doanh thu | Dữ liệu thống kê được tổng hợp tự động từ hóa đơn, không cho phép chỉnh sửa số tổng thủ công. |
| 5 | Ràng buộc khóa ngoại | Xóa phòng trọ | Không được phép xóa phòng đang có khách thuê/hợp đồng ACTIVE. |

**- Bảng trách nhiệm yêu cầu an toàn:**

| **STT** | **Nghiệp vụ** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Lưu vết xóa dữ liệu (Audit Log) | Yêu cầu xóa khách thuê hoặc Hợp đồng khỏi hệ thống. | Thực hiện xóa vật lý (Hard-delete) nhưng đóng gói toàn bộ dữ liệu JSON lưu vào bảng `removal_logs` để phục hồi khi cần. | Phục hồi dữ liệu phòng chống thao tác nhầm. |
| 2 | Đảm bảo dòng tiền | Yêu cầu xóa hóa đơn hoặc lịch sử thanh toán. | Chặn xóa giao dịch thanh toán. Với hóa đơn, hỗ trợ đổi trạng thái thành "Đã hủy" (CANCELLED). | Tính minh bạch tài chính. |
| 3 | Toàn vẹn dữ liệu dịch vụ | Yêu cầu xóa chỉ số điện/nước. | Vô hiệu hóa nút xóa bản ghi chỉ số sau khi đã chốt lưu thành công. | |
| 4 | Không cho phép chỉnh sửa | Yêu cầu sửa số liệu doanh thu. | Tự động tính toán (SUM) từ dữ liệu gốc, không thiết kế API/Giao diện cho phép can thiệp số tổng. | |
| 5 | Ràng buộc Database | Yêu cầu xóa phòng đang có khách ở. | Kiểm tra ràng buộc khóa ngoại (Foreign Key) tới bảng Contracts. Trả về mã lỗi 409 (Conflict) và chặn thao tác xóa. | Tránh lỗi mồ côi dữ liệu. |