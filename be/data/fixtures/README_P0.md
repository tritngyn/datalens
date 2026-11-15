# P0R — Fixture đầu vào, nhãn đối chiếu và trạng thái xác minh model

Trạng thái ngày **15-11-2026**: fixture P0R đã sửa và kiểm tra tự động; **smoke call LLM chưa chạy** vì môi trường hiện tại không có `LLM_API_KEY`. P1 không phụ thuộc smoke call vì P1 chỉ parse/lưu CSV; backend P1 đã được triển khai và test PostgreSQL. Smoke call vẫn là việc cần làm trước P2.

Tài liệu này thay thế mô tả P0 cũ. Phạm vi sản phẩm theo [features_and_scope.md](../../../features_and_scope.md), quyết định kỹ thuật theo [tech.md](../../../tech.md), trạng thái task theo [PI_AGENT_PLAN.md](../../../PI_AGENT_PLAN.md).

## 1. ViLipBTA: input không có brand suy từ nhãn silver

Đã tải `be/data/vilipbta/` (License **CC BY-NC-SA 4.0**, chỉ dùng cho nghiên cứu / phi thương mại):

- `train.jsonl`: 3.403 dòng, nhãn silver.
- `validation.jsonl`: 487 dòng, nhãn silver.
- `test.jsonl`: 446 dòng, nhãn gold. **Không đọc, không dùng trong fixture, prompt, demo hoặc P0R.**
- `brand_dict.json`: 248 surface form ánh xạ về 117 canonical brand.

Dòng gốc có `id`, `video_id`, `parent_id`, `is_reply`, `context`, `text`, `quadruples`, `label_source`. Dataset **không có source brand cấp file/video**: `video_id` là hash ẩn danh, không suy ra brand. `brand` trong `quadruples` là **target brand** cần dự đoán, không phải metadata nguồn.

### Input dùng cho demo/so sánh

[File `p0_vilipbta_42_input.csv`](p0_vilipbta_42_input.csv) — 42 bản ghi trích từ `train` và `validation`, schema:

```csv
review_id,text,context
```

- Không có cột `brand`.
- Không có `quadruples`, aspect, sentiment, nhãn silver/gold hoặc bất kỳ cột đáp án nào.
- Khi chạy P2, hai brand được xác nhận ở cấu hình analysis; model nhận `text`, `context` và danh sách hai brand. Không truyền brand theo dòng và không dùng `video_id` làm brand.
- File cũ `p0_dhc_vs_vaseline_42.csv` có cột `brand` suy từ nhãn silver đã bị xóa để tránh hiểu nhầm là source brand độc lập.

### Nhãn đối chiếu giữ riêng

[File `p0_vilipbta_42_silver_ref.json`](p0_vilipbta_42_silver_ref.json) — 42 dòng, tách hoàn toàn khỏi input:

- `silver_quadruples`: nhãn silver để so sánh sau khi model chạy.
- `silver_reference_group`: nhóm tham chiếu suy từ brand có trong nhãn silver, chỉ để gom/đối chiếu. Đây **không phải** source brand. Hai dòng lạc đề không có brand silver được gán nhóm `DHC` như tàn dư của bước tạo fixture cũ; không dùng giá trị này làm đầu vào model hoặc để tính chất lượng.
- File này không được đưa vào CSV, prompt, request model hoặc giao diện. Silver không phải gold.
- Trong 42 dòng: 8 dòng có cả `DHC` và `Vaseline` trong nhãn silver, 40 dòng nhắc ít nhất một trong hai brand, 2 dòng `OutOfDomain`.

### Expected extraction examples cho ViLipBTA

[File `p0_vilipbta_expected_extraction.json`](p0_vilipbta_expected_extraction.json) — 6 ví dụ tham chiếu, bọc metadata:

- `fixture`: trỏ đúng file input.
- `label_status`: `silver_reference_for_posthoc_comparison_only`.
- `not_for_quality_benchmark`: `true`.
- Ví dụ được chuyển từ nhãn silver: brand ngoài cặp chuẩn hóa thành `other`; dòng `OutOfDomain` không có mention.
- Chỉ dùng để kiểm tra thủ công sau khi chạy model. Không nhét file này vào prompt và không công bố F1/accuracy từ 6 ví dụ này.

## 2. CSV synthetic độc lập cho P1–P4

[File `p0_synthetic_dhc_vs_vaseline_22.csv`](p0_synthetic_dhc_vs_vaseline_22.csv) — 22 bản ghi, schema:

```csv
review_id,brand,text,context
```

**Đây là dữ liệu synthetic do PI Agent tự viết để kiểm tra chức năng, không phải review khách hàng thật.** Không dùng file này để công bố chất lượng NLP, F1, tỷ lệ khách hàng, mức độ phổ biến của vấn đề hoặc bất kỳ kết luận thị trường nào. File chỉ kiểm tra parser CSV, validation, job, chart/drill-down và luồng UI.

`brand` ở đây là **metadata nguồn được khai báo khi tạo dữ liệu**: mỗi dòng được gán nguồn `DHC` hoặc `Vaseline` (ví dụ phản hồi thuộc kênh của brand đó). Nó không được suy từ output cần dự đoán. Trong một số dòng, target brand của mention khác source brand; model phải đọc `text`/`context` chứ không được copy cột `brand`.

Phân bố: 12 dòng source `DHC`, 10 dòng source `Vaseline`. Các trường hợp được phủ:

