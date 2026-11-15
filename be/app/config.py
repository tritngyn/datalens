from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/datalens_mvp"
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    csv_max_bytes: int = 2 * 1024 * 1024
    csv_max_records: int = 500
    review_max_text_chars: int = 2000
    review_max_context_chars: int = 1000


@lru_cache
def get_settings() -> Settings:
    return Settings()
