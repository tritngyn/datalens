# Review Intelligence — MVP Features and Scope

Trạng thái: đã có frontend Vite mẫu trong `fe/` và backend P1 (CSV preview/import/đọc review, PostgreSQL); chưa có phân tích AI, chat, chart hoặc worker. Thiết kế ở [tech.md](tech.md). Không đặt timeline.

## 1. Mục tiêu MVP

Một người phân tích upload review tiếng Việt của hai thương hiệu son dưỡng, đặt câu hỏi trong chat và nhận **nhận xét ngắn + biểu đồ so sánh + review làm bằng chứng**.

MVP kiểm chứng một luồng hoàn chỉnh: nhập dữ liệu → phân tích → hỏi tiếp → kiểm tra kết luận. Vision B2B dài hạn là dùng lại quy trình với dữ liệu doanh nghiệp; MVP chưa là SaaS nhiều khách hàng hoặc công cụ phân tích mọi CSV.

Thứ tự code ưu tiên **một luồng chạy được từ đầu đến cuối**: một CSV có `brand` và `text` → xem lỗi/preview → phân tích hai brand → hỏi câu so sánh mẫu → xem chart và review gốc. Sau khi luồng này chạy và được kiểm tra mới mở thêm demo ViLipBTA, hai file/gán brand, bốn intent, lưu hội thoại và vận hành job hoàn chỉnh. Đây là thứ tự triển khai, không thay đổi tiêu chí nghiệm thu MVP bên dưới.

