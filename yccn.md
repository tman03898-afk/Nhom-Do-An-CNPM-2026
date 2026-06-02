## Yêu cầu công nghệ

**- Bảng yêu cầu công nghệ:**

| **STT** | **Yêu cầu** | **Mô tả chi tiết** | **Ghi chú** |
| :---: | :--- | :--- | :--- |
| 1 | Dễ sửa lỗi | Xác định lỗi trung bình trong 10 phút. Khi sửa đổi lỗi một chức năng không ảnh hưởng đến chức năng khác. | Code theo module. |
| 2 | Dễ bảo trì | Thêm chức năng mới nhanh. Không ảnh hưởng đến chức năng đã có. | Thiết kế API tách biệt. |
| 3 | Nền tảng | **Hệ thống Web (Responsive):**<br>- Dành cho Admin (Giao diện quản trị Laptop/PC).<br>- Dành cho Khách thuê & Khách vãng lai (Giao diện tối ưu Mobile). | Web App duy nhất, tương thích đa thiết bị. |
| 4 | Cơ sở dữ liệu | PostgreSQL | Xử lý tốt dữ liệu quan hệ, bảo mật cao. |
| 5 | Công nghệ Backend | Node.js (Express) | |
| 6 | Công nghệ Frontend | React + Tailwind CSS. | Tối ưu Mobile-first, UI/UX mượt mà. |
| 7 | Môi trường triển khai | Máy chủ đám mây (Cloud VPS như DigitalOcean/AWS) hoặc hệ sinh thái Vercel/Render. | Đảm bảo uptime cao, dễ mở rộng. |

**- Bảng trách nhiệm yêu cầu công nghệ:**

| **STT** | **Nghiệp vụ** | **Người dùng** | **Phần mềm / Hệ thống** |
| :---: | :--- | :--- | :--- |
| 1 | Vận hành Backend | Tất cả | Cung cấp các API RESTful nhanh, bảo mật (sử dụng JWT). Xử lý logic nghiệp vụ chính xác (tính toán hóa đơn, phân quyền). |
| 2 | Vận hành Frontend | Tất cả | Ứng dụng Web chạy ổn định trên các trình duyệt hiện đại (Chrome, Edge, Safari). Giao diện tự động co giãn (Responsive) tương thích tốt trên cả Laptop và Điện thoại. |
| 3 | Vận hành CSDL | Hệ thống | Đảm bảo các ràng buộc, khóa ngoại (phòng, hợp đồng, hóa đơn) được thiết lập đúng để duy trì tính toàn vẹn dữ liệu. Hỗ trợ backup tự động. |

## Phân tích yêu cầu
*   **Tính khả thi kỹ thuật:** Hoàn toàn khả thi. Ngăn xếp công nghệ (Node.js, React, PostgreSQL) rất phổ biến, có cộng đồng hỗ trợ lớn. Việc xây dựng một Web App Responsive thay vì viết App Native giúp tiết kiệm cực kỳ nhiều thời gian phát triển, đồng thời vẫn đáp ứng được nhu cầu truy cập mọi lúc mọi nơi của các nhóm người dùng.
*   **Tính khả thi nghiệp vụ:** Hoàn toàn khả thi. Các quy trình nghiệp vụ như quản lý phòng, lập hợp đồng, chốt điện nước và xuất hóa đơn là các bài toán quản lý tiêu chuẩn, logic rõ ràng và có thể số hóa triệt để giúp tiết kiệm thời gian.
*   **Tính khả thi về con người:** Việc vận hành hoàn toàn trên nền tảng Web mang lại ưu điểm tuyệt đối. Admin có thể dễ dàng quản lý bằng Laptop. Trong khi đó, Khách vãng lai (Guest) và Khách thuê (Tenant) không cần tải bất kỳ ứng dụng nào cho nặng máy, chỉ cần mở trình duyệt điện thoại là có thể xem phòng, tra cứu hóa đơn hay báo cáo sự cố cực kỳ tiện lợi và nhanh chóng.

# Mô hình hoá yêu cầu chức năng

## Tổng quan về mô hình hoá yêu cầu
Quá trình khảo sát cho thấy các quy trình nghiệp vụ thủ công hiện tại (sổ sách, Excel) dẫn đến nhiều sai sót. Việc đặc tả yêu cầu bằng văn bản là một bước quan trọng, tuy nhiên, văn bản vẫn có thể dẫn đến sự mơ hồ, khó hình dung.

Mô hình hóa yêu cầu sẽ giải quyết triệt để vấn đề này. Sử dụng các sơ đồ để trực quan hóa hệ thống, đảm bảo độ chính xác cao và thể hiện tốt các mối liên hệ giữa các chức năng, dữ liệu và người dùng.