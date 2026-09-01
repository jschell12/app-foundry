from fastapi import APIRouter
from sqlalchemy import text

from ..config import settings
from ..db import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"

    return {
        "status": "ok",
        "environment": settings.environment,
        "database": database,
    }
