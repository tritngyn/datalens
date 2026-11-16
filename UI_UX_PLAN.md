# PI handoff — UI/UX DataLens / Review Intelligence

Loại sản phẩm: software — workspace phân tích review tiếng Việt của hai thương hiệu son dưỡng.
Hướng thiết kế đã duyệt: Thematic làm tham chiếu bố cục, Revuze cho so sánh brand, Chattermill cho insight → feedback. Giao diện sáng, trung tính, ưu tiên kiểm tra bằng chứng.

Trạng thái cập nhật **16/11/2026**: UI-A đã triển khai U01–U03, có báo cáo chạy API thật và ảnh; Codex đã kiểm tra source và chạy lại checks frontend, chưa tái lập DB/browser hiện tại. Người dùng đã yêu cầu chuyển sang **UI-B**; gói này được duyệt nhưng **chờ backend P2–P3**. UI-P là prototype riêng, còn hai lỗi trong [review](docs/ui-p-review.md), không được tính là UI-B hoàn tất. Người dùng tự giao việc cho PI; Codex không tự điều phối agent.
Codex chỉ viết plan; người dùng giao việc và điều phối PI. Tài liệu này không thay thế các task backend P2–P3 hoặc mở rộng phạm vi MVP.

Người dùng đã xác nhận: đây là kickoff UI/UX từ đầu, chưa có UI/UX sản phẩm để cải tiến hoặc redesign. Tên trong tài liệu sản phẩm hiện là Review Intelligence; tên hiển thị cuối cùng cần được chốt trong brief, không tự thiết kế logo/rebrand.

## 0. Chỉ dẫn bắt đầu cho PI

**Mốc hiện tại:** không làm lại UI-A. Đọc [bàn giao UI-B](docs/ui-b-handoff.md) để kiểm tra dependency và tích hợp U04–U05 khi P2–P3 sẵn sàng. Hiện source backend chỉ có API P1; chưa được thay bằng dữ liệu mẫu trong luồng thật. Các hướng dẫn UI-A bên dưới là phạm vi gốc để đối chiếu nghiệm thu.

Đọc toàn bộ plan, `features_and_scope.md`, `tech.md`, `PI_AGENT_PLAN.md` và `be/README.md` trước khi code. Kiểm tra lại source/API hiện tại vì backend có thể đã tiến triển sau khi viết plan. Giữ thay đổi sẵn trong working tree.

**Nhiệm vụ đầu tiên: UI-A — thay màn Vite mẫu bằng workspace nhập CSV và đọc review, nối API P1.** Feature phải hoàn thành: U01, U02, U03; không tự thêm backend AI, chat hoặc chart có số liệu giả. Hướng thiết kế Thematic/Revuze/Chattermill đã được người dùng duyệt, không tổ chức lại một vòng chọn phong cách.

Tên hiển thị tạm giữ `Review Intelligence` theo README; chưa thiết kế logo hoặc rebrand. Một người phân tích cần so sánh hai brand và kiểm tra review gốc, không phải quản trị hệ thống BI.

### Nguồn tham khảo và cách chuyển thành UI của project

