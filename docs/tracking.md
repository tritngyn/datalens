# Tracking — Review Intelligence

Cập nhật: 16-11-2026. Nguồn: code trong workspace, báo cáo PI Agent do người dùng chuyển và các kiểm tra Codex chạy lại. Lịch sử Git lưu chi tiết từng lần sửa.

## Tổng quan

| Task | Trạng thái | Kết quả / phần còn thiếu |
| --- | --- | --- |
| P0 | Đã review, được P0R thay thế | CSV cũ thêm brand từ nhãn silver; không đủ độc lập để làm input. |
| P0R | Fixture đã review và checker đạt | Tách input/nhãn, thêm synthetic; smoke call LLM chưa chạy. |
| P1 | Đã sửa NUL + cấu hình Cloud PostgreSQL; chờ connection string | Parser chặn NUL (`422`/`nul_byte`); config nhận URL cloud; migration/integration chưa chạy vì `be/.env` chưa có URL. |
| P2 | Chưa giao | Model client, worker và extraction; cần smoke call provider. |
| P3 | Chưa triển khai | Facts, chart payload và drill-down. |
| P4 | UI-A xong (U01–U03) | Nhập CSV/preview/lưu/đọc review trong `fe/`; U04–U06 (job, chart, chat) chờ P2–P5. |
| UI-P | Đã review, cần sửa 2 finding | Citation hỏi tiếp và empty counters; xem `docs/ui-p-review.md`. Prototype không tính là UI-B hoàn tất. |
| UI-B | Người dùng đã yêu cầu chuyển bước, chờ P2–P3 | UI-A đã code; thiếu API start/progress/query/chart snapshot. Bàn giao tại `docs/ui-b-handoff.md`. |
| P5 | Để sau luồng dọc | Chat follow-up, demo đầy đủ, benchmark và vận hành mở rộng. |

## P0R — đã sửa gì và vì sao?

Dataset ViLipBTA không có source brand. File cũ lấy brand từ đáp án silver rồi đưa vào input, có thể làm model được gợi đáp án. Bản sửa giữ input 42 review chỉ gồm `review_id,text,context`; silver reference nằm riêng. CSV synthetic 22 review có source brand được khai báo độc lập, dùng kiểm tra chức năng.

- Input thực: `be/data/fixtures/p0_vilipbta_42_input.csv`.
- Input synthetic: `be/data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv`.
- Checker: `python be/scripts/check_p0r_fixtures.py` từ repo root.
- Codex chạy lại ngày 15-11-2026: checker đạt. Đây là kiểm tra schema/IDs/evidence tồn tại, không chứng minh nhãn hoặc chất lượng NLP đúng.
- Smoke call chưa có: endpoint, model ID, structured output, usage, latency và cost chưa xác minh. Không chặn P1 vì P1 không gọi model.

## P1 — kết quả bàn giao

Code trong `be/app/`, migrations trong `be/alembic/`, test trong `be/tests/`. Hướng dẫn thực thi chi tiết ở [be/README.md](../be/README.md).

| Endpoint | Vai trò |
| --- | --- |
| POST /api/imports/preview | Parse/validate một CSV với mapping, preview tối đa 10 record, chưa lưu analysis. |
| POST /api/analyses | Validate lại, lưu analysis và review trong transaction. |
| GET /api/analyses/{id} | Đọc metadata/trạng thái import. |
| GET /api/analyses/{id}/reviews | Phân trang review theo analysis. |

Quyết định P1:

- Còn bất kỳ record lỗi nào thì từ chối toàn file, chưa nhập riêng phần hợp lệ. Đây là giới hạn P1, phần chọn phạm vi hợp lệ trong scope tổng còn để sau.
- Source ID trùng chỉ cảnh báo; UUID nội bộ riêng và không tự xóa dòng.
- Giữ text/context gốc và số bản ghi CSV để truy vết; newline trong ô không tạo review mới.
- `imported` và `analysis_status=not_started` khác nhau: dữ liệu đã lưu chưa có nghĩa đã phân tích AI.
- Chưa có worker, mentions hoặc chat; UI nhập/đọc CSV có ở `fe/` (UI-A). DB dùng Cloud PostgreSQL qua `DATABASE_URL`/`TEST_DATABASE_URL`, không cài PostgreSQL local.

