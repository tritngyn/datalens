# Ghi chú học cùng project

## Dataset và fixture

Dataset là tập dữ liệu dùng phát triển/đánh giá. Fixture là dữ liệu chuẩn bị sẵn để kiểm tra tình huống cụ thể cùng kết quả mong đợi. Có cả kho cam là có dataset; chọn vài quả để thử máy ép có kẹt không là chuẩn bị fixture.

CSV 22 review synthetic kiểm tra parser, nhãn nhiều khía cạnh và luồng phần mềm. Nó không đại diện thị trường hoặc chứng minh model hiểu review thật tốt. Bộ 42 review ViLipBTA giúp thử ngôn ngữ thực tế; test gold giữ riêng để đánh giá sau khi chốt prompt.

## Source brand và target brand

Bình luận dưới bài DHC có thể nói “Vaseline dưỡng tốt”. Nguồn là DHC nhưng đối tượng được khen là Vaseline. Không lấy nhãn target trong đáp án để tạo source brand cho input. ViLipBTA không có source brand đáng tin trong schema hiện tại.

## Silver, gold và rò rỉ đáp án

Silver là nhãn tham chiếu độ tin cậy thấp hơn; gold được rà soát kỹ hơn nhưng vẫn có thể sai. Đọc đáp án test để sửa prompt nhiều lần giống luyện theo đề thi: điểm không còn phản ánh tốt khả năng xử lý dữ liệu mới. Giữ test ngoài demo và quá trình chỉnh prompt.

## NLP nằm ở đâu?

Model biến câu “DHC dưỡng tốt nhưng mắc” thành các mention brand/aspect/sentiment kèm câu trích. Đây là ứng dụng NLP qua LLM API; hiện chưa tự huấn luyện model. Chat hiểu câu hỏi và tóm tắt cũng là NLP. Đếm review, tính mẫu số và dựng chart do backend/SQL làm.

Câu trích tồn tại chỉ chứng minh model trích đúng chữ, chưa chứng minh gán đúng brand/sentiment. Cần đánh giá riêng chất lượng nhãn; không dùng checker fixture để công bố F1.

## SQLAlchemy, Alembic và Prisma

SQLAlchemy giúp Python đọc/ghi database. Alembic lưu các lần đổi cấu trúc bảng thành migration để database được cập nhật có thứ tự. Prisma cung cấp công cụ truy vấn/migration trong hệ JavaScript/TypeScript. Project giữ FastAPI/Python nên hiện chọn SQLAlchemy + Alembic; chưa quyết định đổi backend sang TypeScript.

## PASS, SKIP và kết quả báo cáo

PASS là kiểm tra đã chạy thành công. SKIP là chưa chạy do thiếu điều kiện; không cộng vào số test đã đạt. Kết quả PI báo cáo và kết quả Codex chạy lại được ghi riêng trong tracking để biết phần nào đã được kiểm chứng độc lập.
