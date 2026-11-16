# UI-A delivery — nhập CSV, lưu và đọc review

Ngày bàn giao: 15/11/2026. Phạm vi: **UI-A (U01–U03)** theo
[UI_UX_PLAN.md](../UI_UX_PLAN.md). Không mở rộng backend, không thêm AI/chart/chat giả.

## 1. Đã làm

| ID | Nội dung | Trạng thái |
| --- | --- | --- |
| U01 | Khung workspace: header + phạm vi + trạng thái, tokens, layout 2 cột/cột đơn, tiếng Việt toàn bộ | Xong |
| U02 | Nhập một CSV: chọn file, mapping 4 cột, preview, lỗi/cảnh báo, chọn hai brand, lưu analysis | Xong, nối API P1 thật |
| U03 | Đọc review: phân trang 20/trang, text/context/ID nguồn, mở đầy đủ, reload bằng `?analysis=` | Xong, nối API P1 thật |
| U04 | Trạng thái phân tích theo backend | Chỉ hiển thị `not_started`; chưa có trigger/tiến độ vì P2 chưa có |
| U05 | Chart so sánh + drill-down | Chưa làm (chờ P2–P3) |
| U06 | Chat, citation, stacked bar | Chưa làm (P5) |

Không có số liệu AI, chart, cost hay tiến độ giả trong giao diện.

## 2. API thật đã dùng

| Endpoint | Dùng ở đâu |
| --- | --- |
| `POST /api/imports/preview` | kiểm tra file + xác nhận lại với hai brand; không ghi DB |
| `POST /api/analyses` | lưu file gốc + mapping + hai brand, nhận `analysis_id` |
| `GET /api/analyses/{id}` | mở lại phiên từ URL |
| `GET /api/analyses/{id}/reviews` | explorer, `page_size=20` |

Frontend gọi `/api` tương đối; Vite dev proxy tới `http://127.0.0.1:8000`.

## 3. Môi trường đã chạy

- Node 24.21.0, npm 11.19.0, Vite 8.3.8, React 19.
- Backend P1 chạy thật: `uvicorn app.main:app` cổng 8000.
- PostgreSQL 16.2 chạy tạm từ venv ngoài repo (`pip install pgserver`) cho QA của gói UI-A,
  DB `datalens_mvp`, đã chạy `alembic upgrade head`. Instance tạm này **đã dừng**;
  cấu hình hiện tại dùng Cloud PostgreSQL qua `DATABASE_URL`/`TEST_DATABASE_URL`
  (xem `be/README.md`). `DATABASE_URL` truyền qua biến môi trường; không thêm file
  DB, `.env` hay dependency nào vào repo.
- Chrome headless 1440/1024/768/390/320 qua `playwright-core` (cài ngoài repo).

## 4. Bằng chứng chạy thật

Luồng chính, dùng `be/data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv`:

1. Preview: 22 bản ghi, 22 hợp lệ, 0 lỗi, `source_brands = [DHC, Vaseline]`; UI tự chọn A/B
   và kiểm tra lại với scope đã xác nhận.
2. Lưu: 22 review, URL đổi thành `?analysis=<uuid>`; explorer trang 1 = bản ghi 1–20,
   trang 2 = 21–22, nút “Trang sau” khóa ở trang cuối.
3. Reload URL: mở lại đúng metadata + review, không upload lại, không mất dữ liệu.
4. 404: `?analysis=00000000-…` hiện “Không tìm thấy phiên phân tích”, nút quay lại xoá query.

Các trường hợp lỗi (CSV tạo tạm ngoài repo, không sửa fixture gốc):

| Case | Kết quả |
| --- | --- |
| Mapping cột không tồn tại | Alert “Cột trong mapping không tồn tại ở header CSV.”; giữ file + mapping, không có nút lưu |
| File > 2 MiB | Chặn ở client theo `limits.max_bytes`; nút kiểm tra khóa |
| Text rỗng | “Còn 1 bản ghi lỗi…”, chi tiết “Bản ghi #1 · cột text · Text rỗng.”, lưu khóa |
| File 3 brand | Hướng dẫn “File có 3 thương hiệu…”, chọn 2 brand thì báo `Brand nguồn không nằm trong hai brand đã xác nhận.` và vẫn khóa lưu |
| ID nguồn trùng | Cảnh báo theo ID + số bản ghi, ghi rõ “không có nghĩa là review bị trùng”; lưu vẫn mở |
| Ô có newline + dấu nháy | Preview và review hiển thị đúng nguyên văn, không render HTML |
| Đổi mapping sau preview | Preview cũ mất hiệu lực, khung kiểm tra + nút lưu biến mất tới khi kiểm tra lại |
| Response preview về muộn | Bị bỏ bằng token; không ghi đè scope mới |
| Lưu bị ngắt mạng | “Không kết nối được API…”, không tự gửi lại, URL không đổi; bấm lại thì lưu được |
| `GET` analysis lỗi mạng | “Không mở được phiên phân tích” + nút nhập file mới |

## 5. Checks

```text
npm run lint   -> pass (eslint + tsc, không warning)
npm run build  -> pass, dist ~246 kB JS / 14 kB CSS
npm run test   -> 6/6 pass (node --test, logic preview key/save gate/pagination)
```

