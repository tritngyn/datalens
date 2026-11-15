# Backend P1 — CSV → review lưu bền

Trạng thái: P1 backend đã triển khai. Chưa có worker, `batches`, `mentions`, chat hoặc frontend. P1 không gọi model và không cần `LLM_API_KEY`.

## 1. Stack và layout

- FastAPI + Pydantic v2
- PostgreSQL + SQLAlchemy 2 + Alembic
- Python `csv` cho parse; không dùng pandas
- Test bằng `unittest`; API test dùng PostgreSQL thật, không dùng SQLite

```text
be/
├── app/
│   ├── api.py          # preview, create analysis, đọc analysis/reviews
│   ├── config.py       # env + giới hạn
│   ├── csv_import.py   # parse/validate CSV, không ghi DB, không gọi model
│   ├── db.py           # engine/session
│   ├── main.py         # FastAPI app
│   ├── models.py       # analyses, reviews
│   └── schemas.py      # request/response Pydantic
├── alembic/
│   └── versions/0001_create_analyses_reviews.py
├── tests/
├── requirements.txt
└── requirements-dev.txt
```

## 2. Setup local

Yêu cầu: Python 3.12+, PostgreSQL 16+ (hoặc PostgreSQL tương thích). Không cần Docker/Azure/LLM.

```bash
cd be
python -m venv .venv
source .venv/Scripts/activate   # Git Bash
# PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
cp .env.example .env
```

Tạo database PostgreSQL:

```sql
CREATE DATABASE datalens_mvp;
```

Sửa `DATABASE_URL` trong `be/.env`, ví dụ:

```text
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/datalens_mvp
```

Chạy migration:

```bash
cd be
alembic upgrade head
```

Chạy API, chỉ bind localhost:

```bash
cd be
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Hoặc:

```bash
cd be
python -m app.main
```

Mở `http://127.0.0.1:8000/docs` để xem OpenAPI và thử endpoint.

### Nếu chưa có PostgreSQL

Không dùng SQLite để thay thế. Có thể chạy parser test trước; API/integration test sẽ skip nếu thiếu `TEST_DATABASE_URL`. Khi có PostgreSQL, chạy migration và test lại theo mục 5. Trong báo cáo P1 phải ghi rõ phần PostgreSQL chưa chạy nếu môi trường không có server.

## 3. API P1

### `POST /api/imports/preview`

Multipart:

- `file`: một file CSV.
- `mapping`: JSON string. Bắt buộc `text`, `brand`; tùy chọn `context`, `source_id`. Chấp nhận alias `review_id` cho `source_id`.
- `brands`: tùy chọn JSON array đúng hai brand. Nếu có, record có brand ngoài hai brand này bị báo lỗi. Nếu không có, preview chỉ trả `source_brands` để người dùng xác nhận.

Ví dụ:

```bash
curl -sS -X POST http://127.0.0.1:8000/api/imports/preview \
  -F "file=@data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv;type=text/csv" \
  -F 'mapping={"text":"text","brand":"brand","context":"context","review_id":"review_id"}'
```

Preview không tạo analysis, không ghi DB và không gọi model.

Response chính:

```json
{
  "filename": "p0_synthetic_dhc_vs_vaseline_22.csv",
  "input_hash": "<sha256 của file gốc>",
  "header": ["review_id", "brand", "text", "context"],
  "mapping": {
    "text": "text",
    "brand": "brand",
    "context": "context",
    "source_id": "review_id"
  },
  "total_records": 22,
  "valid_records": 22,
  "error_records": 0,
  "preview": [],
  "errors": [],
  "warnings": [],
  "source_brands": ["DHC", "Vaseline"],
  "limits": {
    "max_bytes": 2097152,
    "max_records": 500,
    "max_text_chars": 2000,
    "max_context_chars": 1000
  }
}
```

`preview` trả tối đa 10 record đầu. Mỗi record có `record_number`, `physical_line`, `source_id`, `source_brand`, `text`, `context`, `errors`.

`record_number` là số thứ tự bản ghi dữ liệu CSV (bắt đầu từ 1, không tính header). `physical_line` chỉ là thông tin chẩn đoán khi ô có xuống dòng; lỗi và thống kê luôn dùng `record_number`.

### `POST /api/analyses`

Multipart:

- `file`: lại file CSV gốc.
- `mapping`: cùng mapping JSON.
- `brands`: JSON array đúng hai brand khác nhau, mỗi brand tối đa 100 ký tự, ví dụ `["DHC", "Vaseline"]`. Giá trị brand trong CSV phải khớp chính xác (phân biệt hoa/thường) với một trong hai brand này.

