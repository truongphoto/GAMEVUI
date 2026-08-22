# Bác Sĩ Thư Giãn - Trường GPP

Bản React + Vite đã được chuẩn bị sẵn để chạy trên GitHub Pages. Game gồm bệnh viện ban đầu, 4 cấp nâng cấp, 6 màn mỗi chặng, âm thanh, vật lý thuốc và màn chúc mừng sau mỗi cấp.

## Cơ chế V4

- Logo GPP thường, cà phê và trái tim xuất hiện xuyên suốt.
- Cấp 1 thêm xe cấp cứu và thuốc đầu lâu.
- Cấp 2 giữ vật phẩm cũ, thêm nam châm và virus.
- Cấp 3 giữ toàn bộ vật phẩm, thêm phi thuyền, trọng lực nhẹ và thiên thạch.
- Cấp 4 giữ tất cả, thêm logo GPP cầu vồng và hố đen quá tải.
- Âm thưởng và âm phạt khác nhau; thuốc va chạm, nảy nhẹ, xoay và lệch hướng tự nhiên.

## Nâng cấp V5

- Bảng chúc mừng chuyên nghiệp sau mỗi cấp, thống kê điểm, kỷ lục, combo và tiến độ.
- Hoàn thành cấp nào sẽ mở khóa và lưu cấp đó; người chơi có thể chọn lại cấp đã mở.
- Cấp 4 có bảng hoàn thành toàn bộ hành trình và nút “Chơi lại hành trình”.
- Camera điện ảnh riêng cho điện thoại, tập trung vào trung tâm TRƯỜNG GPP rồi từ từ mở rộng.
- Logo GPP không chữ và số điện thoại hiển thị trên tab trình duyệt.
- Hỗ trợ cài game thành lối tắt trên PC và điện thoại, chơi khi mạng yếu và thông báo cập nhật phiên bản.

## Nâng cấp V6

- Riêng màn toàn cảnh trên điện thoại: camera điện ảnh di chuyển liên tục theo đường cong riêng ở từng cấp, bắt đầu quanh TRƯỜNG GPP và lướt qua nhiều khu vực.
- Giữ góc rộng trong 5 giây cuối; sau khi hoàn thành, toàn cảnh tiếp tục hiển thị 6 giây trước bảng chúc mừng và có nút “Bỏ qua” xuất hiện sau 2 giây.
- Sáu màn có mục tiêu tăng dần từ 700 đến 1.400 điểm; lượng thuốc và tốc độ rơi tăng nhẹ theo từng màn.
- 10 giây cuối có thuốc giá trị cao hơn; màn 6 có “Khoảnh khắc vàng” trong 5 giây cuối.
- Kết quả mỗi màn có hạng Vàng, Bạc, Đồng hoặc Năng lượng xanh; không bắt buộc đạt mục tiêu nên game vẫn thư giãn.

## Sửa điểm rơi V6.1

- “Điểm rơi” là tổng điểm in trên các viên thuốc bắt buộc phải xuất hiện trong màn, không còn là con số ước tính.
- Mỗi lượt chọn trước một tổng điểm nằm đúng khung của màn; hệ thống chia chính xác tổng đó cho toàn bộ thuốc và thả hết trước khi hết giờ.
- Cả bệnh viện ban đầu và Cấp 1–4 đều áp dụng cùng bảng 6 màn; tốc độ, nhịp thả và số thuốc tăng dần.
- Combo, logo và vật phẩm đặc biệt vẫn cộng thêm ngoài tổng điểm thuốc bắt buộc.

## Điều chỉnh V6.2

- Bỏ dòng xác nhận tổng điểm thuốc ở bảng kết thúc để giao diện gọn hơn; cơ chế bắt buộc thả đủ điểm vẫn giữ nguyên.

## Thời gian thưởng V6.3

- Mỗi màn luôn có 60 giây chính; trái tim tích thêm thời gian thưởng (giới hạn đã được nâng lên 15 giây ở V6.4).
- Khi 60 giây chính kết thúc, đồng hồ chuyển sang màu hồng và mở riêng “Thời gian thưởng”.
- Thuốc tiếp tục rơi trong thời gian thưởng và vẫn cộng vào điểm người chơi, nhưng không thuộc ngân sách điểm bắt buộc của màn.
- Không xuất hiện thêm trái tim trong thời gian thưởng; nhạc nền tăng nhịp nhẹ để tạo cao trào.

## Thuốc có trọng lượng và Tim Sao Băng V6.4

- Mọi viên thuốc chỉ có giá trị từ 1 đến 10 điểm; thuốc càng nhiều điểm càng nặng và rơi nhanh, từ 0,8x đến 2x.
- Trọng lượng điểm được đưa vào va chạm vật lý: viên nặng đẩy viên nhẹ lệch hướng rõ hơn.
- Ngân sách điểm được chia thành 80% trong 50 giây đầu và 20% trong 10 giây cuối; hệ thống giữ thuốc xuất hiện liên tục, không để trống màn hình gần hết giờ.
- Mỗi màn có đúng hai tim thường và một Tim Sao Băng, mỗi tim cộng 5 giây, tổng thời gian thưởng tối đa 15 giây.
- Tim Sao Băng là vật phẩm nhanh nhất game, bay zíc-zắc, có cảnh báo và vùng chạm hỗ trợ để khó nhưng vẫn bắt được.

## Giao diện tự động theo thiết bị

- Máy tính: giao diện ngang, hiển thị đầy đủ thông tin và toàn bộ khu chơi.
- Điện thoại: giao diện dọc, nút lớn, bảng thông tin gọn và khu chơi cao hơn.
- Cả hai giao diện dùng chung một trang web và một đường link GitHub Pages.

## Đưa game lên GitHub Pages

1. Trên GitHub, chọn **New repository** và đặt tên, ví dụ `bac-si-thu-gian-gpp`.
2. Chọn repository **Public**, sau đó bấm **Create repository**.
3. Giải nén file ZIP này. Trong repository, chọn **Add file → Upload files**.
4. Kéo toàn bộ nội dung bên trong thư mục đã giải nén lên GitHub, bao gồm cả thư mục `.github`.
5. Bấm **Commit changes**.
6. Vào **Settings → Pages**. Tại **Build and deployment → Source**, chọn **GitHub Actions**.
7. Mở tab **Actions**, chờ quy trình “Deploy game to GitHub Pages” hiện dấu tích xanh.
8. Link chơi sẽ có dạng `https://TEN-TAI-KHOAN.github.io/TEN-REPOSITORY/`.

## Chạy thử trên máy tính

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

## Tạo bản phát hành

```bash
npm run build
```

Thư mục kết quả là `dist`.
