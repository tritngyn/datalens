# UI-P delivery — prototype workspace

Ngày bàn giao: 16-11-2026. Phạm vi: **UI-P** theo
[docs/ui-prototype-handoff.md](../docs/ui-prototype-handoff.md).
Đây là prototype để duyệt thiết kế, **không** phải nghiệm thu UI-B/UI-C hay P4 end-to-end.

## 1. Mở prototype

```bash
cd fe
npm run dev
```

- Prototype: **http://localhost:5173/?preview=design**
- Không cần API, PostgreSQL hay `LLM_API_KEY`. Không gọi model, không tạo analysis.
- Màn nhập thật (`http://localhost:5173/`) có nút **“Xem trước giao diện”**.
- Trong prototype, nút **“Thoát xem trước”** xoá `preview` và `analysis` khỏi URL, quay về màn nhập.
  Analysis đã lưu trên server không bị xoá hay sửa.
- URL có cả `analysis` và `preview`: preview thắng, banner ghi “Đã bỏ qua tham số analysis trong URL”.
  QA xác nhận không có request `/api` nào trong chế độ này.

Nếu chạy bản build tĩnh (`npm run preview`), URL vẫn là `/?preview=design`; bản build
không có proxy API nhưng preview không cần API.

## 2. Có thể duyệt gì

| Khu vực | Hành vi |
| --- | --- |
| Banner | “Bản xem trước · Dữ liệu minh họa · Không chạy AI · Không ghi vào DB”, nằm trong header sticky và luôn thấy ở desktop/mobile. |
| Dữ liệu | 23 review minh họa, hai brand DHC/Vaseline, coverage: đã xử lý/chưa xử lý, lạc đề, chưa rõ target, brand ngoài cặp. |
| Xem trạng thái thiết kế | 5 radio: Đang xử lý, Hoàn tất, Một phần, Lỗi, Không có kết quả. Chỉ đổi giao diện mẫu; không timer, không chạy nền. |
| Bộ lọc | Khía cạnh + mức độ cảm xúc; dòng “Phạm vi review” cập nhật số review khớp và (khi chọn cột) tử số/mẫu số. |
| Biểu đồ | Grouped bar Giá / Hiệu quả dưỡng × DHC / Vaseline, tỷ lệ review tiêu cực, tử số/mẫu số dưới mỗi cột. Cột là `<button>`, chọn được bằng click hoặc Enter/Space. |
| Bảng số liệu | `<details>` “Bảng số liệu (cùng dữ liệu với biểu đồ)” có nút “Xem review” từng dòng cho bàn phím/screen reader. |
| Review explorer | Lọc theo phạm vi đang chọn; hiện brand nguồn, bản ghi, ID nguồn, text/context, nhãn aspect/sentiment/target và evidence tô sáng; review dài có “Xem đầy đủ”. |
| Hội thoại mẫu | Câu hỏi mẫu + trả lời viết sẵn; số trong câu trả lời tính từ đúng sample; “Đã đọc m/n review”; citation mở đúng review và focus vào đó. |
| Gợi ý tiếp nối | 3 nút đổi kịch bản: so sánh, chỉ xem tiêu cực về hiệu quả dưỡng, đọc review làm căn cứ. Không có ô nhập tự do. |

### Kịch bản và số liệu

- **So sánh**: đọc 5 review (`SYN-001`, `002`, `009`, `014`, `020`). Câu trả lời nêu DHC bị chê giá
  2 review, được khen dưỡng ẩm 1 review; Vaseline được khen rẻ 1 review, bị chê dưỡng kém 1 review.
- **Tiêu cực về hiệu quả dưỡng**: scope `Benefits + Negative`, 1 review (`SYN-014`), hiện
  “Đã đọc 1/1 review”. Bộ lọc chỉ thu hẹp danh sách; mẫu số chart của Vaseline/Benefits vẫn là 4.
- **Đọc review làm căn cứ**: mở lại 5 review của câu so sánh; mỗi citation focus đúng review và
  tô sáng evidence.
- Chart đầy đủ (23 review): DHC · Giá 3/4 (75%), DHC · Hiệu quả dưỡng 0/7 (0%),
  Vaseline · Giá 0/2 (0%), Vaseline · Hiệu quả dưỡng 1/4 (25%).
