# DESIGN — Review Intelligence workspace

Cập nhật: 16/11/2026. Phạm vi: gói UI-A (U01–U03) theo [UI_UX_PLAN.md](../UI_UX_PLAN.md),
sau đó bổ sung chế độ xem trước UI-P (mục 8).
Đây là tài liệu thiết kế của app, không phải landing page và không có logo/rebrand.

## 1. Sản phẩm và người dùng

- Một người phân tích nhập CSV review son dưỡng tiếng Việt của đúng hai thương hiệu,
  kiểm tra dữ liệu, lưu review và đọc lại từng bản ghi làm bằng chứng.
- Việc cần làm nhanh: biết dữ liệu nào đang mở, cái gì đã lưu, cái gì còn lỗi, mở đúng
  review gốc.
- Ngôn ngữ giao diện: tiếng Việt. Tên hiển thị tạm: `Review Intelligence`.
- Tham chiếu bố cục đã duyệt: Thematic (kết quả cạnh review), Revuze (so sánh brand),
  Chattermill (scope → bằng chứng). Chỉ học cấu trúc, không sao chép nội dung/hình ảnh.

## 2. Tokens

| Token | Giá trị | Dùng cho | Tương phản |
| --- | --- | --- | --- |
| `--bg` | `#F6F7F9` | nền ứng dụng | — |
| `--panel` | `#FFFFFF` | card, header | — |
| `--panel-soft` | `#F0F2F5` | khối phụ, bảng, input disabled | — |
| `--ink` | `#17202A` | chữ chính | 16.45:1 trên panel |
| `--muted` | `#52606D` | metadata, mô tả | 6.46:1 trên panel, 6.02:1 trên nền |
| `--line` / `--line-strong` | `#DCE1E7` / `#C3CAD3` | viền mảnh / viền control | không dùng cho chữ |
| `--action` | `#1D4ED8` | nút chính, focus, link | 6.7:1 trên trắng, trắng trên nền 6.7:1 |
| `--brand-a-*` | `#1E3A8A` trên `#E8EEFC` | thương hiệu A | 8.91:1 |
| `--brand-b-*` | `#7A3E0D` trên `#FBEEE1` | thương hiệu B | 7.3:1 |
| `--ok-*` | `#0F6B4F` trên `#E7F4EF` | đã nhập, kiểm tra sạch | 5.74:1 |
| `--warn-*` | `#7A4410` trên `#FDF2E4` | chưa phân tích, cảnh báo | 7.14:1 |
| `--danger-*` | `#94211A` trên `#FBEDEC` | lỗi chặn lưu | 7.4:1 |

- Một accent duy nhất (`--action`). Màu thương hiệu chỉ là nền chip nhạt; tên brand luôn
  hiện bằng chữ nên không phụ thuộc màu.
- Không dùng chữ xám dưới 4.5:1 cho nội dung đọc. Placeholder `#667380` (~5:1), chỉ là gợi ý.
- Nền sáng cố định; không dark mode trong MVP (ngoài phạm vi UI-A).

### Chữ

- Font hệ thống hỗ trợ tiếng Việt: `system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial`.
  Không tải webfont.
- `h1` 28px (24px dưới 640), `h1` trong card 24px, `h2` card 20px, `h3` 18px.
- Nội dung review 16px/1.65; metadata và nhãn 13–14px; không có chữ dưới 13px.
- Số liệu KPI (stat) 24px/600. Không viết hoa toàn bộ, không letter-spacing giả nhãn.

### Khoảng cách, bo góc, chuyển động

- Thang 4/8/12/16/24/32/48px; mọi margin, padding, gap dùng biến `--s-*`.
- Bo góc: control 6px, panel/card 8px. Một kiểu nút cho toàn app.
- Hover: nút nhích lên 1px, `:active` xuống 1px, đổi nền 0.15s. Không animation tự chạy,
  không parallax. `prefers-reduced-motion` tắt mọi transition.

## 3. Bố cục

Điểm ngắt: **≥1200px** hai cột, **768–1199px** một cột, **<768px** một cột thu gọn.

