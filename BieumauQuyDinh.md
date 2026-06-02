### Danh sách các Biểu mẫu và Quy định
Để làm rõ các yêu cầu nghiệp vụ đã liệt kê, nhóm tiến hành đặc tả các Biểu mẫu (BM) nhập liệu chính và các Quy định (QĐ) nghiệp vụ ràng buộc đi kèm.

#### Biểu mẫu 1 và quy định 1
**\* BM 1.1: Đăng nhập hệ thống**

| **Email đăng nhập** | **Mật khẩu (Password)** |
| :--- | :--- |
| | |

- **QĐ 1.1:** Email đăng nhập phải tồn tại trong hệ thống và mật khẩu (đã mã hóa) phải khớp với thông tin tài khoản tương ứng.

**\* BM 1.2: Đặt lại mật khẩu (Quên mật khẩu)**
Biểu mẫu này dùng để người dùng yêu cầu cấp lại mật khẩu khi quên.

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Email đăng nhập | Chuỗi (String) | Nhập email đã đăng ký. |

- **QĐ 1.2:** Email phải tồn tại. Hệ thống sẽ gửi email chứa liên kết (kèm token) để đặt lại mật khẩu mới.

**\* BM 1.3: Tạo tài khoản khách thuê**
Biểu mẫu này dùng để người quản trị tạo mới tài khoản đăng nhập cho khách thuê phòng.

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Email đăng nhập | Chuỗi (String) | Dùng làm tên đăng nhập. |
| 2 | Họ và tên | Chuỗi (String) | Họ tên khách thuê. |
| 3 | Số điện thoại | Chuỗi (String, 10) | |
| 4 | Số phòng | Chuỗi (String) | Gán vào phòng cụ thể (VD: P101). |
| 5 | Mật khẩu tạm thời | Chuỗi (String) | Mật khẩu để đăng nhập lần đầu. |

- **QĐ 1.3:** Ràng buộc tạo tài khoản:

| **STT** | **Nội dung ràng buộc** | **Áp dụng cho** | **Ghi chú** |
| :---: | :--- | :---: | :--- |
| 1 | Email đăng nhập không được trùng lặp. | BM 1.3 | Hệ thống kiểm tra tính duy nhất. |
| 2 | Email và mật khẩu không được để trống. | BM 1.3 | |
| 3 | Mật khẩu tạm thời phải dài tối thiểu 8 ký tự. | BM 1.3 | |

**\* BM 1.4: Cập nhật thông tin cá nhân**
Biểu mẫu này dùng để Admin/Khách thuê tự cập nhật hồ sơ cá nhân của mình.

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Họ và tên | Chuỗi (String) | Tên đầy đủ. |
| 2 | Số điện thoại | Chuỗi (String) | Số điện thoại liên hệ. |
| 3 | Đổi mật khẩu | Chuỗi (String) | (Tùy chọn) Mật khẩu cũ và mới. |

- **QĐ 1.4:** Khi thay đổi mật khẩu, mật khẩu cũ phải chính xác.

**\* BM 1.5: Xem lịch sử xóa & Khôi phục**
Biểu mẫu này dành riêng cho Admin theo dõi các thao tác xóa dữ liệu (Soft delete / Removal Logs).

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Loại dữ liệu bị xóa | Chuỗi (String) | Phòng, Khách thuê, Hợp đồng... |
| 2 | Thời gian xóa | Ngày giờ (Datetime)| |
| 3 | Người thực hiện | Chuỗi (String) | Tên Admin thực hiện xóa. |

- **QĐ 1.5:** Khi thực hiện thao tác xóa khách thuê, hệ thống sẽ gỡ bỏ hoàn toàn dữ liệu tài khoản, hợp đồng và các hóa đơn liên quan để giải phóng dữ liệu, đồng thời tự động lưu vết lại thao tác tại Lịch sử xóa của Admin.

#### Biểu mẫu 2 và quy định 2
**\* BM 2.1: Thông tin phòng trọ (Thêm/Sửa/Xóa)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Số phòng | Chuỗi (String) | Ký hiệu phòng (VD: P101). |
| 2 | Tầng | Số nguyên (Smallint)| Vị trí tầng. |
| 3 | Diện tích | Số (Numeric) | Diện tích tính bằng m2. |
| 4 | Số người tối đa | Số nguyên (Smallint)| Sức chứa tối đa của phòng. |
| 5 | Giá thuê | Số (Numeric) | Giá tiền thuê 1 tháng. |
| 6 | Trạng thái | Lựa chọn (Enum) | Trạng thái phòng. |