- **Một phần**: 19/23 đã xử lý; 4 review chưa xử lý bị loại nên Vaseline · Giá và
  Vaseline · Hiệu quả dưỡng có mẫu số 0 → hiện “Không đủ dữ liệu”, không phải 0%.
- **Không có kết quả**: cả 4 cột mẫu số 0, explorer trống, có nút về “Hoàn tất”.
- **Lỗi**: mô phỏng dừng ở review 18/23, panel lỗi có “Xem kết quả một phần” và “Về màn nhập”.
- **Đang xử lý**: stepper tĩnh 8/23, không chart/review, ghi rõ không có timer.

### Cách số liệu được tạo

Toàn bộ count/rate/coverage/filter/citation sample nằm trong `fe/src/prototype/logic.ts` và có test.
Đếm theo review (không theo mention); review có nhiều mention cùng brand/aspect chỉ tính một lần;
review tiêu cực = có ít nhất một mention Tiêu cực cho brand/aspect đó. Cùng một hàm dựng chart,
bảng, scope, explorer và số trong câu trả lời nên không có số điền tay.

## 3. Ảnh

Trong `fe/shots/prototype/`:

| File | Nội dung |
| --- | --- |
| `desktop-completed.png` | Workspace hoàn tất: banner, coverage, hội thoại mẫu, citation, explorer |
| `desktop-chart-selected.png` | Cột DHC · Giá đang chọn, các cột khác mờ, có tử số/mẫu số |
| `desktop-bar-selected.png` | Explorer sau khi chọn cột: 4 review DHC · Giá, scope và mẫu số |
| `desktop-citation.png` | Citation mở đúng `SYN-020`, review được focus và tô sáng evidence |
| `desktop-table.png` | Bảng số liệu mở, drill-down từ bảng |
| `desktop-empty-filter.png` | Bộ lọc Color + Tiêu cực không có kết quả, có nút “Bỏ bộ lọc” |
| `desktop-running.png` | Trạng thái Đang xử lý (stepper tĩnh) |
| `desktop-partial.png` | Trạng thái Một phần, “Không đủ dữ liệu” cho 2 cột |
| `desktop-error.png` | Trạng thái Lỗi + đường tiếp tục |
| `desktop-empty.png` | Trạng thái Không có kết quả |
| `mobile-completed.png` | Mobile 390: banner, bộ lọc, hội thoại mẫu |
| `mobile-chart.png` | Mobile 390: chart xếp dọc |
| `mobile-selected.png` | Mobile 390: chọn cột rồi xem review |
| `mobile-partial.png` | Mobile 390: trạng thái Một phần |
| `mobile-320.png` | Mobile 320: kiểm tra không tràn ngang |

Ảnh chụp bằng Chrome headless (playwright-core) trên dev server; không có key hay dữ liệu nhạy cảm.

## 4. Kiểm tra đã chạy (16-11-2026)

```text
cd fe
npm run lint   -> PASS
npm run build  -> PASS (tsc + vite build)
npm run test   -> 16/16 PASS
```

`npm run test` gồm 6 test logic UI-A và 10 test UI-P: evidence nguyên văn trong text, citation nằm
trong scope, đếm theo review, mẫu số 0, filter cảm xúc không đổi mẫu số, overlap khi tô sáng,
coverage, số trong câu trả lời mẫu, filter rỗng.

Browser QA (Chrome headless, playwright-core 1.65.1) — các assertion đều PASS:

- `?preview=design` render đầy đủ, **0 request `/api`**, 0 lỗi console/pageerror.
- `?preview=design&analysis=<uuid>`: preview thắng, banner ghi đã bỏ qua analysis, 0 request `/api`.
- Màn nhập → “Xem trước giao diện” → preview; “Thoát xem trước” → màn nhập, URL không còn `preview`.
- Chế độ thật (`?analysis=<uuid>` khi API tắt): vẫn báo “Không mở được phiên phân tích”, không tự bật preview.
- Cột DHC · Giá: scope “DHC · Giá · 4 review khớp · 3/4 review tiêu cực”, explorer 4 review,
  focus chuyển tới heading explorer; bảng số liệu drill-down cho cùng 4 review.
