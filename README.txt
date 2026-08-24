GAMEVUI PA2.2 - Mobile Result Action Dock

Mục tiêu:
- Sửa màn hoàn thành trên điện thoại landscape để nút Sang màn luôn nhìn thấy và dễ bấm.

Đã triển khai đủ 10 phương án đã chốt:
1. Nút Sang màn cố định ở cạnh dưới màn hình.
2. CTA xuất hiện nhẹ, không nhấp nháy liên tục.
3. Nút mobile cao 50px, vùng bấm lớn.
4. Hiển thị rõ màn/cấp kế tiếp trên nút.
5. Nội dung kết quả mobile được rút gọn và cuộn riêng khi cần.
6. Có huy hiệu KỶ LỤC MỚI theo logic điểm thực tế.
7. Nút phụ nhỏ hơn, không cạnh tranh với CTA chính.
8. Có phản hồi co nhẹ khi chạm.
9. Khóa canvas/điều khiển gameplay khi finished.
10. Nền kết quả mờ nhẹ, vẫn thấy cảnh game phía sau.

Tinh chỉnh thêm đã chốt:
- CTA cách đáy 12px + env(safe-area-inset-bottom).
- Hai bên cách mép tối thiểu 12px + safe-area.
- Không còn chừa 54px bên phải ở màn finished.
- Màn thấp <=390px tự ẩn mô tả phụ để dành chỗ cho CTA.

Version: 2.3.1
Build: gamevui-pa2.2-mobile-result-dock