- **QĐ 2.1:** Ràng buộc phòng trọ:

| **STT** | **Nội dung ràng buộc** | **Áp dụng cho** | **Ghi chú** |
| :---: | :--- | :---: | :--- |
| 1 | Số phòng không được trùng lặp và không được bỏ trống. | BM 2.1 | |
| 2 | Giá thuê và Diện tích phải lớn hơn 0. | BM 2.1 | Đảm bảo logic dữ liệu. |
| 3 | Trạng thái phòng phải thuộc {AVAILABLE, HELD, RENTED, MAINTENANCE}. | BM 2.1 | HELD: Phòng đang được khách giữ chỗ. |

**\* BM 2.2: Quản lý danh mục tài sản phòng**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Tên tài sản | Chuỗi (String) | Tên trang thiết bị (VD: Điều hòa). |
| 2 | Số lượng | Số nguyên | Số lượng hiện có trong phòng. |
| 3 | Trạng thái | Lựa chọn (Enum) | Tình trạng thiết bị (OK, BROKEN, MAINTENANCE, LOST). |
| 4 | Ghi chú | Chuỗi (String) | Mô tả thêm chi tiết. |

- **QĐ 2.2:** Số lượng tài sản phải ≥ 1. Trạng thái bắt buộc phải thuộc {OK, BROKEN, MAINTENANCE, LOST}.

#### Biểu mẫu 3 và quy định 3
**\* BM 3: Thêm/Sửa/Xóa thông tin khách thuê (Dành cho Admin)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Họ và tên | Chuỗi (String) | Họ tên đầy đủ. |
| 2 | Số điện thoại | Chuỗi (String) | Số liên hệ chính thức. |
| 3 | Email liên hệ | Chuỗi (String) | Địa chỉ email của khách. |

- **QĐ 3:** Email liên hệ và Số điện thoại khi cập nhật phải đúng định dạng chuẩn.

#### Biểu mẫu 4 và quy định 4
**\* BM 4.1: Yêu cầu giữ chỗ tạm thời (Dành cho Guest)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Phòng yêu cầu | Lựa chọn | Chỉ hiển thị phòng AVAILABLE. |
| 2 | Họ và tên | Chuỗi (String) | Người liên hệ. |
| 3 | Số điện thoại | Chuỗi (String) | SĐT liên hệ. |

- **QĐ 4.1:** Sau khi đăng ký giữ chỗ, trạng thái phòng lập tức chuyển sang `HELD`. Thời gian giữ chỗ mặc định là 15 phút. Hết thời gian này nếu khách không tải lên minh chứng đặt cọc, phòng tự động hoàn về `AVAILABLE`.

**\* BM 4.2: Gửi minh chứng đặt cọc (Dành cho Guest)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Ảnh minh chứng | Chuỗi (String) | Upload ảnh biên lai chuyển khoản. |
| 2 | Ghi chú | Chuỗi (String) | Lời nhắn gửi Admin. |

- **QĐ 4.2:** Yêu cầu upload ảnh trước khi hết đếm ngược 15 phút. Khi Admin duyệt (QĐ 4.3) và xác nhận tiền cọc, hệ thống tiến hành khóa phòng để chờ tạo hợp đồng chính thức.

#### Biểu mẫu 5 và quy định 5
**\* BM 5: Lập/Sửa/Hủy hợp đồng thuê phòng**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Phòng thuê | Lựa chọn | Chọn từ danh sách phòng. |
| 2 | Khách thuê đại diện | Lựa chọn | Chọn từ danh sách khách hàng. |
| 3 | Ngày bắt đầu | Ngày (Date) | Ngày dọn vào ở. |
| 4 | Ngày kết thúc | Ngày (Date) | Ngày hết hạn hợp đồng. |
| 5 | Tiền cọc | Số (Numeric) | Số tiền khách đã đặt cọc. |
| 6 | Giá chốt thuê | Số (Numeric) | Giá thỏa thuận thực tế. |