```text
≥1200px
┌──────────────────────────────────────────────────────────────┐
│ Tên sản phẩm · mô tả            phạm vi          trạng thái  │ 64px, sticky
├──────────┬───────────────────────────────────────────────────┤
│ Dữ liệu  │ Kết quả phân tích      │ Review đã lưu (scroll)    │
│ 224px    │ 1.45fr                 │ 1fr                      │
└──────────┴───────────────────────────────────────────────────┘
```

- Header: `position: sticky`, cao 64px, một hàng ở desktop; dưới 900px tự xuống hai hàng
  (tên → phạm vi → chip trạng thái).
- Vùng nhập dữ liệu dùng một cột tối đa 920px, không bọc bằng các panel kết quả rỗng.
- Sau khi lưu: cột dữ liệu 224px (dạng `<details open>` để thu gọn được), vùng kết quả và
  explorer review nằm cạnh nhau — kết quả bên trái, bằng chứng bên phải.
- Explorer giới hạn `max-height: calc(100vh - 320px)` và tự cuộn ở ≥1200px để kết quả và
  phân trang luôn thấy; dưới 1200px list chảy theo trang.
- Mobile: dữ liệu (scope) → kết quả → review, đúng thứ tự một cột. Không có bảng nào làm
  tràn trang: bảng preview cuộn trong khung có tên và focus được.
- Không sidebar lịch sử, không menu tính năng chưa làm, không router (chỉ một workspace,
  reload bằng `?analysis=<uuid>`).

## 4. Thành phần và hành vi

| Thành phần | Quy tắc |
| --- | --- |
| Nút | 44px cao (36px cho nút phụ trong danh sách/alert, vẫn 44px khi chạm dưới 640px). Chỉ một nút filled trong mỗi bước: “Chọn file CSV” → “Kiểm tra dữ liệu” → “Lưu dữ liệu”. |
| Link | Chỉ dùng cho hành động văn bản (“Xem đầy đủ”), có gạch chân, không giả làm nút. |
| Input/select | 44px, label ngoài control, hint nối bằng `aria-describedby`, disabled khi chưa chọn file. |
| Chip | Trạng thái và thương hiệu; luôn có chữ, không dựa vào màu. |
| Alert | `role="alert"` cho lỗi, `role="status"` cho kết quả tích cực; giữ file + mapping để sửa. |
| Stats | 4 ô: tổng bản ghi, hợp lệ, lỗi, cảnh báo ID trùng. Số 0 hiện “0”, không ẩn. |
| Bảng preview | Tối đa 10 dòng backend trả; caption ẩn; cuộn ngang trong `role="region"` focus được. |
| Explorer | Mỗi review: chip thương hiệu nguồn, “Bản ghi #n”, ID nguồn, text, ngữ cảnh. Text dài clamp 5 dòng + “Xem đầy đủ” (`aria-expanded`). |
| Phân trang | 20 review/trang, nút Trước/Sau, hiện “Bản ghi 1–20 trên 22 · Trang 1/2”. |
| Details “Dữ liệu” | `<details open>`: thu gọn được bằng bàn phím, giữ nguyên ở desktop. |

### Trạng thái bắt buộc

| Trạng thái | Giao diện |
| --- | --- |
| Chưa có dữ liệu (S01) | Chỉ bước chọn file + ví dụ schema + giới hạn lấy từ API. Không panel rỗng. |
| Đã chọn file (S02) | Tên file, dung lượng, nút đổi file, 4 ô mapping, nút kiểm tra. |
| Đang preview | Nút đổi thành “Đang kiểm tra…”, chặn submit lặp, `role="status"`. |
| Preview hợp lệ | Stats, thông báo sạch lỗi, cảnh báo ID trùng (nếu có), chọn hai brand, bảng preview. Nút lưu mở. |
| Preview có lỗi | Alert đỏ theo “Bản ghi #N · cột …”, tối đa 20 lỗi, nút lưu khóa. |
| Sai scope brand | Câu hướng dẫn theo số brand trong file (0/1/>2), nút lưu khóa. |
| File quá giới hạn | Chặn ở client bằng giới hạn API, hướng dẫn chia file. |
| Đang lưu | Nút “Đang lưu…”, không gửi lặp. |
| Lưu lỗi mạng | Báo chưa xác nhận được kết quả, không tự POST lại; người dùng bấm lại. |
| Không có kết quả phân tích (S03) | Empty state nói rõ AI/chart chưa nối; không số liệu giả, không tiến độ giả. |
| Reload | `GET /api/analyses/{id}` + reviews; `?analysis=` sai → “Không tìm thấy phiên phân tích” + quay lại nhập file. |
| API không chạy | “Không mở được phiên phân tích” + nút nhập file mới. |