| Nguồn | Học gì | Áp dụng cụ thể | Không mang sang |
| --- | --- | --- | --- |
| [Thematic — themes và review](https://getthematic.com/insights/product-update-labels-summarization) | Đặt phân tích gần phản hồi gốc | Desktop có vùng kết quả bên trái, review bên phải; chọn nhóm cập nhật explorer và tiêu đề phạm vi | Taxonomy tự sinh, score impact, chart thời gian ngoài MVP |
| [Thematic — summary tới câu gốc](https://help.getthematic.com/article/114-summerization) | Đi từ tóm tắt xuống câu làm căn cứ | Đến UI-C, bấm citation mở đúng review đã dùng; công bố sample m/n | Tuyên bố insight toàn tập khi chỉ đọc mẫu |
| [Revuze — competitive intelligence](https://www.revuze.it/product-hub/competitive-intelligence/) | So sánh thương hiệu theo thuộc tính | Hai brand có màu ổn định; Price/Benefits có nhãn tiếng Việt, hiển thị mẫu số | SKU, ranking thị trường, thu thập dữ liệu tự động |
| [Chattermill — feedback page](https://docs.chattermill.com/en/articles/13886180-the-new-feedback-page) | Khám phá từ insight xuống feedback | Filter/scope dễ nhìn và cùng phạm vi với kết quả; phân biệt tổng quan và review gốc | Quản lý reports/workflows/nhóm, vô số KPI |

Chỉ học cấu trúc và hành vi; không sao chép code, logo, câu chữ, ảnh hoặc số liệu của các hãng. Màn hình công khai là tham chiếu, không phải hợp đồng API hoặc bằng chứng hỗ trợ tiếng Việt.

### Skills bắt buộc và vai trò

1. **Taste Skill:** đọc [SKILL.md](.agents/skills/design-taste-frontend/SKILL.md) cùng `references/system.md`, `copy.md`, `copy-voice.md`, `layout-v4.md`, `sections.md` trước khi làm UI. Dùng một hệ tokens/components, lề đều, copy rõ, trạng thái tương tác và kiểm tra ở nhiều kích thước. Không copy nguyên starter landing page vào React app.
2. **Impeccable:** đọc [skill chính thức cho PI](https://github.com/pbakaus/impeccable/blob/main/.pi/skills/impeccable/SKILL.md). Chọn mode **Operate**. Dùng `shape` để đối chiếu brief đã có, `critique` để rà luồng, `audit` cho chất lượng kỹ thuật và `polish` để hoàn thiện. Tham khảo [Operate](https://github.com/pbakaus/impeccable/blob/main/.pi/skills/impeccable/reference/operate.md).
3. **Ponytail:** giữ giải pháp nhỏ nhất đủ chạy, tái dùng React/CSS và API hiện có. Không thêm UI kit, state framework, routing hoặc abstraction dự phòng.

**Tình trạng Impeccable ở lúc viết plan:** chưa tìm thấy bản cài trong project hoặc thư mục skill cục bộ. Codex đã đọc nguồn chính thức để viết plan, chưa cài hoặc chạy CLI. PI cần xác định skill có sẵn trong môi trường của mình; nếu chưa có, thực hiện setup project-local theo [README chính thức](https://github.com/pbakaus/impeccable) trong phạm vi task được giao, báo các file setup sinh ra. Không tự thay cấu hình/global skills ngoài project. Nếu không setup được, báo rõ hạn chế, dùng checklist công khai cho phần tiếp tục được; không ghi “đã chạy Impeccable”.

Khi skill đã cài: chạy launcher `context` theo đúng đường dẫn/version thực tế, đọc playbook tương ứng; Windows dùng `.cmd` khi bản cài có launcher đó. Nạp context từ scope và plan này; không hỏi lại mục tiêu/người dùng/hướng tham khảo đã chốt. Trước chỉnh UI, đọc `craft-floor.md` của bản Impeccable đang dùng. Không mặc định tên command/path từ một phiên bản khác.

### Khi hai skill khác nhau

User brief và phạm vi dashboard trong repo là căn cứ cao nhất. Taste Skill thiên về website giới thiệu; Impeccable Operate ưu tiên hoàn thành thao tác. Với project này, chọn quy tắc phục vụ ứng dụng: một font dễ đọc, mật độ vừa đủ, control quen thuộc, chuyển động để phản hồi trạng thái. Không thêm hero, ảnh stock, shader, scroll animation hoặc chiều cao section cố định.

Đây là cách điều chỉnh skill theo sản phẩm, không phải chỉnh/xóa skill để vượt checker. Nếu dùng Taste checker và gặp rule chỉ dành cho landing page, ghi từng rule và lý do không áp dụng dashboard bằng cơ chế waiver chính thức. Lỗi contrast, focus, tên control, overflow, dữ liệu hoặc link hỏng phải sửa. Không ghi `GATE: PASS` khi chưa chạy gate.

## 1. Căn cứ và quyết định phạm vi

Đã đọc `features_and_scope.md`, `tech.md`, `PI_AGENT_PLAN.md`, code frontend và API/schema P1.

- Frontend hiện là React + TypeScript + Vite mẫu, chưa có giao diện sản phẩm.
- Backend hiện có preview một CSV, import, đọc metadata và review phân trang. Import không gọi model; analysis mới có `analysis_status=not_started`.
- Chưa có worker, tiến độ AI, mentions, query/chart, evidence có nhãn hoặc chat.
- `features_and_scope.md` và phần mở đầu `tech.md` còn mô tả chưa có backend. Với hành vi P1, lấy code hiện tại và `be/README.md` làm căn cứ; với phạm vi sản phẩm, lấy scope và technical design.

Phạm vi kickoff: thiết kế mới giao diện ứng dụng dựa trên bài toán và backend của repo, chưa làm landing page. Có thể thiết kế toàn bộ trải nghiệm MVP trước khi backend hoàn tất; phần nối API và nghiệm thu chức năng chia theo mức sẵn sàng bên dưới.

Phản biện: một dashboard nhiều KPI hoặc một trang chat chiếm toàn màn hình đều chưa phục vụ tốt mục tiêu kiểm tra kết luận. Luồng chính cần cho người dùng thấy rõ dữ liệu nào đang được tính và mở được review gốc từ kết quả.

## 2. Danh sách feature bàn giao

| ID | Feature | Phạm vi |
| --- | --- | --- |
| U01 | Khung workspace và hệ thống giao diện | Header, vùng dữ liệu, vùng làm việc, trạng thái và responsive; toàn bộ UI bằng tiếng Việt. |
| U02 | Nhập một CSV | Chọn file, mapping, xác nhận hai brand, preview, lỗi/cảnh báo, lưu analysis. Nối API P1 thật. |
| U03 | Đọc review và mở lại analysis | Danh sách phân trang, xem đầy đủ text/context và nguồn, reload từ analysis ID trên URL. Nối API P1 thật. |
| U04 | Trạng thái phân tích | Hiển thị chưa chạy/chờ/đang chạy/hoàn tất/một phần/lỗi theo backend. Phần chạy AI phụ thuộc P2 và contract thao tác khởi chạy. |
| U05 | So sánh và drill-down | Một câu so sánh mẫu về Giá/Hiệu quả dưỡng; grouped bar, mẫu số, coverage và review tương ứng. Phụ thuộc P3. |
| U06 | Chat và biểu đồ bổ sung | Bốn intent, follow-up, lịch sử chat, citation từ câu trả lời, stacked bar. Thuộc phần hoàn thiện P5, chưa làm trong đợt đầu. |

Mục tiêu đợt đầu là U01–U03 chạy với API P1. U04–U05 hoàn tất giao diện luồng dọc khi backend P2–P3 sẵn sàng. Không gọi đợt đầu là đã hoàn thành P4.

Chưa đưa vào: landing page, đăng nhập tự viết, quản lý nhóm/workspace, lịch sử tất cả analysis, chỉnh nhãn, export, dark mode, upload hai file, demo ViLipBTA và biểu đồ ngoài scope.

### Đầu ra thiết kế cần giữ khi triển khai

| Bước | Nội dung cần quyết định | Đầu ra để duyệt |
| --- | --- | --- |
| K01 — Brief | Một người phân tích; mục tiêu so sánh hai brand và kiểm tra bằng review; tên hiển thị và ngôn ngữ | Brief ngắn, danh sách feature U01–U06 và phần để sau |
| K02 — Luồng | Nhập CSV, xử lý lỗi, lưu, phân tích, đọc kết quả và bằng chứng | User flow và danh sách trạng thái S01–S06 |
| K03 — Wireframe | Thứ tự thông tin, vị trí hành động, biểu đồ và explorer ở desktop/mobile | Bố cục cho nhập dữ liệu, workspace kết quả và đọc review; kèm empty/loading/error/partial |
| K04 — Hệ thống thị giác | Màu, chữ, spacing, control, nhãn trạng thái và chart | Một hướng thiết kế nhất quán, áp lên ba bố cục chính để duyệt |
| K05 — Bàn giao | Hành vi tương tác, dependency API, tiêu chí nghiệm thu và phạm vi file | Gói UI-A/UI-B/UI-C rõ ràng để người dùng tự giao PI |

Bản plan này đặc tả K01–K05 theo hướng tham khảo đã được người dùng duyệt; không hỏi lại việc chọn Thematic/Revuze/Chattermill. Chưa có mockup hình ảnh hoặc prototype được duyệt. PI dùng bố cục và tokens dưới đây làm baseline trong gói người dùng giao; chỉ hỏi khi cần đổi hướng hoặc mở rộng phạm vi. Backend chưa xong không ngăn thiết kế trạng thái tương lai, nhưng chưa được gọi chúng là chức năng hoàn chỉnh.

## 3. Luồng và cấu trúc màn hình

Luồng chính:

`Chọn CSV → Kiểm tra và xác nhận → Lưu review → Phân tích → So sánh → Đọc bằng chứng`

Đây là các trạng thái trong một workspace, không phải sáu trang điều hướng riêng.

### S01 — Chưa có dữ liệu

- Header: tên Review Intelligence; mô tả ngắn “So sánh review son dưỡng”.
- Vùng chính: tiêu đề “Dữ liệu review”, mô tả CSV cần cột nội dung và thương hiệu; nút chính “Chọn file CSV”.
- Hiển thị giới hạn 1 file, tối đa 2 MiB, 500 bản ghi, UTF-8 và dấu phẩy. Khi API trả limits, dùng giá trị API.
- Có ví dụ schema nhỏ `review_id,brand,text,context`, không có số liệu phân tích mẫu.
- Dùng file picker có label; kéo thả không phải điều kiện nghiệm thu đợt đầu.

### S02 — Kiểm tra CSV

Thứ tự nội dung:

1. Tên file, dung lượng và nút “Đổi file”.
2. Mapping: Nội dung → `text`, Thương hiệu nguồn → `brand`, Ngữ cảnh → tùy chọn, ID nguồn → tùy chọn.
3. Nút “Kiểm tra dữ liệu” gửi preview; chưa ghi DB.
4. Tổng bản ghi, hợp lệ, lỗi, cảnh báo; bảng tối đa 10 bản ghi do backend trả.
5. Chọn đúng hai thương hiệu từ `source_brands`, giữ nguyên giá trị gốc kể cả hoa/thường; preview lại với hai brand đã xác nhận.
6. Nút chính “Lưu dữ liệu” chỉ mở sau preview mới nhất không có lỗi và scope hai brand đã hợp lệ.

Quy tắc quan trọng:

- P1 bắt buộc mapping trước khi trả header. Đợt đầu dùng ô nhập tên cột, mặc định `text`/`brand`; optional mapping mặc định trống. Hướng dẫn lấy tên cột từ hàng tiêu đề CSV. Sau preview thành công, có thể dùng header trả về để hiện select.
- Không tự viết CSV parser trên frontend chỉ để lấy header. Nếu muốn select cột ngay sau chọn file, cần một thay đổi backend riêng trả header trước validation mapping; phải duyệt thay đổi này riêng.
- Đổi file, mapping hoặc cặp brand làm preview cũ hết hiệu lực và khóa “Lưu dữ liệu” cho tới khi kiểm tra lại.
- Lỗi hiển thị theo “Bản ghi #N” và tên trường; không gọi `physical_line` là số review.
- Nếu có một bản ghi lỗi, P1 từ chối toàn bộ import. Không có nút “Bỏ lỗi và nhập phần còn lại”.
- ID nguồn trùng chỉ cảnh báo, không tự xóa hoặc gộp review; tránh diễn giải số ID trùng thành số bản ghi bị trùng.
- File quá lớn hoặc quá số bản ghi: hướng dẫn chia file, không tự cắt.
- File chỉ có một brand hoặc có brand ngoài cặp chọn: hướng dẫn sửa CSV. Không tự tách/lọc để vượt contract P1.
- Backend vẫn là nơi quyết định hợp lệ; frontend kiểm tra dung lượng sớm chỉ để phản hồi nhanh.

### S03 — Đã lưu dữ liệu, chưa phân tích

- Hiển thị hai brand, filename, số review đã lưu và trạng thái “Đã nhập dữ liệu · Chưa phân tích”.
- Mở danh sách review thật với phân trang; không hiển thị nhãn AI, evidence hoặc thống kê sentiment chưa tồn tại.
- Có thể mở đầy đủ text, context, source ID, internal ID và số bản ghi nguồn.
- Vùng kết quả có empty state “Chưa có kết quả phân tích”. Nếu chưa có API chạy AI, không dựng nút bấm giả hoặc tiến độ giả.
- Lưu analysis ID vào query string `?analysis=<uuid>`; reload gọi GET metadata và review, không upload lại.
- Không cần thêm router chỉ cho một workspace. Không đưa nội dung review vào localStorage.
- URL sai ID/404 hiện “Không tìm thấy phiên phân tích” và đường quay lại nhập file; không tự tạo analysis thay thế.

### S04 — Phân tích và kết quả so sánh

Chỉ nối hành động và số liệu khi P2–P3 có API tương ứng.

- Trước chạy AI: hiển thị scope/số review và estimated cost nếu backend có dữ liệu. Thiếu dữ liệu chi phí thì ghi “Chưa có ước tính”, không bịa con số.
- Tiến độ lấy số đã xử lý/tổng từ backend. Nếu chưa có tổng đáng tin, dùng trạng thái đang xử lý thay cho phần trăm tự tăng.
- P4 có một câu hỏi mẫu “So sánh [A] và [B] về giá và hiệu quả dưỡng”; chưa mở ô chat tự do.
- Kết quả chính: grouped bar theo Giá/Hiệu quả dưỡng, hai brand dùng hai màu ổn định xuyên suốt analysis; chart có legend và giá trị đọc được.
- Ngay trên/dưới chart có metric, định nghĩa, tử số/mẫu số và phạm vi backend đã dùng. Mẫu số 0 hiển thị “Không đủ dữ liệu”, không phải 0%.
- Coverage hiển thị số đã xử lý/chưa xử lý/lỗi, lạc đề và chưa rõ target nếu backend cung cấp; không coi các nhóm là rời nhau để tự cộng.
- Bấm một cột mở đúng tập review backend đã tính, kèm tiêu đề brand/aspect/điều kiện và tổng số kết quả.
- Khi drill-down tỷ lệ tiêu cực, tách rõ số review tiêu cực đóng góp tử số và tổng review nhắc brand/aspect làm mẫu số; bộ lọc Negative không được biến mẫu số thành chỉ các review tiêu cực.
- Giữ query/snapshot ID do backend trả khi mở lại kết quả partial; không tự truy vấn population mới cho chart cũ.

### S05 — Review và bằng chứng

- Explorer dùng chung cho đọc raw review U03 và drill-down U05; chỉ thêm nhãn/evidence khi có payload backend.
- Mỗi mục có ID nguồn nếu có, số bản ghi, thương hiệu nguồn, nội dung, context và filename.
- Khi có nhãn, tách “Thương hiệu nguồn” khỏi “Thương hiệu được nhắc”; không suy target từ `source_brand`.
- Evidence được highlight bằng text node an toàn; không render HTML do model hoặc CSV cung cấp.
- Review dài có “Xem đầy đủ”; mở context được bằng bàn phím.
- Phân trang lấy tổng từ backend; khi đổi analysis/query quay lại trang 1.
- Citation của câu trả lời và drill-down chart là hai phạm vi khác nhau: citation chỉ review dùng cho câu trả lời, chart mở toàn bộ tập phù hợp theo phân trang.
- Nút mở explorer đưa focus tới tiêu đề; đóng drawer trả focus về nơi mở, Escape đóng drawer.

### S06 — Chat hoàn thiện, để P5

- Ô hỏi chỉ xuất hiện khi backend hỗ trợ bốn intent và lưu lịch sử.
- Hiển thị scope hiện tại: analysis, brand, aspect, sentiment và metric. Cập nhật scope theo phản hồi backend.
- Câu hỏi mẫu dùng brand/aspect hiện có; không gọi model riêng để sinh gợi ý.
- Câu trả lời gồm nhận xét ngắn, facts/chart và citation; thiếu bằng chứng thì nói rõ thiếu dữ liệu.
- Tóm tắt một mẫu phải hiện “Đã đọc m/n review” và cách chọn; không gọi đó là vấn đề phổ biến nhất toàn bộ dữ liệu.
- Câu hỏi chưa được hỗ trợ có thông báo giới hạn và gợi ý hợp lệ, không giả trả lời.
- Stacked bar đếm cặp nhãn đã khử trùng theo backend; không trình bày thành tỷ lệ review cộng 100% khi một review có nhiều sentiment.

## 4. Bố cục và hướng thị giác đề xuất

Wireframe định hướng cho workspace kết quả; hướng bố cục đã được duyệt, chưa có mockup hình ảnh cuối cùng:

```text
Desktop
┌──────────────────────────────────────────────────────────┐
│ Tên sản phẩm       Analysis / hai brand       Trạng thái │
├──────────────┬───────────────────────────────────────────┤
│ Dữ liệu      │ Phạm vi và metric đang xem                │
│ File nguồn   │ Câu so sánh mẫu                           │
│ Hai brand    │                                           │
│ Chất lượng   │ Biểu đồ + mẫu số   │ Review nhóm đã chọn  │
│ Đổi dữ liệu  │ Bảng số liệu       │ Nhãn và câu trích    │
│              │                    │ Đọc text/context    │
│              │                    │ Phân trang          │
└──────────────┴───────────────────────────────────────────┘

Mobile
┌───────────────────────┐
│ Tên / trạng thái      │
│ Scope dữ liệu (mở)    │
│ Câu so sánh mẫu       │
│ Chart / bảng số liệu  │
│ Review / phân trang   │
└───────────────────────┘
```

Ở bước nhập dữ liệu, vùng kết quả được thay bằng form mapping, preview và xác nhận; không để các panel kết quả trống bao quanh form. Đến P5 mới bổ sung vùng chat theo bố cục bên dưới.

### Desktop từ 1200 px

- Header cao khoảng 64 px, một hàng tên sản phẩm và scope đang mở.
- Cột dữ liệu rộng khoảng 224 px: filename, hai brand, trạng thái và thao tác đổi dữ liệu.
- Vùng còn lại chia kết quả khoảng 60% và review explorer khoảng 40%. Đây là bố cục học từ Thematic: chọn kết quả bên trái, kiểm tra review bên phải.
- Nếu không đủ chiều rộng, explorer xếp dưới kết quả; không ép chart hoặc review vào cột hẹp. Khi chưa chọn nhóm, explorer giải thích cách mở bằng chứng.
- Đến P5, chat và kết quả là hai tab trong vùng phân tích bên trái; explorer bên phải hiển thị bằng chứng cho tab hiện hành. Không dựng cột chat trống ở đợt đầu.
- Chỉ một hành động chính nổi bật trong từng bước; không có menu tính năng chưa làm.

### Tablet 768–1199 px

- Vùng dữ liệu thu thành khối có thể mở/đóng phía trên; kết quả và review xếp dọc.
- Đến P5, dùng tab Chat/Kết quả thay cho ép hai cột hẹp.

### Mobile dưới 768 px

- Một cột; thứ tự scope → trạng thái → nội dung của bước hiện tại.
- Bảng review chuyển thành danh sách mục; bảng preview được cuộn ngang trong khung có tên và truy cập bàn phím, không làm cả trang tràn ngang.
- Chart giữ nhãn đọc được, cho phép cuộn trong khung nếu cần; có bảng số liệu thay thế và nút mở review cho từng nhóm.
- Control chạm tối thiểu 44 px; nhãn/feedback không bị bàn phím hoặc composer che.

### Design tokens khởi đầu

| Thành phần | Đề xuất |
| --- | --- |
| Nền ứng dụng | `#F6F7F9` |
| Panel | `#FFFFFF` |
| Chữ chính / chữ phụ | `#17202A` / `#52606D` |
| Viền | `#DCE1E7` |
| Hành động / focus | `#1D4ED8` |
| Hai brand trong chart | Xanh dương / cam đất; kiểm tra tương phản và luôn có label/legend |
| Sentiment | Nhãn chữ Tích cực/Trung tính/Tiêu cực, màu chỉ hỗ trợ đọc |
| Font | System font hỗ trợ tiếng Việt; không tải thêm font trong đợt đầu |
| Cỡ chữ | Nội dung review 16 px; metadata 14 px; heading 24–28 px |
| Khoảng cách | 4, 8, 12, 16, 24, 32 px |
| Bo góc | Control 6 px, panel 8 px |
| Chuyển động | Phản hồi hover/press ngắn; tôn trọng reduced motion |

Áp dụng Taste Skill ở tính nhất quán, bố cục, copy và khả năng truy cập. Theo phạm vi dashboard đã ghi trong `PI_AGENT_PLAN.md`, không áp hero, shader, ảnh trang trí hay section cao một màn hình của landing page vào workspace.

Giọng UI: tiếng Việt rõ, trung tính; phân biệt “đã nhập” và “đã phân tích”; gọi review là review/bản ghi, không đổi thành số khách hàng.

## 5. Trạng thái và xử lý lỗi bắt buộc

| Tình huống | Hành vi UI |
| --- | --- |
| Đang preview/lưu | Hiện trạng thái đúng thao tác, chặn submit lặp. |
| CSV lỗi encoding/header/mapping | Giữ file và mapping để sửa; hiển thị lỗi API gần control tương ứng. |
| Preview có record lỗi | Hiện tổng bản ghi lỗi và danh sách lỗi; khóa lưu. Không dùng số lượng lỗi trường thay số bản ghi lỗi. |
| Preview lỗi thời | Yêu cầu kiểm tra lại trước lưu. |
| API không kết nối/500 | Giữ dữ liệu nhập, báo không hoàn tất; cho thử lại thao tác đọc/preview. |
| Import bị timeout/mất phản hồi | Báo chưa xác nhận được kết quả; không tự POST lại vì P1 chưa có idempotency hoặc endpoint tìm analysis vừa tạo. |
| GET 404/ID sai | Hiện lỗi có đường quay lại; không tự đổi analysis. |
| Job queued/running | Chỉ poll khi backend thực sự hỗ trợ; dừng khi terminal state hoặc rời analysis. |
| Một phần review thất bại | Giữ kết quả đã có, ghi rõ phạm vi partial và số lỗi; retry chỉ khi API hỗ trợ. |
| Không có dữ liệu theo filter | Empty state có tên filter; không render chart toàn số 0. |
| Mẫu số bằng 0 | Hiện “Không đủ dữ liệu”. |
| Đổi analysis khi request cũ chưa xong | Hủy hoặc bỏ phản hồi cũ; không để review/chart analysis trước lọt sang analysis mới. |

Giữ review/CSV dưới dạng text đã escape; API key model luôn ở backend. Không log nội dung review để debug mặc định.

## 6. Ranh giới API để PI không phải đoán

| Nhu cầu | API hiện tại | Ghi chú |
| --- | --- | --- |
| Preview | `POST /api/imports/preview` | Multipart `file`, JSON string `mapping`, optional `brands`. Preview tối đa 10 record. |
| Lưu | `POST /api/analyses` | Gửi lại File gốc, mapping và đúng hai brand. Không gửi các dòng preview thay file. |
| Reload scope | `GET /api/analyses/{id}` | P1 chỉ có metadata và trạng thái chưa chạy; chưa có progress/usage. |
| Raw review | `GET /api/analyses/{id}/reviews?page=1&page_size=50` | Hiện chưa có filter aspect/sentiment/query hoặc GET một review riêng. |
| Chạy AI, cost, tiến độ | Chưa đủ contract | Technical design nói create analysis tạo job nhưng code P1 chỉ import. Phải chốt cách trigger trên analysis đã import trước U04. Không POST lại file để giả khởi chạy AI. |
| So sánh/query/chart | Chưa có | Cần payload P3 thực gồm metric, counts, coverage, snapshot/query và drill-down; không đoán path/schema trong frontend. |
| Chat/history/retry | API dự kiến trong `tech.md` | Chỉ tích hợp sau triển khai backend tương ứng, không coi bảng API dự kiến là code đã chạy. |

Local frontend gọi đường dẫn tương đối `/api`. Đề xuất Vite dev proxy tới `http://127.0.0.1:8000` thay cho mở CORS rộng. Đây là cấu hình dev trong phạm vi frontend; production hosting để task riêng.

Không có API list analyses: đợt đầu hỗ trợ URL analysis đang mở, không dựng sidebar lịch sử hoặc chức năng tự tìm lại analysis khi mất URL.

## 7. Gói công việc giao PI

### Tiến độ kiểm tra ngày 16/11/2026

| Gói | Tình trạng hiện tại | Bước kế tiếp |
| --- | --- | --- |
| UI-A | Đã code U01–U03 và được PI báo cáo chạy với API P1 thật; frontend đã commit `b0d8794`, Codex chạy lint/build/test đạt | Giữ luồng thật; chạy lại end-to-end khi DB cloud sẵn sàng. Không gọi đó là mock hoặc làm lại UI-A. |
| UI-P | Có prototype `?preview=design`, 16 test frontend đạt; chưa nghiệm thu vì 2 finding về citation hỏi tiếp và empty counters | Sửa theo `docs/ui-p-review.md`; lỗi thuộc prototype, không chặn việc chuẩn bị backend P2. |
| UI-B | Người dùng đã cho chuyển sang U04–U05; chưa thể tích hợp thật do thiếu P2–P3 | Làm P2 rồi P3, từng task riêng; sau đó tích hợp theo `docs/ui-b-handoff.md`. |
| UI-C | Chưa triển khai, phụ thuộc P5 | Chưa giao trong lượt UI-B. |

Các gói dưới đây là nội dung bàn giao; Codex không tự gửi hoặc điều phối PI. Bắt đầu bằng UI-A khi người dùng giao plan. UI-B/UI-C phải đủ dependency backend; không mở rộng backend trong task UI để chạy cho đủ.

| Gói | Nội dung | Phụ thuộc | Điều kiện hoàn thành |
| --- | --- | --- | --- |
| UI-A | U01–U03: workspace, import/preview, review explorer, reload URL, lỗi và responsive | API P1 | Một CSV synthetic đi qua preview → lưu → đọc review → reload bằng dữ liệu thật; không có AI/chart giả. |
| UI-B | U04–U05: trạng thái job, một câu so sánh mẫu, grouped bar và drill-down | P2–P3, đã chốt trigger/cost/query contract | Luồng CSV → AI → so sánh → review gốc hoạt động; chart và explorer cùng snapshot và đúng mẫu số. Đây mới là frontend P4 hoàn chỉnh. |
| UI-C | U06 và các phần UI còn lại của MVP, chia nhỏ sau nghiệm thu UI-B | Backend P5 tương ứng | Follow-up, chat history, citation, stacked bar và reload giữ đúng scope theo tiêu chí MVP. |

Trước khi code gói chưa được duyệt: PI cần có phạm vi feature/file và bố cục/trạng thái đã được người dùng đồng ý theo hướng dẫn AGENTS.md. Phê duyệt đã có cho một gói không phải hỏi lại cho các lựa chọn triển khai thường lệ bên trong gói đó. Không mở rộng backend hoặc thêm tính năng ngoài gói để làm đẹp demo.

### Checklist thực hiện UI-A

1. Xác nhận API thực tế và khả năng chạy local; nêu U01–U03 và file sắp thay trong update đầu. Khi người dùng đã giao gói này, tiếp tục trong scope, không xin lại duyệt từng component.
2. Ghi ngắn quyết định tokens, layout, control và trạng thái vào `fe/DESIGN.md`. Đây là tài liệu design của app, không sao chép CSS starter hoặc tạo nhiều bản token khác nhau. Nếu Impeccable yêu cầu context root, dùng file của skill và trỏ về spec này, tránh chép lại toàn bộ scope.
3. Thay màn starter bằng S01/S02/S03/S05; đặt trạng thái cùng logic tối thiểu trong React. Một module API và các component import/explorer chỉ tách khi cần đọc và dùng lại.
4. Nối `/api` bằng Vite dev proxy, xử lý lỗi response và request về muộn; preview không ghi DB. Không tự retry POST import.
5. Hoàn tất mapping, xác nhận hai brand, invalidation preview, lỗi theo record, cảnh báo ID trùng và pagination. URL analysis là đường reload.
6. Rà nội dung thật: filename dài, review dài tối đa, text/context có newline, giá trị brand dài; icon có label hoặc tên truy cập. Ưu tiên panel inline cho đầy đủ nội dung trước khi thêm modal.
7. Chạy `critique` trên luồng nhập và đọc review, sửa điểm cản trở thao tác; `audit` các trạng thái/viewport; `polish` căn lề, spacing, typography và feedback. Nếu CLI không có thì báo checklist thủ công, không bịa output.
8. Chạy checks và bàn giao bằng chứng theo mục 8. UI-A chỉ nghiệm thu phần nhập/đọc; mô tả rõ AI chưa được nối.

### Checklist mở UI-B/UI-C

- Trước UI-B: đọc OpenAPI/source P2–P3 thực tế, chốt trigger chạy analysis đã import, progress/cost và query snapshot. Không tự phát minh endpoint.
- Chỉ thêm Recharts khi UI-B bắt đầu; chart phải có bảng số liệu và hành động drill-down dùng bàn phím.
- Trước UI-C: có contract message/history, follow-up/filter state và evidence. Giữ cùng design system và explorer; không thêm một màn chat độc lập làm mất scope.

### File thay đổi dự kiến

- `fe/src/App.tsx`, `fe/src/App.css`, `fe/src/index.css`: bỏ giao diện starter, tạo workspace và tokens.
- `fe/src/`: thêm component import/review/chart và module gọi API ở mức thực sự cần, không tạo framework/plugin/state layer riêng.
- `fe/vite.config.ts`: dev proxy `/api`.
- `fe/index.html`: ngôn ngữ `vi`, tên trang và metadata đúng sản phẩm.
- `fe/README.md`: thay README starter bằng hướng dẫn chạy UI/API, giới hạn và checks.
- `fe/package.json` và lockfile tương ứng: chỉ khi cần; Recharts là lựa chọn đã ghi trong `tech.md` nhưng chưa được cài, chỉ thêm ở UI-B. Không tự thêm UI kit, router hoặc thư viện state.
- Test frontend: dùng công cụ sẵn có nếu có; repo hiện chưa khai báo test runner frontend. Chỉ thêm tối thiểu khi có logic cần kiểm tra, không mở rộng hạ tầng test vô cớ.
- Backend, migration, fixture và các tài liệu có thay đổi sẵn trong working tree: không chỉnh trong UI-A. Mọi mở rộng API phải tách phạm vi để duyệt.

## 8. Nghiệm thu và bằng chứng cần bàn giao

### UI-A

1. Upload `be/data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv`, mapping đúng, xác nhận DHC/Vaseline, lưu và đọc đủ 22 review qua phân trang. Đây là synthetic functional fixture, không phải kết quả chất lượng AI.
2. Chạy thử CSV lỗi, file quá giới hạn, thiếu cột, brand ngoài scope, source ID trùng và ô có newline/quote. UI thể hiện đúng kết quả backend, không sửa fixture gốc để thử lỗi.
3. Đổi mapping/file/brand sau preview phải khóa lưu; các response về muộn không ghi đè scope mới.
4. Reload URL analysis đọc lại đủ metadata/review; `not_started` luôn là chưa phân tích.
5. Import thất bại/timeout không có success giả hoặc tự gửi lại POST.

### UI-B và UI-C

1. Đối chiếu một cột chart với tập review drill-down và mẫu số backend; review nhiều mention không bị UI nhân đôi số review.
2. Kiểm tra mẫu số 0, không có kết quả, partial job và việc mở lại chart cũ sau khi worker chạy thêm.
3. Kiểm tra source brand khác target brand, citation chỉ đúng review đã dùng và mọi lookup giữ analysis hiện hành.
4. Đến UI-C: hai câu hỏi nối tiếp giữ đúng scope, hiện sample m/n khi tóm tắt, reload giữ lịch sử bằng API backend.

### Chung

- `npm run build` và `npm run lint` trong `fe/` đạt.
- Logic mới không đơn giản như preview invalidation và request đổi analysis cần ít nhất một test nhỏ có ý nghĩa; không viết test chỉ để khẳng định markup tĩnh.
- Browser QA tại 1440, 1024, 768 và 390 px; kiểm tra thêm tràn ngang ở 320 px, chart/list dài và tiếng Việt đầy đủ dấu.
- Kiểm tra Tab/focus, labels, lỗi form, Enter, Escape, drawer, thông báo trạng thái và phương án đọc/bấm drill-down không cần con trỏ.
- PI bàn giao ảnh các trạng thái chính, các bước chạy luồng thật, kết quả build/lint/test và những phần chưa nối backend. Không chỉ bàn giao ảnh happy path.
- Lưu ảnh vào `fe/shots/ui/` và báo cáo ngắn vào `fe/UI_UX_DELIVERY.md`: feature đã làm/chưa làm, API thật đã dùng, skills/version thực tế, kết quả critique/audit/polish, lệnh checks và lỗi còn mở. Không đưa review thật nhạy cảm vào ảnh; dùng fixture synthetic của repo.
- Với UI-A, ảnh tối thiểu gồm empty, preview hợp lệ, validation error và review sau import; desktop/mobile đều phải có. Với UI-B bổ sung chart được chọn và partial/error; UI-C bổ sung chat có citation.
- Nếu chưa có PostgreSQL/API live: ghi rõ phần integration chưa kiểm chứng; build/lint hoặc screenshot không thay thế nghiệm thu luồng thật. Không báo UI-A hoàn thành khi chỉ render mock.

## 9. Quyết định đã chốt và giới hạn bàn giao

- Đây là kickoff thiết kế mới workspace phân tích, chưa làm landing page.
- Tham chiếu Thematic/Revuze/Chattermill đã được duyệt; baseline sáng, trung tính, một accent xanh, desktop kết quả cạnh review, mobile một cột.
- Gói đầu UI-A gồm U01–U03, nối API P1; chưa có AI/chat hoạt động.
- UI-B chờ P2–P3; UI-C theo P5. Chỉ nối chức năng sau khi có contract thật và người dùng giao gói tương ứng.

Ở lần viết plan ban đầu chưa chạy browser/build/test/API live. Cập nhật 16/11/2026: đã có báo cáo UI-A chạy API thật từ PI; Codex chạy lại lint/build và 16 tests frontend đạt khi review UI-P. Chưa tái lập DB/API end-to-end ở môi trường hiện tại, và Chrome không khởi động được ở lượt chụp lại UI-P. Tình trạng mới nhất nằm ở mục 7 và `docs/tracking.md`.

Rủi ro chính: P1 chưa có idempotency, API khởi chạy AI trên analysis đã import và contract chart/chat thực tế; không mở rộng UI vượt các ranh giới này khi chưa duyệt.
