# PI handoff — UI-P: prototype workspace hoàn chỉnh

Ngày giao: 16-11-2026. **Người dùng đã duyệt gói này** sau khi xem UI-A còn sơ bộ. Người dùng tự gửi lệnh cho PI Agent; chưa có agent nào được Codex khởi chạy. Chỉ giao UI-P trong lượt này, không triển khai P2/P3/P5.

## Mục tiêu

Tạo bản xem trước tương tác để người dùng duyệt bố cục và trải nghiệm hoàn chỉnh của Review Intelligence trên desktop/mobile. Không cần đợi backend AI. UI-A nhập/lưu/đọc review tiếp tục dùng API P1; prototype là chế độ riêng và ghi rõ dữ liệu minh họa.

Đây là prototype để duyệt thiết kế, không phải nghiệm thu UI-B/UI-C hoặc frontend P4 end-to-end. Thiết kế không bị chặn bởi database/key; chức năng thật vẫn phụ thuộc backend tương ứng.

## Lệnh gửi PI Agent

```text
Làm riêng UI-P — prototype workspace hoàn chỉnh trong G:\projects\DataLens.
Người dùng đã duyệt phạm vi bên dưới; không hỏi lại hướng thiết kế.
Đọc toàn bộ docs/ui-prototype-handoff.md rồi implement gói này.

Đọc source frontend hiện tại, fe/DESIGN.md, fe/UI_UX_DELIVERY.md,
UI_UX_PLAN.md, features_and_scope.md và tech.md.
Giữ mọi thay đổi đang có trong workspace. Không reset/revert hoặc
gom các thay đổi backend của task khác vào công việc này.

UI-A đã có; nhiệm vụ là hoàn thiện trải nghiệm xem trước màn phân tích,
không làm lại upload từ đầu. Thực hiện đúng feature, trạng thái,
ranh giới và tiêu chí nghiệm thu trong tài liệu này.

Bàn giao URL mở prototype, ảnh desktop/mobile, hướng dẫn tương tác,
kết quả kiểm tra thực chạy, file thay đổi và điểm chưa hoàn tất.
Cập nhật docs/tracking.md và fe/DESIGN.md. Dừng để review sau UI-P;
không làm tiếp backend, không tự commit/push. Codex sẽ review và commit.
```

## Feature cần làm

1. **Lối vào xem trước:** nút “Xem trước giao diện” ở màn nhập, mở URL `?preview=design`. Thoát prototype trở lại màn nhập; không ghi đè/xóa analysis thật trong DB. Nếu URL có cả `analysis` và `preview`, ưu tiên chế độ preview rõ ràng, không trộn dữ liệu. URL preview không được kích hoạt các GET/POST dữ liệu thật.
2. **Workspace kết quả:** header, tên/phạm vi dữ liệu, hai brand, bộ lọc aspect/sentiment và vùng so sánh. Có một câu hỏi mẫu “So sánh DHC và Vaseline về giá và hiệu quả dưỡng”. Giữ bố cục kết quả cạnh review trên desktop, mobile có thứ tự đọc và điều hướng rõ.
3. **Chart và metric:** grouped bar theo Price/Benefits, tên metric, tử số/mẫu số và coverage. Có bảng số liệu hoặc thông tin tương đương cho bàn phím/screen reader. Chọn một cột bằng click/keyboard cập nhật đúng danh sách review liên quan và tiêu đề phạm vi.
4. **Review explorer:** text/context, brand/aspect/sentiment và evidence được làm nổi bật; xem đầy đủ review, điều hướng lại kết quả. Dữ liệu luôn escape; không render HTML từ review.
5. **Tóm tắt/citation:** đoạn tóm tắt viết sẵn từ chính review minh họa; bấm citation mở đúng review. Ghi rõ số review được đọc trong mẫu. Không dùng câu như “khách hàng thường chê” nếu không đủ căn cứ trong mẫu.
6. **Câu hỏi tiếp nối minh họa:** các nút gợi ý chuyển giữa kịch bản so sánh, xem tiêu cực và xem evidence. Có thể trình bày thành vài message mẫu; không cần input chat tự do hoặc logic hiểu ngôn ngữ. Nếu có input thì phải nói rõ chỉ hỗ trợ câu hỏi mẫu, không giả nhận mọi câu hỏi.
7. **Bộ chọn trạng thái thiết kế:** cho người duyệt chọn “Đang xử lý”, “Hoàn tất”, “Một phần”, “Lỗi”, “Không có kết quả”. Hiển thị đúng phạm vi/tác vụ đang mô phỏng; không dùng timer giả làm như AI đang thật sự chạy. Mẫu số bằng 0 hiện “Không đủ dữ liệu”.

