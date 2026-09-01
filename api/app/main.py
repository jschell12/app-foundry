from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401 — register models on Base.metadata
from .config import settings
from .db import Base, engine
from .routers import analytics, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Template default: create tables at startup. Swap for Alembic
    # migrations once the schema starts evolving in production.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analytics.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"app": settings.app_name, "docs": "/docs"}
