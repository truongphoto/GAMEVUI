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