### Sửa validation NUL và cấu hình Cloud PostgreSQL (16-11-2026)

- `parse_csv_bytes` chặn NUL sau khi decode (`nul_byte`, details `nul_count`); preview và import đều trả `422` trước khi mở transaction, không xóa ký tự. File sai encoding vẫn báo `invalid_encoding` vì kiểm tra NUL đặt sau decode.
- `app/config.py`: `normalize_database_url` đổi `postgres://`/`postgresql://` thành `postgresql+psycopg://` và giữ query (`sslmode=require`); `Settings` dùng validator này.
- `app/db.py`: `create_engine(..., pool_pre_ping=True, pool_recycle=300)` để idle timeout/SSL reset của cloud không làm request kế tiếp lỗi.
- `be/tests/test_api.py`: tách `ApiPreviewTests` (không cần DB) khỏi `ApiPostgresTests`; thêm guard so sánh host/port/database và raise `RuntimeError` nếu `TEST_DATABASE_URL` trùng `DATABASE_URL`; thêm test NUL cho preview và cho import.
- `be/.env.example`, `be/README.md`: hướng dẫn Azure Flexible Server/managed Postgres, hai database `datalens_mvp`/`datalens_test`, `sslmode=require`; bỏ hướng dẫn PostgreSQL local.

Chưa kiểm chứng: migration và API trên cloud thật, vì chưa có connection string trong `be/.env`.

### Bằng chứng kiểm tra

**PI Agent báo cáo** (chưa được Codex tái lập trong lượt tracking): PostgreSQL thật 16.2 tạm qua pgserver; 38 test đạt; Alembic upgrade/check/downgrade/upgrade đạt; uvicorn restart vẫn đọc lại 22 review. pgserver là công cụ test cục bộ, không phải runtime dependency. Chưa chạy trên PostgreSQL 18 của máy.

**Codex chạy lại ngày 15-11-2026:**

```powershell
# Từ repo root
python be/scripts/check_p0r_fixtures.py

# Từ be/
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

- Checker P0R: PASS.
- Test backend: 21 parser/validation PASS, 17 API/PostgreSQL SKIP vì không có `TEST_DATABASE_URL` trong phiên này. Không gọi kết quả đó là 38 test PASS.
- Test backend phải chạy từ `be/`; chạy discovery từ root không có module `app` trên import path.
- Có xem API/config và cấu trúc code; chưa thực hiện code review toàn diện hoặc kiểm thử tải/upload HTTP lớn.

**Codex chạy lại ngày 16-11-2026** (sau khi sửa NUL và cấu hình cloud), không kết nối DB nào:

- Checker P0R: PASS.
- Test backend không cần DB: 48 test, **37 PASS + 11 SKIP** (`ApiPostgresTests` cần `TEST_DATABASE_URL`). Chi tiết: 23 parser/validation, 4 config, 8 preview API, 2 guard chống trùng DB.
- Frontend không sửa logic UI-A: `npm run lint`, `npm run build`, `npm run test` (6/6) PASS.
- Không chạy `alembic upgrade head` và integration test: `be/.env` chưa có, không có connection string cloud. Không dựng PostgreSQL local/pgserver hay SQLite.
- PostgreSQL tạm dùng cho QA UI-A trước đó đã được dừng.

## UI-P — prototype workspace (16-11-2026)

Gói UI-P theo [handoff](ui-prototype-handoff.md): prototype để duyệt bố cục, không phải nghiệm thu
UI-B/UI-C hay P4 end-to-end. URL: `http://localhost:5173/?preview=design` (chỉ cần Vite, không cần
API/DB/key). Báo cáo đầy đủ ở [fe/UI_PROTOTYPE_DELIVERY.md](../fe/UI_PROTOTYPE_DELIVERY.md).

- Chế độ preview tách khỏi UI-A: không gọi `getAnalysis`, không upload, không ghi DB/localStorage;
  URL có cả `analysis` và `preview` thì preview thắng và ghi rõ đã bỏ qua `analysis`. Thoát preview
  về màn nhập, không xóa analysis trên server.
