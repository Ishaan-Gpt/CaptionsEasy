"""Celery task wrapper. Source: Sprint 1.3 brief > Worker, Reliability.

Thin glue between Celery's task/runtime concerns (retry scheduling, broker
ack) and the pure `run_job_pipeline` logic in app.worker.pipeline.
"""

from sqlalchemy import select

from app.core.config import get_settings
from app.db.models.job import Job
from app.db.models.video import Video
from app.worker.ai_pipeline_stage import AI_PIPELINE_JOB_TYPE, build_ai_pipeline_stages
from app.worker.celery_app import celery_app
from app.worker.dead_letter import RedisDeadLetterSink
from app.worker.db import worker_session
from app.worker.job_repository import WorkerJobRepository
from app.worker.locks import RedisJobLock
from app.worker.logging import WorkerLogger
from app.worker.pipeline import run_job_pipeline
from app.worker.progress import RedisProgressReporter
from app.worker.redis_client import get_redis_client
from app.worker.types import JobOutcome


class UnroutableJobError(RuntimeError):
    """Raised when a job can't be matched to a real stage list.

    There used to be a silent fallback to build_dummy_stages() here (a
    stub that just sleeps 3 times and returns — no render, no upload, no
    Export row) whenever the job row wasn't found or job_type didn't
    match. run_job_pipeline has no way to tell a no-op stage list from a
    real one, so it called mark_completed() regardless — jobs reported
    100%/"completed" with nothing ever produced. Raising here instead
    makes run_job_pipeline's except-Exception path mark the job failed
    with a real error message, which is the only way it *can* fail
    visibly if this ever happens again (e.g. a new job_type added
    without updating this function, or a session-visibility race on the
    freshly committed Job row).
    """


def _build_stages(session, job_id: str, settings, *, progress=None, repo=None):
    """Selects the stage list by the job's `job_type`."""
    job_row = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if job_row is None:
        raise UnroutableJobError(f"No Job row found for job_id={job_id!r} — cannot select a stage list")

    if job_row.job_type == AI_PIPELINE_JOB_TYPE:
        video = session.execute(
            select(Video).where(Video.project_id == job_row.project_id).order_by(Video.created_at.desc())
        ).scalars().first()
        return build_ai_pipeline_stages(
            job_id=job_id,
            project_id=str(job_row.project_id),
            video=video,
            settings=settings,
            session=session,
            progress=progress,
            repo=repo,
        )
    elif job_row.job_type == "render":
        from app.worker.render_stage import build_render_stages
        return build_render_stages(session, job_id, settings)

    raise UnroutableJobError(f"Unrecognized job_type={job_row.job_type!r} for job_id={job_id!r}")


@celery_app.task(bind=True, name="motionai.process_job")
def process_job(self, job_id: str) -> str:
    settings = get_settings()
    redis_client = get_redis_client(settings)
    retry_count = self.request.retries

    with worker_session(settings) as session:
        job_repo = WorkerJobRepository(session)
        progress_reporter = RedisProgressReporter(
            redis_client, ttl_seconds=settings.job_progress_ttl_seconds
        )

        # _build_stages() is a plain function-argument expression below, so if
        # it raises it happens BEFORE run_job_pipeline (and its try/except)
        # ever starts — an uncaught UnroutableJobError would crash the Celery
        # task without ever calling mark_failed, leaving the Job row stuck
        # instead of cleanly failed. Build stages in our own try/except that
        # mirrors run_job_pipeline's own failure handling so the job always
        # reaches a real terminal state.
        try:
            stages = _build_stages(session, job_id, settings, progress=progress_reporter, repo=job_repo)
        except UnroutableJobError as exc:
            logger = WorkerLogger()
            logger.log_error(job_id, error=exc, retry_count=retry_count)
            if retry_count < settings.job_max_retries:
                raise self.retry(
                    countdown=settings.job_retry_countdown_seconds,
                    max_retries=settings.job_max_retries,
                )
            job_repo.mark_failed(job_id, error_message=str(exc))
            RedisDeadLetterSink(redis_client).record(job_id=job_id, error=str(exc), retry_count=retry_count)
            logger.log_dead_letter(job_id, retry_count=retry_count)
            return JobOutcome.DEAD_LETTERED.value

        outcome = run_job_pipeline(
            job_id=job_id,
            retry_count=retry_count,
            max_retries=settings.job_max_retries,
            stages=stages,
            repo=job_repo,
            lock=RedisJobLock(redis_client, ttl_seconds=settings.job_lock_ttl_seconds),
            progress=progress_reporter,
            dead_letter=RedisDeadLetterSink(redis_client),
            logger=WorkerLogger(),
        )

    if outcome is JobOutcome.RETRY:
        raise self.retry(
            countdown=settings.job_retry_countdown_seconds,
            max_retries=settings.job_max_retries,
        )

    return outcome.value


import uuid
import asyncio
from app.storage.dependencies import get_storage_client
from app.db.models.export import Export as ExportRow

def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@celery_app.task(name="motionai.cleanup_project_storage")
def cleanup_project_storage(project_id: str) -> str:
    """Cleans up all video and export storage objects for a deleted project."""
    settings = get_settings()
    storage_client = get_storage_client(settings)
    
    with worker_session(settings) as session:
        proj_uuid = uuid.UUID(project_id)
        
        # 1. Get and delete all videos
        videos = session.execute(
            select(Video).where(Video.project_id == proj_uuid)
        ).scalars().all()
        for video in videos:
            try:
                run_async(storage_client.delete(video.storage_path))
            except Exception:
                pass
                
        # 2. Get and delete all exports
        exports = session.execute(
            select(ExportRow).where(ExportRow.project_id == proj_uuid)
        ).scalars().all()
        for export in exports:
            try:
                run_async(storage_client.delete(export.storage_path))
            except Exception:
                pass
                
    return "cleanup_completed"


@celery_app.task(name="motionai.cleanup_old_exports")
def cleanup_old_exports() -> str:
    """Daily cleanup worker for exports older than 7 days."""
    from datetime import datetime, timedelta, timezone
    settings = get_settings()
    storage_client = get_storage_client(settings)
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    
    with worker_session(settings) as session:
        old_exports = session.execute(
            select(ExportRow).where(
                ExportRow.created_at < cutoff, 
                ExportRow.status == "completed"
            )
        ).scalars().all()
        
        for exp in old_exports:
            try:
                run_async(storage_client.delete(exp.storage_path))
                exp.status = "expired"
                exp.storage_path = None
            except Exception:
                pass
        session.commit()
        
    return "old_exports_cleaned"


@celery_app.task(name="motionai.recover_failed_jobs")
def recover_failed_jobs() -> str:
    """Hourly background worker to recover jobs stuck in processing state for > 30 minutes."""
    from datetime import datetime, timedelta, timezone
    from app.db.models.project import Project as ProjectModel
    settings = get_settings()
    
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    with worker_session(settings) as session:
        stuck_jobs = session.execute(
            select(Job).where(
                Job.status == "processing",
                Job.started_at < cutoff
            )
        ).scalars().all()
        
        for job in stuck_jobs:
            job.status = "failed"
            job.error_message = "Job timed out (exceeded 30 minutes duration)"
            job.finished_at = datetime.now(timezone.utc)
            
            # Update corresponding project status
            project = session.execute(
                select(ProjectModel).where(ProjectModel.id == job.project_id)
            ).scalar_one_or_none()
            if project and project.status == "PROCESSING":
                project.status = "FAILED"
                
        session.commit()
        
    return "recovered_jobs"
