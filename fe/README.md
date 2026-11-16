# Frontend — Review Intelligence (gói UI-A)

React 19 + TypeScript + Vite, không UI kit, không router, không state library.
Phạm vi UI-A: nhập một CSV, kiểm tra dữ liệu, lưu và đọc lại review qua API P1.
Chưa nối phân tích AI, chart hay chat.

## 1. Yêu cầu

- Node 22+ (đã chạy với Node 24).
- Backend P1 chạy ở `http://127.0.0.1:8000` với PostgreSQL. Xem
  [be/README.md](../be/README.md) để tạo DB, chạy `alembic upgrade head` và uvicorn.
- Frontend gọi API qua đường dẫn tương đối `/api`; Vite dev proxy chuyển tới backend
  (xem `vite.config.ts`), không cần mở CORS.

## 2. Chạy local

```bash
cd fe
npm install
npm run dev
```

Mở `http://localhost:5173/`. Nếu cần mở đúng IPv4:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

## 3. Scripts

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | dev server + proxy `/api` |
| `npm run build` | `tsc -b` rồi `vite build` |
| `npm run lint` | eslint (React Hooks + TS) |
| `npm run test` | test logic preview/pagination bằng `node --test` (Node 24 chạy TS trực tiếp) |
| `npm run preview` | serve bản build (không có proxy API) |

## 4. Cấu trúc

```text
src/
├── App.tsx                     # shell, route ?analysis=, trạng thái phiên
├── api.ts                      # fetch /api, kiểu dữ liệu, ApiError
├── importLogic.ts              # toàn bộ logic thuần: mapping, preview key, save gate
├── index.css                   # tokens, reset, focus, reduced motion
├── App.css                     # layout, component, responsive
└── components/
    ├── ImportPanel.tsx         # S01/S02: chọn file, mapping, preview, xác nhận brand, lưu
    └── ReviewExplorer.tsx      # S05: danh sách review + phân trang + trạng thái lỗi
tests/importLogic.test.mjs      # test logic thuần, không render DOM
```

`fe/DESIGN.md` ghi tokens, bố cục, trạng thái và waiver; `fe/UI_UX_DELIVERY.md` ghi
nghiệm thu gói UI-A.

## 5. Đã chạy được (API P1 thật)

- `POST /api/imports/preview` với `file`, `mapping`, `brands` tùy chọn; preview không ghi DB.
- `POST /api/analyses` gửi lại file gốc + mapping + đúng hai brand; không tự gửi lại khi lỗi.
- `GET /api/analyses/{id}` để mở lại phiên từ `?analysis=<uuid>`.
- `GET /api/analyses/{id}/reviews?page=&page_size=` (20 review/trang).

Hành vi:

- Mapping `text` bắt buộc, `brand` bắt buộc, `context` và `source_id` tùy chọn; gửi `source_id`
  để backend nhận đúng cột ID nguồn.
- Preview tự chọn A/B khi file có đúng hai brand, rồi kiểm tra lại với scope đã xác nhận.
- Đổi file/mapping/brand làm preview cũ mất hiệu lực và khóa “Lưu dữ liệu” cho tới khi kiểm
  tra lại; phản hồi về muộn bị bỏ bằng token.
- Lỗi hiển thị theo “Bản ghi #N · cột …”; tối đa 20 lỗi; ID nguồn trùng chỉ cảnh báo.
- File quá `max_bytes` bị chặn ngay ở client bằng giới hạn backend trả (mặc định 2 MiB).
- URL là nguồn sự thật để reload; sai ID hiện “Không tìm thấy phiên phân tích”.

## 6. Chưa nối (không được coi là đã chạy)

- Phân tích AI, job/progress, cost, mention, chart, drill-down (P2–P3).
- Chat, follow-up, citation, lịch sử hội thoại (P5).
- Upload hai file, demo ViLipBTA, filter aspect/sentiment.
- Danh sách nhiều analysis, chỉnh nhãn, export, dark mode.

## 7. Kiểm tra thủ công nhanh

```bash
# API + UI đang chạy
# 1. Mở http://localhost:5173/
# 2. Chọn be/data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv
# 3. Mapping: text / brand / context / review_id
# 4. Kiểm tra dữ liệu -> 22/22 hợp lệ, DHC + Vaseline
# 5. Lưu dữ liệu -> URL có ?analysis=..., danh sách 22 review, trang 2 có bản ghi 21–22
# 6. Reload trang -> mở lại đúng phiên
```

Không có favicon/logo riêng (theo phạm vi chưa thiết kế brand).