- Dữ liệu: 22 review nguyên văn từ fixture synthetic + `SYN-023` synthetic chỉ để duyệt text dài;
  mention khai báo riêng cho prototype (14 review đầu khớp expected extraction). Không dùng ViLipBTA
  test gold. Count/rate/coverage/chart/drill-down/citation đều suy từ `prototype/logic.ts`.
- Có grouped bar Giá/Hiệu quả dưỡng với tử số/mẫu số, bảng số liệu, filter aspect/sentiment,
  drill-down bằng click/keyboard, tóm tắt mẫu + citation mở đúng review, evidence tô sáng an toàn.
- 5 trạng thái thiết kế: Đang xử lý, Hoàn tất, Một phần, Lỗi, Không có kết quả. Trạng thái một
  phần loại 4 review chưa xử lý nên mẫu số Vaseline/Giá và Vaseline/Hiệu quả dưỡng bằng 0 và
  hiện “Không đủ dữ liệu”. Không có timer hay tiến trình giả.
- Chạy 16-11-2026: `npm run lint`, `npm run build`, `npm run test` (16/16) PASS. Browser QA bằng
  Chrome headless (playwright-core) ở 1440/1024/768/390/320: không tràn ngang, không lỗi console,
  preview không phát sinh request `/api`, bàn phím (skip link, Enter trên cột) và citation focus đúng.
  15 ảnh trong `fe/shots/prototype/`.
- Chưa có: AI/chart/chat thật (P2–P5), screen reader thật, Firefox/Safari, automated a11y audit.

## Việc tiếp theo

1. Người dùng điền `DATABASE_URL`/`TEST_DATABASE_URL` (Cloud PostgreSQL, hai database riêng) vào `be/.env`, chạy `alembic upgrade head` cho cả hai DB rồi chạy lại integration test. Không dựng PostgreSQL local/pgserver/SQLite.
2. Smoke call nhỏ xác minh provider/model trước khi nghiệm thu P2; cần `LLM_API_KEY`. Không đưa key vào docs/Git.
3. Giao riêng P2 sau khi có kết quả integration trên cloud; không chạy tiếp P3/P4 tự động. Lệnh P2 đã chuẩn bị trong file bàn giao.
4. UI-A (U01–U03) đã xong phần triển khai trong `fe/`, có báo cáo chạy API thật từ PI. Người dùng đã yêu cầu chuyển sang UI-B: triển khai P2 rồi P3 theo từng task trước khi nối U04–U05; xem [bàn giao UI-B](ui-b-handoff.md). UI-P còn hai finding cần sửa. UI-C/U06 vẫn chờ P5. Chưa tái lập end-to-end DB hiện tại.
5. Người dùng duyệt thiết kế UI-P trước khi làm task tích hợp chart/chat thật; UI-P không làm thay đổi trạng thái nghiệm thu P2–P5.

## Review P1 tiếp theo (15-11-2026)

- Đã đọc parser, API, schema/model và migration. Không phát hiện thêm lỗi chặn luồng qua phần đã đọc ngoài lỗi dưới đây; chưa coi đây là nghiệm thu runtime đầy đủ.
- **Đã sửa (16-11-2026):** parser từ chối CSV có NUL bằng `CsvInputError("nul_byte")`; API preview và import trả `422` trước khi chạm DB, không xóa ký tự. Có test parser (NUL trong text, header, brand) và test API preview/import không cần DB. Integration import trên cloud vẫn chờ connection string; theo người dùng, không dựng PostgreSQL local hay SQLite để thay thế.
- Không có `LLM_API_KEY` trong environment hoặc `be/.env` ở thời điểm kiểm tra; smoke call chưa chạy, chưa đo chất lượng/usage/latency/cost của model.

`package-lock.json` rỗng ở root đã được xóa ngày 16-11-2026 (`fe/package-lock.json` vẫn giữ). `UI_UX_PLAN.md` vẫn là file kế hoạch UI, không phải code P1. Các file dữ liệu gốc, môi trường ảo và Taste Skill cài cục bộ tiếp tục được ignore.
