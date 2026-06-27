"""Health endpoints. Source: Sprint 1.3 brief > Build (Health endpoints).

Operational infrastructure, not a product API — mounted at the app root
(see app.main), not under /api/v1, so it is not "inventing" a documented
business endpoint from contracts/api.md.
"""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.worker.redis_client import get_redis_client

router = APIRouter(tags=["health"])
logger = logging.getLogger("motionai.api")


@router.get("/health")
async def liveness():
    """Process is up. Does not check dependencies."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Process is up AND its dependencies (Postgres, Redis) are reachable."""
    checks = {"database": False, "redis": False}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as exc:  # noqa: BLE001 - readiness probe must never raise
        logger.warning("readiness_check_failed dependency=database reason=%s", exc)

    try:
        get_redis_client(settings).ping()
        checks["redis"] = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("readiness_check_failed dependency=redis reason=%s", exc)

    ready = all(checks.values())
    body = {"status": "ready" if ready else "not_ready", "checks": checks}
    return body if ready else JSONResponse(status_code=503, content=body)