- **QĐ 5:** Ràng buộc hợp đồng:

| **STT** | **Nội dung ràng buộc** | **Áp dụng cho** | **Ghi chú** |
| :---: | :--- | :---: | :--- |
| 1 | Phòng được chọn không được có hợp đồng nào khác đang ở trạng thái "ACTIVE". | BM 5 | Hỗ trợ Admin linh hoạt quản lý. |
| 2 | Ngày kết thúc hợp đồng phải sau hoặc bằng Ngày bắt đầu. | BM 5 | |
| 3 | Khi Hợp đồng được lưu thành công, trạng thái phòng tự động chuyển sang "RENTED". | BM 5 | Cập nhật tự động. |

#### Biểu mẫu 6 và quy định 6
**\* BM 6.1: Cấu hình dịch vụ và biểu giá**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Tên dịch vụ | Chuỗi (String) | Điện, Nước, Rác... |
| 2 | Loại dịch vụ | Lựa chọn (Enum) | Tính theo số lượng (Số khối/ký) hay cố định. |
| 3 | Cấu hình giá | Chuỗi/JSON | Đơn giá phẳng hoặc mảng JSON cấu hình Biểu giá bậc thang. |

- **QĐ 6.1:** Đơn giá hoặc biểu giá cấu hình phải có giá trị > 0. Những cập nhật về giá sẽ được áp dụng cho kỳ hóa đơn tiếp theo (không làm thay đổi hóa đơn cũ).

**\* BM 6.2: Đăng ký/Hủy đăng ký dịch vụ (cho từng phòng)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Phòng / Khách thuê | Lựa chọn | Đối tượng được gán dịch vụ. |
| 2 | Tên dịch vụ | Lựa chọn | Ví dụ: Wifi, Gửi xe, Dọn rác. |
| 3 | Đăng ký | Boolean | Kích hoạt (True) / Hủy (False). |

- **QĐ 6.2:** Dịch vụ khi đăng ký thành công sẽ tự động cộng dồn vào hóa đơn tổng hàng tháng tương ứng với phòng/khách thuê đó.

**\* BM 6.3: Chốt chỉ số điện, nước tháng**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Kỳ chốt sổ (Tháng/Năm) | Ngày (Date) | |
| 2 | Phòng chốt số | Lựa chọn | Phòng tương ứng. |
| 3 | Số điện (Mới) | Số (Numeric) | Số điện chốt cuối kỳ. |
| 4 | Số nước (Mới) | Số (Numeric) | Số nước chốt cuối kỳ. |

- **QĐ 6.3:** Số mới nhập vào bắt buộc phải ≥ Số cũ (của tháng trước). Nếu nhỏ hơn, hệ thống sẽ báo lỗi.

#### Biểu mẫu 7 và quy định 7
**\* BM 7.1: Lập/Sửa/Hủy hoá đơn tính tiền tháng**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Hợp đồng | Lựa chọn | Chọn hợp đồng tương ứng. |
| 2 | Tiền phòng | Số (Numeric) | Hệ thống tự lấy từ hợp đồng. |
| 3 | Tiền điện | Số (Numeric) | Tự tính: Theo biểu giá bậc thang. |
| 4 | Tiền nước | Số (Numeric) | Tự tính: Theo biểu giá bậc thang (hoặc đơn giá phẳng). |
| 5 | Các khoản phí khác | Số (Numeric) | Rác, Wifi, Gửi xe... (dựa trên đăng ký DV). |
| 6 | Tổng cộng | Số (Numeric) | Tổng giá trị hóa đơn. Hệ thống tự tính. |
| 7 | Hạn thanh toán | Ngày (Date) | Ngày cuối cùng để đóng tiền. |

- **QĐ 7.1:** Ràng buộc hoá đơn:

| **STT** | **Nội dung ràng buộc** | **Áp dụng cho** | **Ghi chú** |
| :---: | :--- | :---: | :--- |
| 1 | Tổng cộng = Tiền phòng + Tiền điện + Tiền nước + Phí khác. | BM 7.1 | Tự động tính toán 100%. |
| 2 | Hóa đơn vừa lập mặc định ở trạng thái "UNPAID". | BM 7.1 | |