```bash
curl -sS -X POST http://127.0.0.1:8000/api/analyses \
  -F "file=@data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv;type=text/csv" \
  -F 'mapping={"text":"text","brand":"brand","context":"context","review_id":"review_id"}' \
  -F 'brands=["DHC","Vaseline"]'
```

Server parse lại file và mapping; không dùng kết quả preview do client gửi. P1 **không cho nhập riêng phần hợp lệ**: nếu còn bất kỳ record lỗi nào, toàn bộ import bị từ chối `422` và không tạo analysis. Muốn nhập phần hợp lệ phải là thay đổi API riêng có xác nhận rõ ràng.

Source ID trùng chỉ là cảnh báo. Tất cả dòng vẫn được lưu với internal `review_id` (UUID) riêng và `record_number` riêng; không gộp, không xóa.

Response `201`:

```json
{
  "analysis_id": "00000000-0000-0000-0000-000000000000",
  "filename": "...",
  "input_hash": "...",
  "mapping": {},
  "brands": ["DHC", "Vaseline"],
  "import_status": "imported",
  "analysis_status": "not_started",
  "total_records": 22,
  "imported_records": 22,
  "duplicate_source_id_count": 0,
  "warnings": [],
  "created_at": "2026-11-15T00:00:00Z"
}
```

`import_status` và `analysis_status` tách nhau: P1 chỉ tạo `imported` + `not_started`. P2 sẽ cập nhật trạng thái phân tích AI; P1 không giả là đã phân tích.

### `GET /api/analyses/{analysis_id}`

Đọc lại metadata analysis sau reload/restart.

### `GET /api/analyses/{analysis_id}/reviews?page=1&page_size=50`

Phân trang review, `page_size` từ 1 đến 100, order theo `record_number`. Mọi query đều có `WHERE analysis_id = ...`; review của analysis khác không lọt vào response.

Response:

```json
{
  "analysis_id": "...",
  "page": 1,
  "page_size": 50,
  "total": 22,
  "items": [
    {
      "review_id": "<internal UUID>",
      "source_id": "SYN-001",
      "record_number": 1,
      "source_brand": "DHC",
      "text": "...",
      "context": "...",
      "created_at": "..."
    }
  ]
}
```

## 4. Giới hạn và quy tắc dữ liệu

- Tối đa **2 MiB/file**. Server đọc tối đa giới hạn + 1 byte để phát hiện vượt giới hạn trước khi parse toàn bộ.
- Tối đa **500 bản ghi dữ liệu**/file. Vượt giới hạn trả `413`, không lấy 500 dòng đầu.
- `text` rỗng hoặc quá **2.000 ký tự**: lỗi theo record.
- `context` quá **1.000 ký tự**: lỗi theo record.
- UTF-8 hoặc UTF-8 BOM; dấu phẩy; hỗ trợ quote, dấu phẩy và newline trong ô.
- Header trùng: từ chối toàn file.
- Record sai số trường: báo lỗi theo `record_number`.
- Mapping phải dùng cột có trong header và mỗi vai trò phải là một cột khác nhau.
- `input_hash` là SHA-256 của đúng bytes file upload.
- `source_id` tùy chọn; để trống thành `NULL`. Source ID trùng chỉ cảnh báo.
- Internal `review_id` là UUID do server tạo, tách khỏi `source_id`.
- Không lưu/report nhãn AI, evidence, aspect hoặc sentiment trong P1.

Lỗi request dùng dạng:

```json
{
  "detail": {
    "code": "duplicate_header",
    "message": "Header CSV có cột trùng.",
    "duplicate_headers": ["text"]
  }
}
```

## 5. Test

Parser test (không cần database):

```bash
cd be
python -m unittest tests.test_csv_import -v
```

PostgreSQL integration test:

```bash
cd be
export DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:5432/datalens_test'
export TEST_DATABASE_URL="$DATABASE_URL"
alembic upgrade head
python -m unittest discover -s tests -v
```

Không có `TEST_DATABASE_URL` thì class API test skip; parser test vẫn chạy. Không dùng SQLite để thay PostgreSQL.

Kiểm tra fixture P0R không bị hỏng:

```bash
cd ..
python be/scripts/check_p0r_fixtures.py
```

## 6. Phạm vi chưa làm

- Chưa có `batches`, `mentions`, worker, chat/messages.
- Chưa gọi LLM; smoke call endpoint/model vẫn là việc của P0R/P2.
- Chưa sửa frontend, chưa thêm auth/cloud/CORS.
- P1 chỉ bind localhost; không mở public.
