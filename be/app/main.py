from fastapi import FastAPI

from .api import router
from .config import get_settings

app = FastAPI(
    title="Review Intelligence API",
    version="0.1.0",
    description="P1: CSV preview, import and persisted review reads.",
)
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
    )
