
# Review Intelligence MVP

Ứng dụng thử nghiệm phân tích review tiếng Việt của hai thương hiệu son dưỡng. Đọc [scope](features_and_scope.md), [thiết kế kỹ thuật](tech.md) và [review P0 + plan cho PI Agent](PI_AGENT_PLAN.md) trước khi triển khai.

Hiện có frontend Vite mẫu và dữ liệu chuẩn bị cho P0; **P0 còn lỗi source brand cần sửa trước P1**. Dữ liệu UIT-ViLipBTA dùng cho nghiên cứu phi thương mại theo [CC BY-NC-SA 4.0](https://huggingface.co/datasets/visolex/UIT-ViLipBTA). Các file JSONL gốc được giữ cục bộ, không đưa vào Git; fixture và nhãn silver đối chiếu nằm trong `be/data/fixtures/`.

Taste Skill được cài cục bộ ở `.agents/skills/design-taste-frontend/`. Để cài trên máy khác, dùng [hướng dẫn của tác giả](https://github.com/Leonxlnx/taste-skill#install); thư mục vendor này không được commit vào repo.