- Đổi sentiment sang Tiêu cực: danh sách co lại nhưng aria-label của cột vẫn “3 trên 4 review tiêu cực”.
- Citation `SYN-020`: `document.activeElement` là `#demo-review-SYN-020`, có evidence tô sáng.
- Kịch bản tiêu cực: 1 review, “Đã đọc 1/1 review”; kịch bản evidence: “Đã đọc 5/20 review”.
- Bộ lọc Color + Tiêu cực: empty state có nút “Bỏ bộ lọc”; bấm thì khôi phục danh sách.
- 5 trạng thái đổi đúng; Lỗi → “Xem kết quả một phần” chuyển sang Một phần.
- Bàn phím: Tab đầu vào skip link, Enter tới `#proto-main`; Enter trên cột cập nhật scope.
- Không tràn ngang ở 1440, 1024, 768, 390, 320 px.

Chưa chạy: screen reader thật (NVDA/VoiceOver), Firefox/Safari, axe/automated a11y audit,
zoom 200%. Contrast kiểm ở mức token (xem `fe/DESIGN.md` mục 2), không dùng công cụ tự động.

## 5. Phần chỉ mô phỏng (không phải chức năng thật)

- Chart, metric, bảng, drill-down, coverage và citation là dữ liệu tĩnh suy từ 23 review minh họa;
  không có backend query/chart, không gọi AI.
- Tóm tắt là **câu trả lời mẫu viết sẵn** cho 3 kịch bản; không hiểu ngôn ngữ tự do, không có chat
  history, không gọi model.
- Trạng thái Đang xử lý/Một phần/Lỗi là kịch bản thiết kế cố định; không có job/worker/timer,
  không ghi kết quả dở.
- 22 review lấy nguyên văn fixture synthetic của project; `SYN-023` là review synthetic viết thêm
  cho prototype để duyệt text dài/“Xem đầy đủ”, không nhắc Giá hay Hiệu quả dưỡng nên không đổi chart.
  Không dùng ViLipBTA test gold. Không phải benchmark hay kết luận thị trường.
- Không có lưu localStorage/backend cho lựa chọn filter hay trạng thái mẫu.

Phần thật vẫn giữ nguyên: upload/preview/lưu/đọc review của UI-A, API client `fe/src/api.ts`,
lỗi API thật và route `?analysis=`.

## 6. File thay đổi

```text
fe/src/App.tsx                      # nhánh ?preview=design, vào/thoát preview, không fetch khi preview
fe/src/components/ImportPanel.tsx   # nút "Xem trước giao diện"
fe/src/App.css                      # style cho lối vào preview
fe/src/PrototypeWorkspace.tsx       # workspace prototype, filter, chart, explorer, chat, states
fe/src/prototype/data.ts            # 23 review minh họa + mention + kịch bản + trạng thái
fe/src/prototype/logic.ts           # count/rate/coverage/filter/highlight/answer (thuần, có test)
fe/src/prototype/Chart.tsx          # grouped bar dạng button + bảng số liệu
fe/src/prototype.css                # CSS prototype dùng chung tokens
fe/tests/prototypeLogic.test.mjs    # 10 test logic prototype
fe/package.json                     # npm test chạy cả 2 file test
fe/DESIGN.md                        # thêm mục 8 — thiết kế UI-P
fe/shots/prototype/*.png            # 15 ảnh nghiệm thu
fe/UI_PROTOTYPE_DELIVERY.md         # tài liệu này
docs/tracking.md                    # trạng thái UI-P + bằng chứng
docs/ui-prototype-handoff.md        # ghi nhận đã implement
```

Không sửa backend, `fe/src/api.ts`, migration, fixture. Chưa commit/push.

## 7. Điểm chưa hoàn tất / cần duyệt

1. Người dùng duyệt bố cục/tương tác UI-P trước khi làm task tích hợp chart/chat thật.
2. Chart thật cần P3 (facts/query snapshot); chat/citation thật cần P5. UI-P không chứng minh các
   contract đó.
3. `SYN-023` là dữ liệu prototype, không thuộc fixture P0R; nếu không muốn giữ, có thể bỏ và chấp
   nhận không demo được “Xem đầy đủ” với 22 review ngắn hiện có.
4. Chưa có dark mode, export, auth, upload hai file hoặc lịch sử analysis theo scope UI-P.
