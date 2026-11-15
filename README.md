
# Review Intelligence MVP

Đọc lại tiến độ và các khái niệm đã học trong [docs/](docs/README.md).

Ứng dụng thử nghiệm phân tích review tiếng Việt của hai thương hiệu son dưỡng. Đọc [scope](features_and_scope.md), [thiết kế kỹ thuật](tech.md) và [review P0 + plan cho PI Agent](PI_AGENT_PLAN.md) trước khi triển khai.

Fixture P0R đã sửa: input ViLipBTA không còn cột `brand`, có CSV synthetic hai brand và checker cục bộ. **P1 backend đã có FastAPI + PostgreSQL + Alembic cho preview/import/đọc review; P1 không gọi model.** Smoke call LLM vẫn chưa kiểm chứng vì thiếu `LLM_API_KEY`, nhưng không chặn P1. Hướng dẫn setup, migration, chạy API và test ở [be/README.md](be/README.md); chi tiết fixture ở [README_P0](be/data/fixtures/README_P0.md).

Dữ liệu UIT-ViLipBTA dùng cho nghiên cứu phi thương mại theo [CC BY-NC-SA 4.0](https://huggingface.co/datasets/visolex/UIT-ViLipBTA). Các file JSONL gốc được giữ cục bộ, không đưa vào Git; fixture và nhãn silver đối chiếu nằm trong `be/data/fixtures/`. Frontend hiện vẫn là màn Vite mẫu; P1 không sửa frontend.

Taste Skill được cài cục bộ ở `.agents/skills/design-taste-frontend/`. Để cài trên máy khác, dùng [hướng dẫn của tác giả](https://github.com/Leonxlnx/taste-skill#install); thư mục vendor này không được commit vào repo.
