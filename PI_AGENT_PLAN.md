# PI Agent — review P0 và kế hoạch triển khai

Trạng thái: **P0 cần sửa trước P1**. Đây là kế hoạch và tiêu chí bàn giao; chưa phải lệnh bắt đầu viết code. Phạm vi sản phẩm theo [features_and_scope.md](features_and_scope.md), quyết định kỹ thuật theo [tech.md](tech.md).

## Review P0 (15-11-2026)

- Có đủ 42 dòng CSV, 42 ID riêng, 42 dòng nhãn silver đối chiếu và 6 ví dụ extraction. Sáu ví dụ đều có `evidence` là chuỗi con của `text`. Dataset card xác nhận train/validation là silver, test là gold, giấy phép CC BY-NC-SA 4.0.
- **Chặn P1:** `p0_dhc_vs_vaseline_42.csv` thêm cột `brand` dù bản gốc ViLipBTA không có source brand. 40/42 giá trị cột này khớp một brand trong nhãn silver; hai dòng còn lại lạc đề được gán DHC. Vì thế không thể coi cột này là metadata nguồn độc lập hoặc dùng fixture để đo khả năng nhận diện brand của model.
- Tài liệu P0 chọn OpenCode Go/`deepseek-v4.1-flash` và có `be/.env.example`, nhưng chưa có lần gọi API, kiểm tra structured output, usage, chi phí hoặc độ trễ. Đây là lựa chọn để thử, chưa phải provider đã nghiệm thu.
- Tập `test.jsonl` đang nằm cùng workspace. Giữ nó ngoài đường chạy demo, prompt, fixture và mọi quyết định chỉnh prompt; chỉ mở khi benchmark đã đóng prompt ở P5.

## P0R — sửa fixture và chốt đầu vào

1. Giữ bản trích ViLipBTA **không có cột `brand` tự suy từ silver**; nếu cần, đổi tên file để không bị hiểu là CSV đầu vào một-brand-mỗi-dòng. Giữ nhãn silver ở file đối chiếu riêng. Cập nhật README P0 để nói rõ brand trong quadruple là nhãn đích.
2. Tạo một CSV nhỏ độc lập cho P1–P4 với `review_id,brand,text,context`, trong đó `brand` là metadata nguồn được khai báo khi tạo dữ liệu, không suy từ output cần dự đoán. Có hai brand và các câu đủ để kiểm tra Price/Benefits, câu nhắc brand khác, câu mơ hồ và câu lạc đề. Nếu tự viết review mẫu, gắn nhãn rõ là **synthetic**; không dùng nó làm benchmark chất lượng model.
3. Ghi schema CSV, giới hạn byte/record, cách xác định brand và ít nhất vài expected extraction example cho CSV mới. Kiểm tra ID duy nhất, quote/newline, encoding, evidence nằm trong text và không có gold label trong CSV.
4. Xác minh endpoint/model/key bằng một smoke call ngắn từ backend hoặc script cục bộ; ghi model ID thực trả về, có/không có structured JSON và usage. Không commit key hoặc log chứa key.

**Xong khi:** PI Agent có fixture CSV đầu vào độc lập, ViLipBTA vẫn giữ vai trò demo/đối chiếu đúng license, và một báo cáo smoke call có giới hạn chi phí. Nếu không có API key, dừng ở ranh giới đó và làm P1 với fake model response trong test.

## P1 — CSV → review lưu bền

**Phụ thuộc:** P0R. **Feature:** một CSV có `brand,text`, preview lỗi theo dòng, xác nhận hai brand, tạo analysis và đọc lại review.

- Tạo backend FastAPI và PostgreSQL với các bảng tối thiểu `analyses`, `reviews`; migration Alembic. Chỉ tạo bảng `batches`/`mentions` khi P2 cần. Không thêm auth/cloud trong task này.
- `POST /api/imports/preview`: server giới hạn 2 MiB trước khi đọc toàn bộ; parse bằng Python `csv` với UTF-8/BOM, header và dấu phẩy, quote/newline trong ô. Trả header, preview, tổng dòng, lỗi theo **số bản ghi CSV** và mapping `brand,text,context,review_id`; không gọi model.
- `POST /api/analyses`: kiểm tra lại file/mapping trên server, chỉ chấp nhận đúng hai brand được xác nhận và tối đa 500 data records. Lưu text/context gốc, filename, record number và source ID; trả `analysis_id`. Không im lặng bỏ dòng lỗi hoặc cắt text.
- `GET /api/analyses/{id}` và `GET /api/analyses/{id}/reviews`: đọc lại scope/review cho việc kiểm tra sau reload. Giữ query ràng buộc analysis ID.