**\* BM 7.2: Upload minh chứng thanh toán (Dành cho Tenant)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Mã hóa đơn | Lựa chọn | Chọn hóa đơn đang nợ. |
| 2 | Ảnh minh chứng | Chuỗi (String) | Upload ảnh biên lai/chuyển khoản. |
| 3 | Ghi chú gửi Admin | Chuỗi (String) | Lời nhắn thêm (nếu có). |

- **QĐ 7.2:** Chỉ được phép upload minh chứng khi hóa đơn đang ở trạng thái "UNPAID" hoặc "PARTIAL".

**\* BM 7.3: Xác nhận và ghi nhận thanh toán (Dành cho Admin)**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Mã hóa đơn | Lựa chọn | Chọn hóa đơn cần ghi nhận. |
| 2 | Số tiền thực nhận | Số (Numeric) | Số tiền Admin đã nhận được. |
| 3 | Phương thức | Lựa chọn (Enum) | Chuyển khoản (CK) hoặc Tiền mặt. |
| 4 | Ghi chú | Chuỗi (String) | Nội dung giao dịch. |

- **QĐ 7.3:** Số tiền thực nhận phải ≥ 0. Khi Admin xác nhận hoàn tất thanh toán, hệ thống tự động đổi trạng thái hóa đơn sang "PAID".

#### Biểu mẫu 8 và quy định 8
**\* BM 8.1: Gửi yêu cầu báo sự cố phòng**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Tiêu đề sự cố | Chuỗi (String) | Tên sự cố cần báo cáo. |
| 2 | Mô tả chi tiết | Chuỗi (String) | Chi tiết hỏng hóc. |
| 3 | Ảnh chụp hiện trường | Chuỗi (String) | Link ảnh thực tế. |

**\* BM 8.2: Tiếp nhận và xử lý sự cố**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Mã sự cố | Lựa chọn | Chọn sự cố đang theo dõi. |
| 2 | Người xử lý | Lựa chọn | Chọn nhân viên sửa chữa. |
| 3 | Trạng thái xử lý | Lựa chọn (Enum) | {OPEN, IN_PROGRESS, RESOLVED, CLOSED}. |

- **QĐ 8:** Trạng thái xử lý sự cố bắt buộc phải thuộc {OPEN, IN_PROGRESS, RESOLVED, CLOSED}.

#### Biểu mẫu 9 và quy định 9
**\* BM 9.1: Gửi/Xóa thông báo khu trọ**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Người nhận | Lựa chọn | Chọn cá nhân hoặc tất cả khách thuê. |
| 2 | Tiêu đề thông báo | Chuỗi (String) | Tóm tắt nội dung thông báo. |
| 3 | Nội dung | Chuỗi (String) | Nội dung chi tiết cần thông báo. |

- **QĐ 9.1:** Tiêu đề và nội dung thông báo không được bỏ trống. Người nhận thông báo bắt buộc phải là các tài khoản đang trong trạng thái Hoạt động.

#### Biểu mẫu 10 và quy định 10
**\* BM 10.1: Lập báo cáo doanh thu & công nợ**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Kỳ báo cáo (Tháng/Năm) | Ngày (Date) | Khoảng thời gian thống kê. |
| 2 | Tổng hóa đơn phát hành | Số nguyên | Số lượng hóa đơn trong kỳ. |
| 3 | Doanh thu thực tế đã thu | Số (Numeric) | Tổng tiền từ các hóa đơn đã thanh toán. |
| 4 | Tổng công nợ tồn đọng | Số (Numeric) | Số tiền chưa thu từ các hóa đơn chưa thanh toán. |

**\* BM 10.2: Lập báo cáo phòng trống**

| **STT** | **Trường/Mục** | **Kiểu dữ liệu** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Tổng số phòng | Số nguyên | Tổng quy mô phòng trọ. |
| 2 | Số phòng đang thuê | Số nguyên | Số phòng có khách đang ở (RENTED). |
| 3 | Số phòng đang trống | Số nguyên | Số phòng sẵn sàng đón khách (AVAILABLE). |
| 4 | Tỷ lệ lấp đầy (%) | Số thực | Phần trăm hiệu suất phòng. |

- **QĐ 10:** Ràng buộc báo cáo & kết xuất:

