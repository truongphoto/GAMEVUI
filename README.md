GAMEVUI Visual Pro v2.3 PATCH

Thay các file tương ứng trong repo hiện tại:
- src/DoctorRelaxGame.tsx
- src/styles.css
- public/manifest.webmanifest
- public/sw.js
- package.json
- package-lock.json

Sau khi GitHub Pages deploy xong, trên điện thoại đã cài bản cũ nên mở lại app để service worker v2.3 thay cache cũ. Nếu trình duyệt vẫn giữ bản trước, đóng hẳn app rồi mở lại một lần.

## PA2.4 – Compact Mobile HUD + Balanced PC Frame

- Mobile landscape: gom **Điểm · Thời gian · Thông báo · Combo · ❤️ thời gian · Hiệu ứng · Pause** vào một thanh trên cao 40px (38px với màn hình rất thấp); progress còn 2px.
- Bỏ thanh trạng thái/toast/control legacy phía dưới khi chơi để trả gần toàn bộ chiều cao cho canvas.
- Bỏ nút **Vật phẩm** mobile bị trùng ở màn chào; Vật phẩm vẫn có trong **Pause**.
- Màn hoàn thành: nút **Sang màn** ngắn hơn (tối đa 64vw/520px), cao 46px và nâng lên 58px + safe-area; giảm mảng nền tối phía dưới.
- PC: thanh trạng thái trên và **Event Dock** cùng chiều cao ~50px, cùng tông teal và căn theo cùng bề rộng vùng chơi để cân bố cục trên–dưới.
- Không thay đổi gameplay, điểm, thời gian, cấp, vật phẩm, âm thanh hay logic PWA.

## PA2.3 – Mobile Result Safe Layout + PC Event Dock

- Mobile landscape: màn hoàn thành chia 2 vùng để hiển thị đủ nội dung; nút **Sang màn** cố định cao hơn đáy **40px + safe-area**.
- PC: thêm **Event Dock** dưới canvas, gồm thương hiệu, sự kiện/ECG, combo, thời gian tim, hiệu ứng và thông tin liên hệ; toast không còn che canvas.