Test tự động chỉ phủ logic thuần (`importLogic.ts`); không có test DOM/e2e trong repo.

## 6. Browser QA

- 1440, 1024, 768, 390, 320px: `scrollWidth <= innerWidth` ở cả 5 mốc, không tràn ngang.
- Bàn phím: Tab đầu tiên vào skip link, Tab tiếp vào “Chọn file CSV”; mọi input có label;
  vùng cuộn bảng/review focus được; Enter/Space kích hoạt nút.
- Console: chỉ có 404 mong đợi của case “analysis không tồn tại”; không có lỗi React/CSS khác.
- Contrast đo bằng công thức WCAG: chữ chính 16.45:1, muted 6.02–6.46:1, action 6.7:1,
  chip brand 7.3–8.91:1, alert 5.74–7.4:1 (bảng đầy đủ trong `DESIGN.md`).

Ảnh trong `fe/shots/ui/`:

| File | Nội dung |
| --- | --- |
| `01-empty-1440.png` | S01, chỉ bước chọn file, không panel rỗng |
| `02-preview-1440.png`, `02b-preview-table-1440.png` | S02 hợp lệ: stats, brand A/B, bảng preview |
| `03-workspace-1440.png`, `03b-workspace-reviews-1440.png` | S03: dữ liệu, kết quả trống, explorer + phân trang |
| `04-not-found-1440.png` | URL analysis sai |
| `05-workspace-{1024,768,390,320}.png` | responsive |
| `06-import-390.png`, `07-preview-390.png`, `07b-preview-table-390.png` | mobile nhập + preview, bảng cuộn trong khung |
| `08-invalid-1440.png`, `08b-invalid-check-1440.png` | CSV lỗi + 3 brand |
| `09-oversized-1440.png` | file vượt giới hạn |
| `10-multiline-review-1440.png` | review có newline/nháy sau khi lưu |
| `11-brand-outside-scope-1440.png` | brand ngoài cặp đã xác nhận |
| `12-save-failure-1440.png` | lưu mất kết nối |
| `13-api-error-1440.png` | API lỗi khi mở phiên |

## 7. Skills và cách dùng

- **Taste Skill** `design-taste-frontend` 2.5.1 (vendor tại `.agents/skills/`): đã đọc
  `SKILL.md` và `references/system.md`; áp dụng phần hệ token, kiểu chữ, tương phản, focus,
  copy và trạng thái tương tác. Các rule chỉ dành cho landing page (hero, ảnh thật, section
  một màn hình, shader, gate script) được waiver và ghi lý do ở `DESIGN.md` §6. Không chạy
  gate script nên không có `GATE: PASS`.
- **Impeccable**: không có bản cài trong project (`.agents/skills/`) hoặc skill người dùng;
  không cài thêm, không chạy `context/critique/audit/polish`. Thay vào đó rà theo checklist
  plan mục 8 (trạng thái, viewport, focus, overflow, copy) và ghi rõ ở đây. Không tuyên bố
  đã chạy Impeccable.
- **Ponytail**: không thêm UI kit, router, state layer hay chart library. Chỉ React + CSS +
  một module API và hai component; toàn bộ logic tái dùng được nằm trong `importLogic.ts`.

## 8. File thay đổi

```text
fe/index.html                       # lang=vi, title, meta, favicon placeholder
fe/vite.config.ts                   # dev proxy /api -> 127.0.0.1:8000
fe/src/App.tsx                      # shell + route ?analysis=
fe/src/App.css                      # layout + component
fe/src/index.css                    # tokens + reset + focus + reduced motion
fe/src/api.ts                       # client + kiểu + ApiError
fe/src/importLogic.ts               # logic thuần (key, save gate, phân trang)
fe/src/components/ImportPanel.tsx
fe/src/components/ReviewExplorer.tsx
fe/tests/importLogic.test.mjs
fe/package.json                     # thêm script "test"
fe/README.md                        # hướng dẫn chạy UI + API
fe/DESIGN.md                        # tokens, bố cục, trạng thái, waiver
fe/shots/ui/*.png                   # ảnh nghiệm thu
```

Đã xoá asset starter Vite (`src/assets/*`, `public/icons.svg`, `public/favicon.svg`).
Không đổi backend, migration, fixture hay tài liệu ngoài `fe/`.

## 9. Chưa kiểm chứng / rủi ro còn mở

1. **Root README** vẫn ghi “Frontend hiện vẫn là màn Vite mẫu” — đã lệch thực tế nhưng nằm
   ngoài phạm vi UI-A; cần sửa ở task tài liệu riêng.
2. **Không có idempotency ở `POST /api/analyses`**: nếu request timeout sau khi DB đã ghi,
   người dùng bấm lưu lại có thể tạo analysis trùng. UI không tự gửi lại và có cảnh báo.
3. **Không có e2e/CI**: script Playwright dùng để QA nằm ngoài repo; regression hiện dựa vào
   checklist thủ công.
4. **StrictMode** tạo 2 request `GET /api/analyses/{id}` khi dev (chỉ dev, không ảnh hưởng
   production).
5. Chưa thử Firefox/Safari, screen reader thật (NVDA/VoiceOver), zoom 200% và host production
   không có dev proxy.
6. U04–U06 vẫn chờ contract backend P2–P5; chưa có nút chạy phân tích nên không thể nghiệm
   thu phần AI.
