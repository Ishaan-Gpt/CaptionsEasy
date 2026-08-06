"""Internal callback endpoints a paired local worker uses to report job
progress/results back to this API. Authenticated via the worker's own
bearer token (not a Supabase JWT — a local worker isn't a logged-in
browser session), checked against Job.worker_id's stored token.

Mounted without check_rate_limit (that dependency requires a Supabase
JWT via get_current_profile, which doesn't apply here) — same reasoning
as pairing_public.py.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import bearer_scheme
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, UnauthorizedError
from app.core.responses import success_response
from app.core.worker_token import verify_worker_token
from app.db.enums import JobStatus
from app.db.models.job import Job
from app.db.models.project import Project
from app.db.models.worker import Worker
from app.db.session import get_db
from app.storage.dependencies import get_storage_client
from app.worker.ai_pipeline_persistence import build_ai_pipeline_rows
from app.worker.export_persistence import build_export_row
from app.worker.progress import RedisProgressReporter
from app.worker.redis_client import get_redis_client

router = APIRouter(tags=["worker-callbacks"], prefix="/internal/jobs")


async def get_authenticated_worker_job(
    job_id: uuid.UUID,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Job:
    if credentials is None:
        raise UnauthorizedError("Missing bearer token.")

    job = await db.get(Job, job_id)
    if job is None or job.worker_id is None:
        raise NotFoundError("Job not found.")

    worker = await db.get(Worker, job.worker_id)
    if worker is None or not verify_worker_token(credentials.credentials, worker.worker_token):
        raise UnauthorizedError("Invalid worker token for this job.")

    worker.status = "online"
    worker.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return job


def _progress_reporter(settings: Settings) -> RedisProgressReporter:
    return RedisProgressReporter(get_redis_client(settings), ttl_seconds=settings.job_progress_ttl_seconds)


@router.post("/{job_id}/progress")
async def report_progress(
    body: dict,
    job: Job = Depends(get_authenticated_worker_job),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    stage = str(body.get("stage", ""))
    percentage = int(body.get("percentage", 0))

    _progress_reporter(settings).set_progress(
        str(job.id), stage=stage, percentage=percentage, estimated_remaining_ms=0
    )
    job.progress = percentage
    if job.status == JobStatus.QUEUED:
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
    await db.commit()
    return success_response({"ok": True})


@router.post("/{job_id}/complete")
async def report_complete(
    body: dict,
    job: Job = Depends(get_authenticated_worker_job),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    for row in build_ai_pipeline_rows(
        project_id=str(job.project_id),
        speech_provider_name="groq",
        transcript_json=body["transcript"],
        creative_plan_json=body["creative_plan"],
        caption_json=body["caption_plan"],
        motion_script_json=body["motion_script"],
    ):
        db.add(row)

    job.status = JobStatus.COMPLETED
    job.progress = 100
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()

    _progress_reporter(settings).clear(str(job.id))
    return success_response({"ok": True})


@router.post("/{job_id}/complete-render")
async def report_complete_render(
    file: UploadFile,
    resolution_width: int = Form(...),
    resolution_height: int = Form(...),
    quality: str = Form(...),
    render_duration_ms: int = Form(...),
    duration_s: float = Form(...),
    job: Job = Depends(get_authenticated_worker_job),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    content = await file.read()
    export_id = uuid.uuid4()
    export_storage_path = f"projects/{job.project_id}/exports/{export_id}.mp4"

    storage_client = get_storage_client(settings)
    await storage_client.upload(path=export_storage_path, content=content, content_type="video/mp4")

    project = await db.get(Project, job.project_id)
    style_name = project.style if project else "minimal"

    export_row = build_export_row(
        export_id=export_id,
        project_id=job.project_id,
        style_name=style_name,
        quality=quality,
        width=resolution_width,
        height=resolution_height,
        render_duration_ms=render_duration_ms,
        duration_s=duration_s,
        size_bytes=len(content),
        storage_path=export_storage_path,
    )
    db.add(export_row)

    job.status = JobStatus.COMPLETED
    job.progress = 100
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()

    _progress_reporter(settings).clear(str(job.id))
    return success_response({"exportId": str(export_id)})


@router.post("/{job_id}/failed")
async def report_failed(
    body: dict,
    job: Job = Depends(get_authenticated_worker_job),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    job.status = JobStatus.FAILED
    job.error_message = str(body.get("error_message", "Local worker reported failure."))
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()

    _progress_reporter(settings).clear(str(job.id))
    return success_response({"ok": True})