**Kiểm tra:** CSV synthetic của P0R nhập đúng số dòng; BOM, dấu phẩy/ngoặc kép/xuống dòng trong ô, header trùng, text rỗng, quá giới hạn và ID trùng có kết quả đúng. Restart API vẫn đọc lại được dữ liệu. Không cần UI ngoài một request smoke test.

## P2 — review → mention có evidence

**Phụ thuộc:** P1 và endpoint model hoạt động. **Feature:** phân tích nền, trạng thái job, nhãn có kiểm tra trước khi lưu.

- Thêm `batches` và `mentions`; worker riêng poll DB. Request tạo analysis trả nhanh; `GET /api/analyses/{id}` có queued/running/completed/failed và số review đã xử lý.
- Một model client đọc key từ backend env. Prompt nhận text/context và hai brand; trả relevance, target brand, aspect, sentiment, evidence theo contract trong `tech.md`. Dùng response mẫu trong test; không đưa silver/gold vào prompt.
- Validate JSON, review ID, allowlist nhãn, evidence nguyên văn trong text, xử lý nhiều mention/review. Lỗi provider/JSON/validation ghi vào job, không lưu mention giả; kết quả đã commit không bị mất khi restart. Batch/retry giới hạn để không gọi model vô hạn.

**Kiểm tra:** các ví dụ P0R, review hai brand, other/unresolved/off-topic, mixed polarity, output bịa ID/evidence và timeout. Đối chiếu thủ công một sample với silver ViLipBTA, ghi rõ silver không phải gold.

## P3 — mention → chart và review gốc

**Phụ thuộc:** P2. **Feature:** câu hỏi so sánh cố định theo Price/Benefits, grouped bar và drill-down.

- Backend tính facts bằng SQL có tham số; count distinct review và tử số/mẫu số của `aspect_negative_rate` theo định nghĩa ở `tech.md`. Trả metric definition, hai brand, aspect, coverage, số lỗi/chưa xử lý và tập ID cho drill-down.
- Endpoint review phân trang nhận filter/query đã lưu và chỉ trả review thuộc analysis đó. Chart click và citation dùng ID từ backend; không tự dựng số hoặc URL từ model.
- Kết quả partial phải ghi rõ population tại thời điểm query. Nếu worker tiếp tục chạy, mở lại chart cũ vẫn cho cùng số và cùng tập review.

**Kiểm tra:** mention trùng, một review vừa Positive vừa Negative, review nhắc brand khác, off-topic và partial job. Tử số/mẫu số của chart khớp tập review mở ra.

## P4 — giao diện một luồng dọc

**Phụ thuộc:** P1–P3. **Feature:** upload/preview, xác nhận, tiến độ, câu hỏi so sánh mẫu, chart và review explorer trên một màn hình.

- Thay màn Vite mẫu trong `fe/`; gọi API qua một cấu hình base URL local, hiện lỗi theo record, trạng thái job và coverage. Chart hiển thị đúng metric/mẫu số; click mở review gốc với text/context/evidence.
- Giữ thao tác bàn phím, trạng thái loading/error/empty và text tiếng Việt rõ ràng. Áp dụng Taste Skill ở mức phù hợp với giao diện phân tích, không ép cấu trúc landing page lên dashboard.
- Build/lint frontend và chạy một luồng thật từ CSV synthetic đến mở review. P4 chưa có chat tự do; một câu hỏi mẫu cố định là đủ cho luồng đầu.

**Xong khi:** người dùng đi được một CSV → phân tích → so sánh → mở review trên localhost, refresh vẫn thấy analysis. Chụp/kiểm tra giao diện ở desktop và mobile trong browser.

## Sau P4

Chỉ chia P5 khi luồng dọc đạt nghiệm thu: demo ViLipBTA không rò nhãn, hai CSV/gán brand, bốn intent và follow-up, chat history, retry/idempotency hoàn chỉnh, cost/benchmark và bảo vệ bản host. Không dùng kết quả silver hoặc CSV synthetic để công bố F1.
