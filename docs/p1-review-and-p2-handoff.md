# Bàn giao sau review P1

Ngày 15-11-2026. Người dùng đã duyệt feature, yêu cầu giao từng P và tạm hoãn PostgreSQL để tự cài sau. Không khởi động pgserver, Docker hoặc cài PostgreSQL trong các task dưới đây. Chưa có key để smoke call LLM.

## Task hiện tại: sửa validation P1

Gửi PI Agent đoạn sau, chỉ làm task sửa này:

```text
Trong G:\projects\DataLens, sửa lỗi P1: parser chấp nhận NUL nhưng
psycopg không lưu được NUL vào PostgreSQL text, làm import trả lỗi 500.

Tái hiện, không cần database:
- raw = b'brand,text\nDHC,good\x00review\n'
- parse_csv_bytes với mapping text/brand trả valid_records=1.
- psycopg.adapt.Transformer().as_literal('good\x00review') ném DataError.

Đọc mọi caller parse_csv_bytes rồi sửa một lần ở parser dùng chung:
- Từ chối CSV có NUL bằng CsvInputError với mã lỗi rõ ràng.
- Không xóa/cắt ký tự âm thầm; API trả 422, không đi tới lưu DB.
- Thêm test parser và API preview; các test mới chạy không cần DB.
- Giữ nguyên các hành vi CSV hợp lệ hiện có.

Chạy parser tests, API preview test mới và checker P0R.
Không cài hoặc chạy PostgreSQL; không dùng SQLite thay thế.
Ghi rõ integration import chưa chạy lại vì người dùng hoãn database.

Cập nhật docs/tracking.md và PI_AGENT_PLAN.md. Dừng để review;
chưa viết P2, chưa commit/push. Codex sẽ review và commit.
```

## Task P2: chuẩn bị sẵn, giao sau khi sửa P1

```text
Triển khai riêng P2 trong G:\projects\DataLens.
Feature đã duyệt; đọc tech.md, PI_AGENT_PLAN.md và docs/tracking.md.
Không triển khai P3/P4/P5. PostgreSQL được người dùng hoãn cài đặt.

Feature:
1. Model client backend đọc LLM_BASE_URL, LLM_MODEL, LLM_API_KEY từ env.
   Một client cho extraction; structured JSON và Pydantic validation.
   Nếu có key, smoke call một review synthetic, giới hạn output/timeout.
   Không log key; ghi model ID trả về, usage và latency. Cost unknown
   nếu chưa có bảng giá xác minh; không tự bịa giá hoặc đổi provider.
   Nếu chưa có key, hoàn thành phần độc lập và ghi live call chưa kiểm chứng.

2. Schema/migration thêm batches và mentions cùng trạng thái review cần thiết.
   Extraction trả relevance, target brand, aspect, sentiment, evidence.
   Dùng taxonomy trong tech.md. Source brand không được ghi đè brand
   được nhắc rõ trong text/context. Không đưa silver/gold vào prompt.
   Validate đúng review IDs trong batch, nhãn trong allowlist,
   evidence nguyên văn trong text và không có mention trùng.

3. Worker process riêng trong cùng codebase, poll DB và claim batch
   bằng lease. Không giữ transaction khi gọi model; commit kiểm tra
   lease owner/version. Retry/backoff có giới hạn, lưu lỗi và tiến độ,
   không ghi đè kết quả đã hoàn thành sau restart.
   Không dùng FastAPI BackgroundTasks làm nơi giữ job duy nhất.

4. Thêm POST /api/analyses/{id}/start để khởi chạy phân tích sau khi
   xác nhận và kiểm tra ngân sách, tránh model tự chạy ngay khi upload.
   Gửi start lại không tạo batch/job trùng. GET detail có progress.
   Giữ import_status và analysis_status phân biệt như P1.
   Lưu usage/model/prompt version; dừng khi chạm giới hạn token.

5. Test validator/model client bằng fake response chỉ trong test:
   multi-brand, mixed sentiment, off-topic, needs_review, ID/nhãn/evidence
   bịa, JSON lỗi, timeout và review chứa instruction độc hại.
   Test lease/retry/start idempotency trên PostgreSQL khi có DB.
   Nếu chưa có DB, vẫn viết migration và test cần thiết nhưng ghi rõ
   chưa chạy integration; không thay PostgreSQL bằng SQLite hoặc lưu
   job in-memory trong luồng sản phẩm để tuyên bố P2 đã hoàn tất.

Bàn giao code, lệnh chạy worker/API/test, kết quả thực chạy và phần
chưa kiểm chứng. Cập nhật tracking cùng PI_AGENT_PLAN.md.
Không sửa frontend, không cloud, không commit/push. Dừng sau P2 để review.
```

P2 có thể phát triển phần độc lập khi thiếu key/DB, nhưng chưa được nghiệm thu end-to-end cho tới khi chạy thật worker, PostgreSQL và model. Chỉ giao một task tại một thời điểm.
