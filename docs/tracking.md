# Tracking — Review Intelligence

Cập nhật: 15-11-2026. Nguồn: code trong workspace, báo cáo PI Agent do người dùng chuyển và các kiểm tra Codex chạy lại. Lịch sử Git lưu chi tiết từng lần sửa.

## Tổng quan

| Task | Trạng thái | Kết quả / phần còn thiếu |
| --- | --- | --- |
| P0 | Đã review, được P0R thay thế | CSV cũ thêm brand từ nhãn silver; không đủ độc lập để làm input. |
| P0R | Fixture đã review và checker đạt | Tách input/nhãn, thêm synthetic; smoke call LLM chưa chạy. |
| P1 | Đã review, cần sửa validation NUL | Parser nhận NUL nhưng psycopg từ chối lưu; integration PostgreSQL hoãn theo người dùng. |
| P2 | Chưa giao | Model client, worker và extraction; cần smoke call provider. |
| P3 | Chưa triển khai | Facts, chart payload và drill-down. |
| P4 | Chưa triển khai | UI luồng dọc; frontend hiện vẫn là Vite mẫu. |
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
- Chưa có worker, mentions, chat, UI sản phẩm hoặc auth/cloud.

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

## Việc tiếp theo

1. Giao riêng task sửa validation P1 theo [bàn giao sau review](p1-review-and-p2-handoff.md). Không triển khai worker trong task sửa này.
2. Smoke call nhỏ xác minh provider/model trước khi nghiệm thu P2. Không đưa key vào docs/Git.
3. Giao riêng P2 sau khi sửa lỗi; không chạy tiếp P3/P4 tự động. Lệnh P2 đã chuẩn bị trong file bàn giao.
4. **Theo yêu cầu người dùng ngày 15-11-2026, tạm bỏ qua PostgreSQL**; người dùng sẽ cài sau. Không dựng pgserver/Docker hoặc thay SQLite để giả lập việc nghiệm thu integration. Các kiểm tra cần DB giữ trạng thái chưa tái lập cho đến khi có DB.

## Review P1 tiếp theo (15-11-2026)

- Đã đọc parser, API, schema/model và migration. Không phát hiện thêm lỗi chặn luồng qua phần đã đọc ngoài lỗi dưới đây; chưa coi đây là nghiệm thu runtime đầy đủ.
- **Lỗi cần sửa:** `parse_csv_bytes` nhận `b'brand,text\nDHC,good\x00review\n'` và trả `valid_records=1`, `errors=[]`. Gọi `psycopg.adapt.Transformer().as_literal()` với text này trả `DataError: PostgreSQL text fields cannot contain NUL (0x00) bytes`. Đây là kiểm tra adapter cục bộ, không kết nối hoặc khởi động DB. API import hiện sẽ đi đến nhánh lỗi lưu 500 thay vì từ chối dữ liệu 422.
- Cần reject NUL trong nội dung CSV trước khi lưu; không âm thầm xóa ký tự. Thêm test parser và API preview không cần DB. Đường import không ghi DB khi đầu vào sai vẫn cần integration sau khi người dùng cài PostgreSQL.
- Không có `LLM_API_KEY` trong environment hoặc `be/.env` ở thời điểm kiểm tra; smoke call chưa chạy, chưa đo chất lượng/usage/latency/cost của model.

`UI_UX_PLAN.md` và `package-lock.json` ở root đang là file ngoài phạm vi bàn giao P1; chưa được review/commit trong lượt tracking này. Các file dữ liệu gốc, môi trường ảo và Taste Skill cài cục bộ tiếp tục được ignore.
