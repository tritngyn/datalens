# PI handoff — UI-B: tích hợp phân tích và so sánh thật

Ngày 16-11-2026. **Người dùng đã yêu cầu chuyển sang UI-B nếu UI-A xong.** UI-A có code, báo cáo nghiệm thu API thật của PI và checks frontend Codex chạy lại đạt. Chưa tái lập end-to-end bằng DB trong phiên kiểm tra này. Không làm lại UI-A; giữ import, URL analysis và review explorer hiện có.

## Trạng thái và dependency

- UI-B = U04 (khởi chạy/tiến độ AI) + U05 (câu so sánh mẫu, grouped bar, drill-down).
- Source backend hiện chỉ có health, preview, import, analysis detail và reviews phân trang. Chưa có worker/mentions, start/progress hoặc query/chart snapshot. UI-B chưa thể nghiệm thu bằng API thật.
- Thứ tự giao việc: **P2 → review → P3 → review → UI-B**. Mỗi lần chỉ giao một task theo yêu cầu người dùng. Lệnh P2 chuẩn bị trong [bàn giao backend](p1-review-and-p2-handoff.md); lỗi NUL P1 đã được sửa trong workspace theo tracking, không giao lại lỗi đã sửa nếu source/test xác nhận.
- DB cloud và model key cần cấu hình trước nghiệm thu backend thật; không cài PostgreSQL local/pgserver hoặc thay SQLite. Thiếu chúng không được dùng số mẫu để báo end-to-end đạt.
- UI-P là bản duyệt giao diện; hai finding tại [ui-p-review.md](ui-p-review.md) cần sửa trong prototype. Không lấy model/data/logic synthetic làm nguồn số liệu cho UI-B.

## Lệnh giao PI khi P2–P3 sẵn sàng

```text
Làm riêng UI-B (U04–U05) trong G:\projects\DataLens.
Người dùng đã duyệt chuyển sang gói này. Đọc docs/ui-b-handoff.md,
UI_UX_PLAN.md, tech.md, fe/DESIGN.md và code/API hiện tại.

Trước khi code: kiểm tra P2–P3 thực sự có start/progress, query/chart
và drill-down theo snapshot. Ghi endpoint/schema thực tế vào delivery.
Nếu thiếu dependency, báo đúng phần thiếu rồi dừng phần phụ thuộc;
không tự làm backend hoặc tạo endpoint/response giả để báo UI-B xong.

Khi đủ API, triển khai đúng feature và nghiệm thu bên dưới.
Giữ UI-A và mode preview tách biệt. Không chat/history hoặc UI-C.
Cập nhật tracking, bàn giao kết quả kiểm tra và dừng để review.
Không commit/push; Codex sẽ review và commit.
```

## Feature UI-B

1. **Khởi chạy trên analysis đã import:** đọc scope/số review và ngân sách/ước tính từ backend nếu có; thiếu usage/cost hiện chưa xác định. Nút khởi chạy dùng API P2 thật, chống gửi lặp, phân biệt imported/not_started với queued/running/completed/failed và kết quả một phần theo contract backend. Không upload lại file để tạo job mới.
2. **Tiến độ:** poll khi queued/running, dừng ở terminal state hoặc rời analysis; bỏ response cũ khi đổi analysis. Hiện số đã xử lý/lỗi/chưa xử lý và hành động backend thực sự hỗ trợ; không vẽ timer hoặc % giả.
3. **Một câu so sánh cố định:** DHC/Vaseline hoặc cặp brand của analysis, Price/Benefits. Dùng plan/query allowlist của P3, chưa cần chat tự do. Số liệu, metric definition và coverage lấy từ backend.
4. **Grouped bar và bảng số liệu:** tử số/mẫu số/rate theo contract P3. Filter Negative không biến mẫu số thành toàn review Negative. Mẫu số bằng 0 hiện không đủ dữ liệu. Review có nhiều mention không được tăng số phiếu tùy tiện.
5. **Drill-down cùng snapshot:** click/keyboard trên chart hoặc bảng mở toàn bộ review thuộc cột theo phân trang. Hiện rõ scope, tử số/mẫu số và query/snapshot đang xem; không dùng vài citation thay toàn bộ population.
6. **Reload và lỗi:** mở lại analysis từ URL; chỉ tái lập snapshot cũ khi backend cho truy lại. Worker chạy thêm không được âm thầm làm số của chart cũ khác drill-down. Lỗi mạng/không có dữ liệu/partial có trạng thái thật và đường thử lại phù hợp.

## Phạm vi file và thiết kế

- Tái dùng `App.tsx`, API client, tokens và ReviewExplorer khi phù hợp; chỉ tách component chart/progress theo trách nhiệm cần dùng.
- Có thể tái dùng hình thức chart từ UI-P sau khi sửa/đối chiếu, nhưng chart thật chỉ nhận facts từ API. Không sửa type thật cho vừa `DEMO_REVIEWS`.
- Theo tech.md, thêm Recharts khi có nhu cầu chart thật; không thêm UI kit, router hoặc framework state. Giữ bảng số liệu và drill-down dùng bàn phím.
- Không chỉnh backend/migration trong gói UI. Các mở rộng backend còn thiếu phải quay về P2/P3.
- Không triển khai UI-C: chat tự do, follow-up, history và synthesis citations theo message vẫn thuộc P5.

## Nghiệm thu

1. CSV synthetic → import API P1 → start API P2 → trạng thái thực → facts API P3 → chart → review gốc. Không dùng mode preview để nghiệm thu luồng này.
2. So một cột với response backend và review drill-down: đúng numerator/denominator/population, đúng analysis. Kiểm tra source brand khác target brand và duplicate mentions.
3. Kiểm tra reload, job partial/fail, denominator=0, filter rỗng, đổi analysis khi request đang chờ và mở snapshot cũ sau khi worker chạy thêm.
4. Build/lint/tests phù hợp đạt; browser desktop/mobile, keyboard/focus và không tràn 320px. Ghi rõ phần chưa chạy nếu thiếu DB/key/browser.
5. Báo cáo `fe/UI_B_DELIVERY.md`, ảnh trong `fe/shots/ui-b/`, cập nhật `docs/tracking.md` và bảng trạng thái `UI_UX_PLAN.md`. Chỉ ghi hoàn tất UI-B khi đã đi luồng API thật.

**Hiện tại:** gói đã có phạm vi và được người dùng cho chuyển bước; chưa tích hợp UI-B, chờ P2–P3. Không phải một task yêu cầu PI tự làm hết các P còn lại.