| Trường hợp | Record |
| --- | --- |
| Price và/hoặc Benefits | SYN-001, SYN-003, SYN-004, SYN-009, SYN-020 |
| Nhắc nhiều brand trong cùng review | SYN-004, SYN-006, SYN-012, SYN-014, SYN-018 |
| Mixed sentiment | SYN-003, SYN-011, SYN-014, SYN-015, SYN-020, SYN-021, SYN-022 |
| Câu mơ hồ / `needs_review` | SYN-007, SYN-019 |
| Lạc đề / `off_topic` | SYN-013 |
| Context giúp xác định target | SYN-008 |
| Brand ngoài cặp chọn (`other`) | SYN-018 |
| SideEffects | SYN-010, SYN-016 |
| Neutral có nêu rõ | SYN-015 |
| Dấu phẩy trong ô | SYN-020 |
| Xuống dòng trong ô + dấu phẩy ở context | SYN-021 |
| Ngoặc kép trong ô | SYN-022 |

Expected extraction examples: [p0_synthetic_expected_extraction.json](p0_synthetic_expected_extraction.json) — 14 ví dụ, `label_status = synthetic_functional_expectation_not_gold`, `not_for_quality_benchmark = true`. Đây là kỳ vọng chức năng do người tạo dữ liệu viết, không phải gold label và không phải benchmark.

## 3. Schema, giới hạn và quy tắc kiểm tra

| Cột | Bắt buộc | Quy tắc |
| --- | --- | --- |
| `review_id` | Có trong fixture | Không rỗng, duy nhất trong file; dùng để truy vết và đối chiếu evidence |
| `brand` | Có trong CSV synthetic | Một trong hai brand đã xác nhận; là source metadata, không phải target brand |
| `text` | Có | Không rỗng, tối đa 2.000 ký tự; evidence phải là chuỗi con nguyên văn của `text` |
| `context` | Không | Tối đa 1.000 ký tự; có thể giúp xác định target nhưng không thay thế evidence trong `text` |

Giới hạn của MVP:

- UTF-8 hoặc UTF-8 BOM, header và dấu phân cách phẩy; hỗ trợ ô có dấu phẩy, ngoặc kép và xuống dòng.
- Tối đa 2 MiB/file, 2 file/analysis, 500 bản ghi dữ liệu/analysis.
- Không âm thầm cắt text/context hoặc bỏ dòng lỗi.
- CSV đầu vào không được chứa `quadruples`, `silver_quadruples`, `silver_reference_group`, `gold`, `label`, `aspect`, `sentiment`, `target_brand`, `comment_type` hoặc cột đáp án tương tự.
- File ViLipBTA dùng cho model chỉ có `review_id,text,context`; file synthetic có thêm `brand` là metadata nguồn.

## 4. Kiểm tra tự động

Chạy từ repo root:

```bash
python be/scripts/check_p0r_fixtures.py
```

Script chỉ dùng Python standard library, không gọi model và không đọc `test.jsonl`. Nó kiểm tra:

- File/header tồn tại, đúng schema, không có cột nhãn đối chiếu; CSV parse được.
- `review_id` không rỗng và duy nhất; text không rỗng; giới hạn byte/số record/độ dài.
- CSV synthetic đúng hai brand và có ô dấu phẩy, xuống dòng, ngoặc kép.
- ViLipBTA input không có cột `brand`; silver reference tách riêng, không có `source_brand`, không chứa split `test`.
- Expected examples: ID tồn tại, relevance/target/aspect/sentiment thuộc allowlist, evidence nằm nguyên văn trong `text`, mention không lặp.
- Synthetic examples có brand ngoài cặp (`other`), có source brand khác target brand và phủ `relevant`/`off_topic`/`needs_review`.

Kết quả lần chạy ngày 15-11-2026: **PASS toàn bộ** (xem output của lệnh trên). Đây là kiểm tra fixture, không phải kiểm tra chất lượng model.

## 5. Trạng thái xác minh provider/model

Cấu hình dự kiến trong [be/.env.example](../../.env.example):

- `LLM_BASE_URL=https://opencode.ai/zen/go/v1`
- `LLM_MODEL=deepseek-v4.1-flash`
- `LLM_API_KEY` chỉ đọc từ backend env, không đưa xuống frontend.

**Chưa xác minh trong P0R:** môi trường hiện tại không có biến `LLM_API_KEY` và không có file `be/.env`, nên không có smoke call nào được thực hiện. Vì vậy chưa có bằng chứng cho:

- Endpoint có truy cập được không.
- Model ID thực tế trả về trong response.
- Endpoint có hỗ trợ structured JSON/JSON schema không.
- Field `usage` (prompt/completion/total token) có xuất hiện không.
- Độ trễ và chi phí thực tế.

Provider/model trên là **ứng viên**, chưa phải provider đã nghiệm thu. Khi có key, chỉ chạy một request rất nhỏ với một review synthetic, không dùng test gold, không gọi toàn dataset; ghi lại model ID thực trả về, có/không structured JSON, usage và latency. Không in key, không log request header hoặc nội dung chứa key.

## 6. Trạng thái nghiệm thu P0R

| Hạng mục | Trạng thái |
| --- | --- |
| ViLipBTA input không có brand suy từ silver | Xong |
| Nhãn silver giữ riêng, có ghi chú không phải source brand/gold | Xong |
| CSV synthetic 2 brand, có Price/Benefits, nhiều brand, mixed, mơ hồ, lạc đề | Xong |
| Expected examples cho cả hai fixture, có metadata không dùng benchmark | Xong |
| Kiểm tra ID/schema/giới hạn/evidence/cột nhãn | Xong, chạy PASS |
| Smoke call endpoint/model/structured output/usage | **Chưa kiểm chứng — thiếu `LLM_API_KEY`** |

Còn thiếu để nghiệm thu P0R đầy đủ: cấp key qua env backend và chạy smoke call tối thiểu theo mục 5. Đây là điều kiện trước P2, không chặn P1 vì P1 không gọi model. Backend P1 đã được triển khai; xem [be/README.md](../../README.md).
