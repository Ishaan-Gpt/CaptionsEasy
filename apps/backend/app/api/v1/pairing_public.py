"""Public (unauthenticated) worker-pairing endpoints.

Called by a local worker process before any user login is involved, so
these are mounted separately in app.main WITHOUT the check_rate_limit
dependency (which itself requires a Supabase JWT via get_current_profile)
that the rest of api_router uses — mirrors how health_router is mounted.
"""

import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.responses import success_response
from app.db.models.worker import WorkerPairing
from app.db.session import get_db

router = APIRouter(tags=["pairing-public"])

PAIRING_TTL_MINUTES = 15
_WORDS = ["PANDA", "TIGER", "OTTER", "EAGLE", "WHALE", "LEMUR", "ORCA", "LYNX", "SWAN", "FALCON"]
_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generate_code() -> str:
    word = random.choice(_WORDS)
    suffix = "".join(random.choice(_ALPHA) for _ in range(4))
    return f"{word}-{suffix}"


class PairStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_name: str = Field(default="My Computer", min_length=1, max_length=80)
    worker_token: str = Field(min_length=16, max_length=200)
    worker_url: str


@router.post("/pair/start", status_code=201)
async def pair_start(
    body: PairStartRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    code = _generate_code()
    for _ in range(5):
        existing = await db.get(WorkerPairing, code)
        if existing is None:
            break
        code = _generate_code()

    pairing = WorkerPairing(
        code=code,
        worker_name=body.worker_name,
        worker_token=body.worker_token,
        worker_url=body.worker_url,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=PAIRING_TTL_MINUTES),
    )
    db.add(pairing)
    await db.commit()

    return success_response(
        {
            "code": code,
            "confirmUrl": f"{settings.frontend_url.rstrip('/')}/pair?code={code}",
            "pollUrl": f"{settings.backend_public_url.rstrip('/')}/pair/{code}",
            "expiresInSec": PAIRING_TTL_MINUTES * 60,
        },
        status_code=201,
    )


@router.get("/pair/{code}")
async def pair_status(code: str, db: AsyncSession = Depends(get_db)):
    pairing = await db.get(WorkerPairing, code)
    if pairing is None:
        return success_response({"status": "not_found"}, status_code=404)

    status = pairing.status
    if status == "pending" and pairing.expires_at < datetime.now(timezone.utc):
        status = "expired"
        pairing.status = "expired"
        await db.commit()

    return success_response(
        {
            "status": status,
            "workerId": str(pairing.worker_id) if pairing.worker_id else None,
            "expiresAt": pairing.expires_at.isoformat(),
        }
    )
