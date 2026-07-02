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
from app.worker.stages import build_dummy_stages
from app.worker.types import JobOutcome


def _build_stages(session, job_id: str, settings, *, progress=None, repo=None):
    """Selects the stage list by the job's `job_type`."""
    job_row = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if job_row is not None:
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
            
    return build_dummy_stages(stage_duration_seconds=settings.job_stage_duration_seconds)


@celery_app.task(bind=True, name="motionai.process_job")
def process_job(self, job_id: str) -> str:
    settings = get_settings()
    redis_client = get_redis_client(settings)

    with worker_session(settings) as session:
        job_repo = WorkerJobRepository(session)
        progress_reporter = RedisProgressReporter(
            redis_client, ttl_seconds=settings.job_progress_ttl_seconds
        )
        outcome = run_job_pipeline(
            job_id=job_id,
            retry_count=self.request.retries,
            max_retries=settings.job_max_retries,
            stages=_build_stages(session, job_id, settings, progress=progress_reporter, repo=job_repo),
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