### Copy

- Dùng “review” hoặc “bản ghi”; không gọi là “khách hàng”.
- Phân biệt rõ “Đã nhập dữ liệu” và “Chưa phân tích”.
- Không hứa phần chưa có: mọi câu về AI/chart đều ghi “chưa được nối”.
- Số liệu chỉ đến từ backend. Không có số mẫu, %, cost ước tính tự đặt.

## 5. Truy cập

- Skip link đầu trang (`Bỏ qua tới nội dung`), hiện khi Tab.
- `:focus-visible` 2px màu action, offset 2px; focus được chuyển tới `h1` sau khi lưu hoặc
  khi quay lại nhập file.
- Mọi control có `<label>` thật; không dùng placeholder thay label.
- Trạng thái tải/lỗi công bố bằng `role="status"`/`role="alert"`.
- Vùng cuộn (bảng, danh sách review) có `tabIndex=0` + tên truy cập.
- Escape không cần vì không dùng drawer/modal; nội dung đầy đủ hiển thị inline.
- Bàn phím: Tab qua từng control, Enter/Space kích hoạt nút, select native.

## 6. Waiver cho rule landing-page của Taste Skill

| Rule | Không áp dụng vì |
| --- | --- |
| Hero + một section mỗi màn hình, 60–80 từ/screen | Đây là workspace nhiều bước, không phải trang giới thiệu. |
| Ảnh thật/nhiều ảnh, ảnh sản phẩm | Không có ảnh sản phẩm hợp lệ; dữ liệu là text. Không dùng ảnh stock thay thế. |
| Shader/scene/loop, nền tối | Ngoài phạm vi sản phẩm (không phải tech marketing); giảm nhiễu khi đọc review. |
| Nav cố định + mega menu | Workspace một màn hình; header sticky là pattern app, không có menu chưa làm. |
| Logo/brand mark | Plan chốt chưa thiết kế logo/rebrand. |
| Đo bằng gate script | Gate của skill dành cho landing page; đã kiểm bằng checklist plan mục 8 (viewport, focus, overflow, contrast). |

Các rule vẫn áp dụng: một hệ token, lề đều, câu chữ rõ, trạng thái tương tác, tương phản,
focus, không chữ dưới 13px, tôn trọng reduced motion.

## 7. Chưa làm trong UI-A

- Chạy phân tích AI, tiến độ, cost, metric, chart, drill-down (chờ P2–P3).
- Chat, lịch sử hội thoại, citation (P5).
- Upload hai file, demo ViLipBTA, filter aspect/sentiment.
- Dark mode, export, chỉnh nhãn, đăng nhập, nhiều workspace.
- Favicon/logo riêng, font thương hiệu.

## 8. UI-P — prototype workspace (`?preview=design`)

Chế độ xem trước để duyệt bố cục và tương tác khi chưa có API AI/chart/chat.

### Tách khỏi dữ liệu thật

- `App.tsx` đọc `preview=design`; khi bật, **không** gọi `getAnalysis`, không upload, không
  ghi DB/localStorage. URL có cả `analysis` và `preview` thì preview thắng và banner ghi
  “Đã bỏ qua tham số analysis trong URL”.
- Nút “Xem trước giao diện” ở màn nhập; “Thoát xem trước” xoá cả `preview` và `analysis`,
  quay về màn nhập. Thoát không xoá analysis đã lưu trên server.