Project liên quan case Competitive Product Review Intelligence của [SaigonAI](https://www.saigonai.com/case-studies/). Tham khảo sơ đồ IBL do người dùng cung cấp cho cách tách ingest/chat, lưu trạng thái và citation; không sao chép toàn bộ dịch vụ của sơ đồ.

Từ [DataLens](https://github.com/datalens-tech/datalens) chỉ học chuỗi connection → dataset → chart → mở dữ liệu gốc: nguồn nhập được kiểm tra một lần, biểu đồ dùng số liệu tính từ dữ liệu đã lưu, và cú bấm vào biểu đồ mở đúng các dòng đóng góp. Không lấy DataLens làm dependency hoặc sao chép kiến trúc nhiều service cho MVP này.

## 2. Trải nghiệm sử dụng

Một màn hình gồm vùng chọn dữ liệu/trạng thái, vùng chat và vùng chart/evidence.

1. Chọn demo hoặc upload một CSV có cột brand; cũng có thể upload hai CSV và gán brand cho từng file.
2. Preview, map cột text/context/brand, xác nhận hai thương hiệu cần so sánh.
3. Xem số bản ghi hợp lệ/lỗi, phạm vi sẽ chạy và chi phí ước tính trước khi phân tích.
4. Chạy phân tích nền, xem tiến độ. Khi xong hoặc có kết quả một phần, bắt đầu chat.
5. Hỏi so sánh, lọc hoặc tóm tắt; bấm chart/citation để mở review gốc.
6. Hỏi tiếp trong cùng phạm vi; reload vẫn mở lại được analysis và hội thoại.

Hội thoại nghiệm thu:

> So sánh A và B về giá và hiệu quả dưỡng.
>
> Chỉ xem các nhận xét tiêu cực về hiệu quả dưỡng.
>
> Khách hàng đang chê cụ thể điều gì?
>
> Cho tôi đọc những comment làm bạn đưa ra kết luận đó.

UI hiển thị bộ lọc hiện hành: analysis, thương hiệu, aspect và sentiment. Câu hỏi tiếp nối kế thừa trạng thái này; chatbot hỏi lại nếu thiếu thông tin ảnh hưởng cách tính.

## 3. Tính năng trong MVP

| ID | Tính năng | Giới hạn cụ thể |
| --- | --- | --- |
| M01 | Demo và CSV upload | Một analysis gồm tối đa hai file, chỉ review son dưỡng; preview và map text/context/brand. |
| M02 | Phân tích AI | Relevance, target brand, aspect, sentiment và câu trích evidence; cố định taxonomy ViLipBTA. |
| M03 | Chat phân tích có ngữ cảnh | Bốn intent: compare, filter_reviews, summarize_reviews, show_evidence. Không nhận mọi câu hỏi dữ liệu. |
| M04 | Chart và thống kê | Cột nhóm để so A/B; cột xếp chồng cho phân bố sentiment theo aspect; số lượng chất lượng dữ liệu là KPI. |
| M05 | Review explorer | Mở citation hoặc phần chart để xem đúng review, text/context và nhãn; có phân trang. |
| M06 | Tóm tắt có căn cứ | Nêu vấn đề trong các review đã đọc, dẫn ID; số liệu luôn từ backend, công bố khi chỉ tóm tắt một mẫu. |
| M07 | Lưu và tiến độ | Analysis/chat/results lưu PostgreSQL, job có trạng thái/lỗi/retry; không mất kết quả đã xong khi reload. |
| M08 | Đánh giá và chi phí | Benchmark riêng; ghi model/version/token/latency/estimated cost. Không hiển thị F1 cho dữ liệu upload chưa gán nhãn. |

Có các câu hỏi mẫu dựa trên hai brand/aspect đang có. Không cần thêm một model call chỉ để sinh gợi ý.

MVP có một workspace dùng bởi một người được tin cậy. Local chỉ mở localhost; nếu host Azure để truy cập từ xa thì phải khóa quyền truy cập cho người demo được cho phép. Không hứa cô lập nhiều doanh nghiệp trong cùng instance.

## 4. Dataset và taxonomy

Dùng [UIT‑ViLipBTA](https://huggingface.co/datasets/visolex/UIT-ViLipBTA) cho demo tiếng Việt và đánh giá. Chọn hai brand có đủ review sau khi kiểm tra số lượng; chưa chốt tên hoặc giả định hai mẫu cân bằng.

- Demo lấy từ train/validation; test gold giữ riêng để đánh giá. Không dùng gold label để tạo output demo như thể model dự đoán.
- Adapter giữ text và context; video_id không được suy thành brand. Brand trong gold là đáp án để chấm, không phải metadata đưa cho model trong bài đánh giá.
- Bộ aspect: GeneralExperience, Benefits, Color, SideEffects, Price, Texture, Longevity, Scent, Packaging, Ingredients.
- Không có ngày từng review trong schema hiện tại nên MVP không có time-series chart.
- So sánh ở mức brand, không quảng bá thành so sánh hai SKU. CSV ngoài dataset vẫn dùng được nếu là nhận xét son dưỡng theo cùng bộ khía cạnh.

Giấy phép dataset CC BY‑NC‑SA 4.0: giữ demo/nghiên cứu theo điều kiện đó. Quyền dùng dữ liệu trong dịch vụ thương mại cần xử lý riêng khi tiến tới pilot.

## 5. Hợp đồng CSV

Ví dụ:

```csv
review_id,brand,text,context
1,A,"Dưỡng ẩm tốt nhưng hơi dính",
2,B,"Giá hơi cao",
```

Bắt buộc có text và cách xác định brand: cột brand hoặc gán brand nguồn cho cả file. ID/context tùy chọn. Với demo ViLipBTA không có brand nguồn đáng tin, AI xác định target từ text/context; dòng không rõ giữ riêng.

Giới hạn khởi đầu để thử nghiệm, chưa là cam kết performance:

- UTF‑8/UTF‑8 BOM, header và dấu phân cách phẩy.
- Tối đa 2 MiB/file, hai file/analysis; tổng tối đa 500 bản ghi dữ liệu (không tính header).
- Text tối đa 2.000 ký tự, context tối đa 1.000 ký tự mỗi bản ghi.
- Vượt giới hạn file/số bản ghi: từ chối trước khi gọi model và hướng dẫn chia file. Text/context quá dài hoặc text rỗng: báo dòng không hợp lệ, không âm thầm cắt.
- Người dùng xác nhận phạm vi hợp lệ trước khi chạy; nếu không còn bản ghi hợp lệ thì không tạo job.
- Dùng số thứ tự bản ghi CSV để truy lại nguồn; ô có xuống dòng không được coi là nhiều review.
- Cảnh báo ID nguồn trùng. Text giống nhau chưa chứng minh hai review là cùng một người; không tự xóa.
- Không gộp dữ liệu của hai analysis khác nhau trong MVP, tránh đếm lại review do upload nhiều lần.

## 6. Quy tắc phân tích và so sánh

- Một review có thể nói về nhiều brand/aspect và mang cả ý khen/chê.
- Brand nguồn của file khác target brand trong từng câu. Không gán lời chê B cho A chỉ vì review nằm trong file A.
- “A dưỡng tốt” là Positive về A, không chứng minh A tốt hơn B.
- Không nhắc một aspect nghĩa là không có quan sát, không phải Neutral.
- “A tốt hơn B” không đủ để gán B là Negative. Quan hệ so sánh trực tiếp đầy đủ là phần mở rộng.
- “Bánh mì ngon” là off_topic trong ngữ cảnh son dưỡng. Câu mơ hồ là needs_review; không đoán target để đưa vào chart.
- General/brand không xác định và ý kiến về brand ngoài cặp chọn không được ép vào A/B; thống kê coverage riêng.
- Evidence phải xuất hiện trong review gốc. Có câu trích vẫn chưa bảo đảm nhãn/diễn giải đúng.

Mỗi chart ghi rõ số review đủ điều kiện, metric, mẫu số và phần dữ liệu chưa xử lý/không rõ target. Không gọi review count là số khách hàng.

## 7. Chat, chart và bằng chứng

Backend lọc/tính trên toàn bộ dữ liệu hợp lệ của analysis hiện hành. AI chọn plan từ danh sách cho phép; không tự thực thi SQL hay code tùy ý.

Khi hỏi “chê cụ thể gì”, hệ thống có thể đọc tối đa 20 review trong tập lọc để tóm tắt, chia mẫu theo brand khi có hai nhóm. Nếu tập lọc nhỏ hơn giới hạn thì đọc hết. Hiển thị “đọc m/n review” và cách chọn mẫu; không suy thành “vấn đề phổ biến nhất toàn tập” từ mẫu này.

Nút citation mở đúng các review đã dùng cho câu trả lời. Bấm chart mở toàn bộ tập review tương ứng bằng phân trang, không chỉ các ví dụ được trích.

Core dùng SQL/ID để truy vấn. Tìm kiếm ngữ nghĩa bằng embedding là phần mở rộng, không phải điều kiện để lọc Negative/Benefits hoặc mở lại citation.

## 8. Ngoài MVP

| Nhóm | Để sau |
| --- | --- |
| Đầu vào | PDF, DOCX, ZIP, ảnh, OCR, crawl/sync nguồn, Amazon demo và nhiều ngành hàng |
| Khám phá mở | Semantic search/RAG/vector index, hỏi tùy ý ngoài các intent đã hỗ trợ |
| Phân tích | Custom taxonomy, issue clustering/ranking toàn tập, direct comparative extraction, forecast/time-series |
| BI/reporting | Heatmap, pie chart, trình tạo chart tự do, export PDF, snapshot report riêng |
| Nhóm/doanh nghiệp | Workspace đa tenant, mời thành viên, phân quyền vai trò, SSO tự viết, billing |
| Rà soát | UI sửa nhãn và audit chỉnh sửa; MVP chỉ đọc nhãn/evidence và đánh giá bằng bộ test riêng |
| Hạ tầng | Blob Storage, Event Grid, Azure AI Search, Document Intelligence khi chưa có nhu cầu tương ứng |

Không bỏ các phần validation, bảo vệ API key, giới hạn chi phí, lưu dữ liệu và khóa truy cập cho bản host.

## 9. Nghiệm thu MVP

1. Demo hai brand và CSV cùng ngành đi được hết luồng nhập → phân tích → chat → chart → evidence.
2. Hai lần hỏi tiếp giữ đúng brand/aspect/sentiment và công bố cách hiểu metric.
3. Chart và danh sách drill-down khớp số liệu backend; không nhầm review count với mention count.
4. Review lạc đề/mơ hồ/lỗi có số lượng riêng; partial results được ghi rõ.
5. Tất cả citation có thật, thuộc analysis đang mở và đúng với câu đã dùng.
6. Reload/server restart không mất kết quả đã ghi và lịch sử chat; job dở được retry có kiểm soát.
7. Chạy benchmark có IDs/version/cỡ mẫu/failure rate; có ví dụ model sai và phân tích lỗi.
8. Đo token, estimated cost và latency trên lượt chạy thực; chưa đo thì không ghi con số thành tích.
9. Không còn feature ngoài MVP được mô tả như điều kiện phải triển khai.

## Nguồn

- [SaigonAI — Case studies](https://www.saigonai.com/case-studies/).
- [UIT‑ViLipBTA — Dataset card](https://huggingface.co/datasets/visolex/UIT-ViLipBTA).
- Sơ đồ tham khảo do người dùng cung cấp: [Architecture-Diagram.png](G:/road_to_web/fpt/IBLdocs/IBL/Architecture-Diagram.png). Không sao chép ảnh vào repo.