| **STT** | **Nội dung ràng buộc** | **Áp dụng cho** | **Ghi chú** |
| :---: | :--- | :---: | :--- |
| 1 | Tỷ lệ lấp đầy (%) = (Số phòng đang thuê / Tổng số phòng) * 100%. | BM 10.2 | Hệ thống tự động tính. |
| 2 | Tổng công nợ tồn đọng phải bằng tổng tiền phòng + dịch vụ của tất cả hóa đơn có trạng thái "UNPAID". | BM 10.1 | Cập nhật thời gian thực. |
| 3 | Dữ liệu báo cáo phải hỗ trợ xuất bản ra định dạng tệp CSV để lưu trữ ngoài. | BM 10.1, 10.2 | Tính năng kết xuất. |

---

**- Bảng trách nhiệm yêu cầu nghiệp vụ:**

| **STT** | **Tên yêu cầu** | **Người dùng** | **Phần mềm** | **Ghi chú** |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Quản lý hệ thống | Admin/Tenant: Đăng nhập (BM 1.1), cung cấp thông tin tạo/sửa tài khoản khách (BM 1.3, 1.4). | Xác thực email đăng nhập (QĐ 1.1), kiểm tra các quy định tạo/xóa tài khoản (QĐ 1.2, QĐ 1.3) và lưu vào CSDL. | Bảo mật |
| 2 | Quản lý phòng trọ | Admin: Cung cấp thông tin phòng (BM 2.1) hoặc thông tin tài sản (BM 2.2). | Kiểm tra quy định QĐ 2.1, QĐ 2.2. Ghi nhận thông tin phòng và danh mục thiết bị vào CSDL. | |
| 3 | Quản lý khách thuê | Admin: Cung cấp hoặc chỉnh sửa hồ sơ thông tin khách thuê (BM 3). | Kiểm tra định dạng liên lạc (QĐ 3). Cập nhật hồ sơ cá nhân của khách trong hệ thống. | |
| 4 | Giữ chỗ & Đặt cọc | Guest: Gửi yêu cầu giữ chỗ (BM 4.1) và upload biên lai cọc (BM 4.2). | Tự động đổi phòng sang `HELD` và kích hoạt đếm ngược 15 phút. | Tự động hóa |
| 5 | Quản lý hợp đồng | Admin: Điền thông tin phòng, khách thuê đại diện và tiền đặt cọc (BM 5). | Kiểm tra quy định QĐ 5 (chỉ 1 HĐ ACTIVE/phòng). Ghi nhận hợp đồng và đổi trạng thái phòng sang "RENTED". | Tự động cập nhật |
| 6 | Quản lý dịch vụ | Admin: Định nghĩa biểu giá (BM 6.1), gán dịch vụ phụ (BM 6.2) và chốt số điện nước (BM 6.3). | Kiểm tra tính liên tục số liệu (QĐ 6.3). Lưu trữ thông tin và cộng dồn vào hóa đơn tổng. | |
| 7 | Hóa đơn & thanh toán | Admin/Tenant: Xác nhận lập hóa đơn (BM 7.1) hoặc gửi minh chứng (BM 7.2), Admin duyệt (BM 7.3). | Tính tiền phòng + dịch vụ + điện nước tự động (QĐ 7.1). Ghi nhận giao dịch đóng tiền và đổi sang "PAID". | Tự động tính toán |
| 8 | Quản lý sự cố & bảo trì | Tenant gửi báo sự cố (BM 8.1). Admin tiếp nhận xử lý (BM 8.2). | Ghi nhận sự cố, chuyển đổi trạng thái xử lý (QĐ 8: OPEN, IN_PROGRESS, RESOLVED, CLOSED). | Tương tác hai chiều |
| 9 | Quản lý thông báo | Admin: Soạn tiêu đề, nội dung và chọn đối tượng nhận thông báo (BM 9.1). | Kiểm tra quy định QĐ 9.1. Phát thông báo thời gian thực đến khách thuê hợp lệ. | |
| 10 | Báo cáo & thống kê | Admin: Chọn thời gian báo cáo, yêu cầu xuất dữ liệu (BM 10.1, BM 10.2). | Tính toán doanh thu, phòng trống theo QĐ 10. Kết xuất biểu đồ và tệp CSV. | Có xuất file CSV |