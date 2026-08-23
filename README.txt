GAMEVUI v2.3 - Build Fix

Chỉ thay 1 file:
src/DoctorRelaxGame.tsx

Lỗi đã sửa:
TS2774 tại hiệu ứng glow vật phẩm.

Từ:
glow.addColorStop(.48, color.replace ? color : item.color);

Thành:
glow.addColorStop(.48, color);

Không thay gameplay, UI hay thông số game.
