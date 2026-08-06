"""Job dispatcher. Source: Sprint 1.3 brief > Build (Job dispatcher).

Isolates the API layer from importing Celery tasks directly — callers depend
on this thin interface, which tests can fake without a broker.

Local-worker processing (see DEPLOYMENT.md): cloud rendering is paused
after Render's free-tier RAM couldn't survive a real Remotion render.
`ai_pipeline`/`render` jobs now get pushed to a user's paired local worker
over its Cloudflare tunnel instead of Celery; `video_metadata_extraction`
(cheap, ffprobe-only, never had issues) and storage cleanup stay on the
existing Celery/inline-worker path, completely unchanged.
"""

import uuid
from datetime import datetime, timezone
from typing import Protocol

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.db.models.job import Job
from app.db.models.motion_script import MotionScript
from app.db.models.project import Project
from app.db.models.video import Video
from app.db.models.worker import Worker
from app.storage.base import StorageClient

LOCAL_WORKER_JOB_TYPES = {"ai_pipeline", "render"}


class JobDispatcherProtocol(Protocol):
    async def dispatch(self, job_id: str) -> None: ...
    async def dispatch_cleanup(self, project_id: str) -> None: ...


class CompositeJobDispatcher:
    def __init__(
        self, *, db: AsyncSession, settings: Settings, storage_client: StorageClient
    ) -> None:
        self._db = db
        self._settings = settings
        self._storage_client = storage_client

    async def dispatch(self, job_id: str) -> None:
        job = await self._db.get(Job, uuid.UUID(job_id))
        if job is None:
            return

        if job.job_type not in LOCAL_WORKER_JOB_TYPES:
            from app.worker.tasks import process_job

            process_job.delay(job_id)
            return

        await self._dispatch_to_local_worker(job)

    async def dispatch_cleanup(self, project_id: str) -> None:
        from app.worker.tasks import cleanup_project_storage

        cleanup_project_storage.delay(project_id)

    async def _dispatch_to_local_worker(self, job: Job) -> None:
        project = await self._db.get(Project, job.project_id)
        if project is None:
            raise AppError("Project not found.", code="NOT_FOUND", status_code=404)

        worker_result = await self._db.execute(
            select(Worker)
            .where(Worker.owner_id == project.owner_id, Worker.status == "online")
            .order_by(Worker.last_seen_at.desc().nullslast())
        )
        worker = worker_result.scalars().first()

        if worker is None or not worker.worker_url:
            from app.db.enums import JobStatus

            job.status = JobStatus.FAILED
            job.error_message = (
                "No computer connected. Connect your computer to process this project "
                "(cloud processing is coming soon)."
            )
            job.finished_at = datetime.now(timezone.utc)
            await self._db.commit()
            raise AppError(
                job.error_message, code="NO_WORKER_PAIRED", status_code=409
            )

        video_result = await self._db.execute(
            select(Video).where(Video.project_id == job.project_id).order_by(Video.created_at.desc())
        )
        video = video_result.scalars().first()
        if video is None:
            raise AppError("No video found for this project.", code="NOT_FOUND", status_code=404)

        video_signed_url = await self._storage_client.get_signed_url(path=video.storage_path)

        payload: dict = {
            "jobId": str(job.id),
            "jobType": job.job_type,
            "callbackBaseUrl": self._settings.backend_public_url,
            "videoSignedUrl": video_signed_url,
        }

        if job.job_type == "ai_pipeline":
            prompt_parts = []
            if project.title:
                prompt_parts.append(f"Title: {project.title}")
            if project.description:
                prompt_parts.append(f"Description: {project.description}")
            payload.update(
                {
                    "style": project.style or "kalakar",
                    "captionTemplate": project.caption_template,
                    "prompt": ". ".join(prompt_parts) if prompt_parts else None,
                    "speechProviderName": self._settings.speech_provider_name,
                    "creativeProviderName": self._settings.creative_provider_name,
                    "captionProviderName": self._settings.caption_provider_name,
                    "renderPlanProviderName": self._settings.render_plan_provider_name,
                }
            )
        elif job.job_type == "render":
            ms_result = await self._db.execute(
                select(MotionScript)
                .where(MotionScript.project_id == job.project_id)
                .order_by(MotionScript.created_at.desc())
            )
            motion_script_row = ms_result.scalars().first()
            if motion_script_row is None:
                raise AppError(
                    "No MotionScript found — run processing before exporting.",
                    code="NOT_FOUND",
                    status_code=404,
                )
            payload["motionScript"] = motion_script_row.motion_script_json

        try:
            async with httpx.AsyncClient(timeout=self._settings.worker_dispatch_timeout_seconds) as client:
                response = await client.post(
                    worker.worker_url.rstrip("/") + "/jobs",
                    json=payload,
                    headers={"Authorization": f"Bearer {worker.worker_token}"},
                )
                response.raise_for_status()
        except Exception as exc:
            worker.status = "offline"
            worker.last_error = f"Dispatch failed: {exc}"
            from app.db.enums import JobStatus

            job.status = JobStatus.FAILED
            job.error_message = "Your computer appears to be offline. Reconnect it and try again."
            job.finished_at = datetime.now(timezone.utc)
            await self._db.commit()
            raise AppError(job.error_message, code="WORKER_OFFLINE", status_code=409) from exc

        job.worker_id = worker.id
        await self._db.commit()


class CeleryJobDispatcher:
    """Dormant fallback — still directly usable (e.g. in tests) without a
    DB session/storage client, for job types that never left Celery."""

    async def dispatch(self, job_id: str) -> None:
        from app.worker.tasks import process_job

        process_job.delay(job_id)

    async def dispatch_cleanup(self, project_id: str) -> None:
        from app.worker.tasks import cleanup_project_storage

        cleanup_project_storage.delay(project_id)
