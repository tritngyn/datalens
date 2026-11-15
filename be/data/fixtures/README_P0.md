# P0 — Chốt dữ liệu đầu vào, Schema cột & Cấu hình LLM

Tài liệu này chốt kết quả của **Task P0** theo đúng kế hoạch trong [tech.md](../../../tech.md).

## 1. Kiểm tra thực tế bộ dữ liệu `visolex/UIT-ViLipBTA`

Đã tải về `be/data/vilipbta/` (License: **CC BY-NC-SA 4.0**, chỉ dùng cho nghiên cứu / phi thương mại):
- `train.jsonl`: 3.403 dòng (nhãn silver)
- `validation.jsonl`: 487 dòng (nhãn silver)
- `test.jsonl`: 446 dòng (nhãn gold — giữ riêng tuyệt đối để chấm điểm benchmark ở P5, không đụng tới trong demo/fixture)
- `brand_dict.json`: 248 surface forms ánh xạ về 117 canonical brands

### Cấu trúc dòng gốc trong UIT-ViLipBTA
- Mỗi dòng gồm: `id`, `video_id`, `parent_id`, `is_reply`, `context` (comment cha khi `is_reply=true`), `text` (comment con), `quadruples` (`[{comment_type, brand, aspect, sentiment}]`), `label_source`.
- **Không có cột `source_brand` cấp file/video**: `video_id` chỉ là hash ẩn danh của video TikTok, không suy ra brand. Nhãn `brand` nằm bên trong `quadruples` là đáp án đích (target brand).

## 2. Cặp thương hiệu được chọn: `DHC` vs `Vaseline`

Qua thống kê toàn tập `train + validation`:
- **DHC**: 232 reviews (317 quadruples), phủ đầy đủ `Benefits` (57 Pos / 26 Neg), `Price` (4 Pos / 17 Neg), `SideEffects` (6 Pos / 33 Neg), `GeneralExperience` (98 Pos / 15 Neg)...
- **Vaseline**: 194 reviews (281 quadruples), phủ đầy đủ `Benefits` (80 Pos / 18 Neg), `Price` (11 Pos / 4 Neg), `SideEffects` (1 Pos / 18 Neg), `GeneralExperience` (75 Pos / 18 Neg)...
- Cặp **DHC vs Vaseline** có sự đối lập rõ rệt về **Giá (`Price`)** và **Hiệu quả dưỡng (`Benefits`)**, khớp hoàn hảo với kịch bản hội thoại nghiệm thu trong `features_and_scope.md`:
  1. *"So sánh DHC và Vaseline về giá và hiệu quả dưỡng."*
  2. *"Chỉ xem các nhận xét tiêu cực về hiệu quả dưỡng."*
  3. *"Khách hàng đang chê cụ thể điều gì?"*
  4. *"Cho tôi đọc những comment làm bạn đưa ra kết luận đó."*

## 3. Fixture P0 (`p0_dhc_vs_vaseline_42.csv`)

- File: [p0_dhc_vs_vaseline_42.csv](p0_dhc_vs_vaseline_42.csv) (42 bản ghi trích từ `train` và `validation`).
- Schema cột CSV chuẩn:
  - `review_id`: ID bản ghi gốc (tùy chọn khi user upload CSV ngoài, nhưng có sẵn trong fixture để đối chiếu).
  - `brand`: Source brand của dòng (`DHC` hoặc `Vaseline`).
  - `text`: Nội dung nhận xét (bắt buộc, ≤ 2.000 ký tự).
  - `context`: Ngữ cảnh / comment cha nếu là câu trả lời (tùy chọn, ≤ 1.000 ký tự).
- **Không đưa nhãn silver/gold vào CSV input**: Nhãn đối chiếu được tách riêng ra file [p0_dhc_vs_vaseline_42_silver_ref.json](p0_dhc_vs_vaseline_42_silver_ref.json) chỉ phục vụ kiểm tra chất lượng sau khi chạy model.
- File fixture bao gồm đầy đủ các trường hợp biên:
  - 8 dòng nhắc **cả 2 brand** trong cùng 1 comment (ví dụ: dòng có `source_brand=DHC` nhưng khen `Vaseline` và chê `DHC`, hoặc khen thêm `Lucas Papaw` → `other`).
  - 16 dòng nhận xét về `DHC` (nhấn mạnh `Price` và `Benefits` khen/chê).
  - 16 dòng nhận xét về `Vaseline` (nhấn mạnh `Price` và `Benefits` khen/chê).
  - 2 dòng `OutOfDomain` (hỏi xin review brand khác hoặc nói chuyện ngoài lề kem trị sẹo đẻ mổ → model phải gán `relevance = "off_topic"`).
- Ví dụ Expected Extraction Output cho P2 được định nghĩa tại [p0_expected_extraction_examples.json](p0_expected_extraction_examples.json).

## 4. Cấu hình Provider / Model ở Backend

- Sử dụng **OpenCode Go** (tương thích chuẩn OpenAI Chat Completions API) ở phía Backend, không lộ key xuống Frontend:
  - `LLM_BASE_URL`: `https://opencode.ai/zen/go/v1` (hoặc cấu hình qua biến môi trường trong `be/.env`)
  - `LLM_MODEL`: `deepseek-v4.1-flash`
  - `LLM_API_KEY`: truyền qua biến môi trường `LLM_API_KEY` ở `be/.env` (mẫu tại [be/.env.example](../../.env.example)).
