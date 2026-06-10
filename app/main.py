from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import (  # noqa: F401 — register models with Base.metadata
    Category,
    GalleryImage,
    Group,
    GroupPlayer,
    GroupTeam,
    Match,
    Player,
    Team,
)


def _ensure_gallery_schema() -> None:
    inspector = inspect(engine)
    if "gallery_images" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("gallery_images")}
    if "content" not in columns:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE gallery_images"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_gallery_schema()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Carrom Tournament API",
    description="Backend for managing an office carrom tournament",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(api_router)