## Ranh giới với chức năng thật

- Banner “Bản xem trước · Dữ liệu minh họa · Không chạy AI” luôn thấy trong prototype, kể cả mobile. Nút chuyển trạng thái nằm trong khu vực “Xem trạng thái thiết kế”, không giả làm control vận hành sản phẩm.
- Dùng một tập review synthetic cố định của project cùng mentions minh họa được khai báo riêng cho prototype. Chỉ lấy những dòng cần cho trải nghiệm; không đưa ViLipBTA test gold vào frontend.
- Count, rate, chart và drill-down phải được suy từ cùng dữ liệu minh họa. Không điền các số rời nhau cho đẹp; ghi rõ không phải benchmark hoặc kết luận thị trường.
- Label, summary và trạng thái mẫu là dữ liệu trình diễn, không được lưu vào backend/localStorage dưới dạng analysis thật. Không gọi model, không tạo API giả, không tự triển khai backend chart/chat.
- Giữ API client và UI-A hiện có. Không để mode preview tự bật khi API lỗi; lỗi API thật phải hiện đúng lỗi.
- Chưa thêm lịch sử mọi analysis, export, auth, dark mode, upload hai file, logo/rebrand hoặc tính năng ngoài scope.

## Thiết kế và phạm vi code

- Giữ baseline sáng, trung tính, accent xanh và màu hai brand ổn định; tái dùng tokens/control trong `fe/DESIGN.md`.
- Đọc Taste Skill project-local; áp dụng typography, hierarchy, alignment, interaction/accessibility phù hợp dashboard. Không ép hero, ảnh stock, shader hay section cao một màn hình vào ứng dụng.
- Nếu dùng Impeccable, xác minh bản cài thực tế và làm theo hướng dẫn trong UI_UX_PLAN.md; không tuyên bố đã chạy CLI nếu chưa chạy. Thiếu công cụ không chặn phần triển khai/QA độc lập.
- Code trong `fe/src/`, thay đổi CSS hiện có và thêm component/data prototype khi cần. Không thêm router, UI kit, state framework hoặc chart library chỉ để làm bản duyệt. Dùng HTML/CSS/SVG hoặc dependency đã có cho chart đơn giản.
- Dữ liệu prototype được giữ riêng với API types thật; không dựng toàn bộ contract backend tương lai để phục vụ prototype. Không đổi `fe/src/api.ts` thành nguồn dữ liệu giả.

## Nghiệm thu UI-P

1. Mở `http://localhost:5173/?preview=design` và xem đầy đủ kết quả/chart/review mà không cần API, DB hoặc key. Màn nhập có lối vào/ra dễ thấy.
2. Chọn chart/citation/câu hỏi mẫu thay đổi đúng review và scope; trạng thái không dữ liệu/partial/error có thông điệp và đường tiếp tục phù hợp. Có ít nhất một test nhỏ cho logic filter/metric/drill-down quan trọng.
3. Kiểm tra browser thật ở desktop 1440px và mobile 390px, thêm 320px chống overflow. Tab, Enter/Space, tên control, focus, contrast và reduced motion hoạt động.
4. Chạy `npm run build`, `npm run lint`, `npm run test`. Không coi build đạt là đã kiểm tra tương tác trong browser. Ghi rõ nếu công cụ browser không khả dụng.
5. Ảnh bàn giao trong `fe/shots/prototype/`: kết quả desktop/mobile, review được chọn, trạng thái partial/error/empty. Chỉ dùng synthetic, không chụp key hoặc dữ liệu nhạy cảm.
6. Tài liệu `fe/UI_PROTOTYPE_DELIVERY.md`: URL, trạng thái có thể xem, hành vi mẫu, ảnh, checks và phần chỉ mô phỏng. Người dùng duyệt thiết kế trước khi task sau tích hợp API thật.

## Tracking gói này

- 16-11-2026: đã có phạm vi và lệnh bàn giao, chờ người dùng gửi PI; chưa implement/chạy prototype.
- UI-A có code trong workspace và báo cáo riêng; UI-P không thay thế việc review/commit các thay đổi đó.
- P2/P3 cần cho tích hợp AI/chart thật; P5 cần cho chat thật. Hoàn tất UI-P không làm thay đổi trạng thái nghiệm thu các P này.