- Dữ liệu prototype nằm riêng trong `src/prototype/`; `src/api.ts` không bị dùng làm nguồn giả.
- Chế độ thật giữ nguyên hành vi UI-A, kể cả lỗi API thật (không tự bật preview khi API lỗi).

### Dữ liệu và cách suy số

- 22 review lấy nguyên văn fixture `p0_synthetic_dhc_vs_vaseline_22.csv`; mention khai báo
  riêng (14 review đầu khớp `p0_synthetic_expected_extraction.json`). `SYN-023` là review
  synthetic viết thêm cho prototype để duyệt text dài/“Xem đầy đủ”; không nhắc Giá hay
  Hiệu quả dưỡng nên không đổi biểu đồ.
- `prototype/logic.ts` là nguồn duy nhất cho count/rate/coverage/filter/citation sample:
  chart, bảng, scope, citation và tóm tắt đều gọi cùng hàm. Không có số điền tay.
- Đếm theo **review**, không theo mention; review có 2 mention cùng brand/aspect chỉ tính 1.
  Tử số = review có mention Tiêu cực; mẫu số = review nhắc brand/aspect (bất kể cảm xúc).
- Mẫu số 0 → `null` → UI hiện “Không đủ dữ liệu”, không hiện 0%.
- Evidence phải là chuỗi con nguyên văn của text (có test) và được render bằng text node
  (`<mark>`), không `dangerouslySetInnerHTML`.

### Bố cục và tương tác

- Desktop ≥1200px: cột dữ liệu/trạng thái 248px, kết quả (chat + chart + bảng) cạnh
  explorer review; explorer tự cuộn để giữ kết quả trong tầm nhìn.
- Tablet/mobile: một cột, nội dung kết quả trước, dữ liệu + bộ chọn trạng thái sau; toolbar
  có link “Xem trạng thái thiết kế” để nhảy tới.
- Grouped bar 2 khía cạnh × 2 brand; mỗi cột là `<button>` với `aria-pressed`, aria-label
  đọc đủ brand/aspect/tỷ lệ/tử số/mẫu số. Bảng số liệu trong `<details>` có nút “Xem review”
  cho bàn phím.
- Chọn cột → đặt phạm vi brand+aspect (mẫu số đầy đủ), focus heading explorer; bộ lọc cảm
  xúc chỉ thu hẹp danh sách, không đổi mẫu số. Nút “Về tất cả kết quả” xoá phạm vi.
- Citation → áp scope của kịch bản rồi focus đúng review (scroll + `tabIndex=-1`), evidence
  được tô sáng.
- Banner “Bản xem trước · Dữ liệu minh họa · Không chạy AI · Không ghi vào DB” nằm trong
  header sticky, luôn thấy ở desktop/mobile.
- Bộ chọn trạng thái là fieldset “Xem trạng thái thiết kế” (radio native), nói rõ chỉ đổi
  giao diện mẫu; không timer, không giả lập tiến trình theo thời gian.
- Không thêm chart library, router hay state framework: chart là HTML/CSS/SVG đơn giản.

### Trạng thái mẫu

| Trạng thái | Nội dung |
| --- | --- |
| Đang xử lý | Stepper tĩnh 8/23, không chart, không review, ghi rõ không có timer |
| Hoàn tất | Chat mẫu + citation, chart, bảng số liệu, explorer đầy đủ |
| Một phần | 19/23 đã xử lý; 4 review chưa xử lý bị loại khỏi chart/explorer; Vaseline Giá và Hiệu quả dưỡng hiện “Không đủ dữ liệu” |
| Lỗi | Panel lỗi + “Xem kết quả một phần” / “Về màn nhập” |
| Không có kết quả | Cả 4 cột mẫu số 0, explorer trống, nút về trạng thái hoàn tất |

### Truy cập

Skip link tới `#proto-main`; heading explorer nhận focus sau khi chọn cột; review nhận focus
khi mở citation; radio/select/button native; vùng cuộn review và bảng có tên truy cập;
`prefers-reduced-motion` tắt transition; không chữ dưới 13px.
