"""Authenticated worker-pairing + worker-management endpoints.

Reuses get_current_profile exactly like every other authenticated route in
this API — a local worker never calls these; a logged-in browser session
does (the /pair confirm page, the Settings "Connected Computer" section).
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_profile
from app.core.errors import AppError, ForbiddenError, NotFoundError
from app.core.responses import success_response
from app.db.models.profile import Profile
from app.db.models.worker import Worker, WorkerPairing
from app.db.session import get_db

router = APIRouter(tags=["workers"])


@router.get("/pairing/{code}")
async def get_pairing(
    code: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    pairing = await db.get(WorkerPairing, code)
    if pairing is None:
        raise NotFoundError("Pairing code not found.")
    return success_response(
        {
            "code": pairing.code,
            "workerName": pairing.worker_name,
            "status": pairing.status,
            "expiresAt": pairing.expires_at.isoformat(),
        }
    )


@router.post("/pairing/{code}/confirm")
async def confirm_pairing(
    code: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    pairing = await db.get(WorkerPairing, code)
    if pairing is None:
        raise NotFoundError("Pairing code not found.")
    if pairing.status != "pending":
        raise AppError(f"Pairing already {pairing.status}.", code="ALREADY_CLAIMED", status_code=409)
    if pairing.expires_at < datetime.now(timezone.utc):
        pairing.status = "expired"
        await db.commit()
        raise AppError("Pairing code expired.", code="PAIRING_EXPIRED", status_code=409)

    worker = Worker(
        owner_id=profile.id,
        name=pairing.worker_name,
        worker_url=pairing.worker_url,
        worker_token=pairing.worker_token,
        status="online",
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(worker)
    await db.flush()

    pairing.owner_id = profile.id
    pairing.worker_id = worker.id
    pairing.status = "confirmed"
    pairing.claimed_at = datetime.now(timezone.utc)
    await db.commit()

    return success_response({"workerId": str(worker.id), "name": worker.name})


@router.post("/pairing/{code}/deny")
async def deny_pairing(
    code: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    pairing = await db.get(WorkerPairing, code)
    if pairing is None:
        raise NotFoundError("Pairing code not found.")
    if pairing.status == "pending":
        pairing.status = "denied"
        pairing.owner_id = profile.id
        pairing.claimed_at = datetime.now(timezone.utc)
        await db.commit()
    return success_response({"ok": True})


@router.get("/workers")
async def list_workers(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Worker).where(Worker.owner_id == profile.id).order_by(Worker.created_at.desc())
    )
    workers = result.scalars().all()
    return success_response(
        [
            {
                "id": str(w.id),
                "name": w.name,
                "status": w.status,
                "lastSeenAt": w.last_seen_at.isoformat() if w.last_seen_at else None,
                "lastError": w.last_error,
            }
            for w in workers
        ]
    )


@router.delete("/workers/{worker_id}")
async def delete_worker(
    worker_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    worker = await db.get(Worker, worker_id)
    if worker is None:
        raise NotFoundError("Worker not found.")
    if worker.owner_id != profile.id:
        raise ForbiddenError("You do not have access to this worker.")
    await db.delete(worker)
    await db.commit()
    return success_response({"ok": True})
