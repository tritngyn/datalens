# Review UI-P — 16-11-2026

## Kết luận

Đã có prototype tương tác độc lập với backend tại `?preview=design`, banner dữ liệu minh họa, chart/drill-down, review explorer và các trạng thái. **Lưu snapshot code để review; chưa nghiệm thu UI-P cuối cùng. Cần sửa hai mục bên dưới.** Tải dự kiến: một người duyệt, 23 review synthetic; không đánh giá production hoặc nhiều người dùng.

## 1. Căn cứ phải theo câu trả lời vừa xem

- Code: `fe/src/prototype/data.ts` phần `SCENARIOS.evidence`, `fe/src/PrototypeWorkspace.tsx` phần `activateScenario` và `scenarioSample`.
- Tái hiện: chọn “Chỉ xem tiêu cực về hiệu quả dưỡng” → câu trả lời dùng `SYN-014`; sau đó chọn “Đọc review làm căn cứ” → bộ mẫu đổi thành `SYN-001, SYN-002, SYN-009, SYN-014, SYN-020` của câu so sánh.
- Vấn đề: control mang nghĩa hỏi tiếp về câu trả lời trước, nhưng lại chuyển sang căn cứ của một câu khác. Người duyệt không xác định được review nào thật sự hỗ trợ câu trả lời vừa đọc.
- Sửa nhỏ nhất: giữ ID kịch bản câu trả lời nội dung gần nhất; hành động đọc căn cứ tái dùng scope và sample của kịch bản đó. Nếu chưa chọn câu hỏi khác, mặc định so sánh. Không cần framework chat hoặc backend.
- Test cần thêm: compare → evidence giữ năm ID; negative-benefits → evidence giữ riêng SYN-014; thao tác citation vẫn mở đúng review.

## 2. Không có kết quả khác chưa xử lý

- Code: `fe/src/PrototypeWorkspace.tsx` nhánh `designState === 'empty'` trả `new Set<string>()`, trong khi thông điệp mô tả analysis không trả mention nào.
- Tái hiện qua code: coverage của empty state là `processed=0, pending=23`; chart không dữ liệu vì chưa xử lý, không phải đã xử lý nhưng không có nhãn phù hợp.
- Sửa nhỏ nhất: tách population đã xử lý với population có mention trong kịch bản empty. Ví dụ mô phỏng review đã xử lý nhưng đều không có mention đủ điều kiện; giữ counters, chart và explorer nhất quán. Không chỉ đổi chữ và để count sai ngữ nghĩa.
- Test cần thêm: empty có processed=total, pending=0; không có review đủ điều kiện; mẫu số chart bằng 0 và rate=null. Running/partial giữ đúng counters hiện có.

## Kiểm tra Codex đã chạy lại

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run test`: 16/16 PASS. Các test hiện tại chưa phủ hai chuỗi hành vi nêu trên.
- Chạy đối chiếu trực tiếp bằng Node với module prototype: sample của negative-benefits là `[SYN-014]`, evidence là bộ năm ID; coverage của empty processed set là 0/23.
- Đọc App routing: preview chặn effect getAnalysis; không thấy lời gọi API trong prototype. Không tự xác minh network traffic trong browser.
- Xem ảnh PI giao `desktop-completed.png`, `mobile-completed.png`: đã có hệ giao diện và bố cục; đây là ảnh bàn giao, không phải screenshot Codex chụp lại.
- Thử chụp localhost bằng Taste Skill `shoot.mjs`: thất bại `Chrome did not start`. Chưa kiểm tra độc lập click/keyboard/viewport, không ghi browser QA PASS cho lượt review này. QA browser trong delivery vẫn là kết quả PI báo cáo.

## Lệnh giao PI sửa riêng UI-P

```text
Đọc docs/ui-p-review.md, chỉ sửa finding 1 và 2 trong UI-P.
Giữ scope prototype synthetic, không AI/backend, không sửa API hoặc database.
Thêm test bắt đúng hai lỗi, chạy lint/build/test và browser QA nếu khả dụng.
Cập nhật fe/UI_PROTOTYPE_DELIVERY.md và tracking theo kết quả thật.
Dừng để review; chưa commit/push và chưa làm P2/P3/P5.
```

Code frontend UI-A và UI-P đang được lưu cùng một snapshot vì UI-P dựa vào UI-A chưa commit trước đó. Backend và cấu hình cloud trong working tree không thuộc review/commit frontend này. Duyệt thiết kế thị giác cuối cùng vẫn do người dùng quyết định.
