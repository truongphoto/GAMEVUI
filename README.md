# Bác Sĩ Thư Giãn - Trường GPP

Bản React + Vite đã được chuẩn bị sẵn để chạy trên GitHub Pages. Game gồm bệnh viện ban đầu, 4 cấp nâng cấp, 6 màn mỗi chặng, âm thanh, vật lý thuốc và màn chúc mừng sau mỗi cấp.

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
