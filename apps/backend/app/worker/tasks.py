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


def _build_stages(session, job_id: str, settings):
    """Selects the stage list by the job's `job_type`. The metadata-extraction
    job created on upload (app.services.upload_service) keeps running the
    Sprint 1.3 dummy stages; only the AI pipeline job created by
    POST /projects/{id}/process runs the real speech-recognition stage."""
    job_row = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if job_row is not None and job_row.job_type == AI_PIPELINE_JOB_TYPE:
        video = session.execute(
            select(Video).where(Video.project_id == job_row.project_id).order_by(Video.created_at.desc())
        ).scalars().first()
        return build_ai_pipeline_stages(
            job_id=job_id,
            project_id=str(job_row.project_id),
            video=video,
            settings=settings,
            session=session,
        )
    return build_dummy_stages(stage_duration_seconds=settings.job_stage_duration_seconds)


@celery_app.task(bind=True, name="motionai.process_job")
def process_job(self, job_id: str) -> str:
    settings = get_settings()
    redis_client = get_redis_client(settings)

    with worker_session(settings) as session:
        outcome = run_job_pipeline(
            job_id=job_id,
            retry_count=self.request.retries,
            max_retries=settings.job_max_retries,
            stages=_build_stages(session, job_id, settings),
            repo=WorkerJobRepository(session),
            lock=RedisJobLock(redis_client, ttl_seconds=settings.job_lock_ttl_seconds),
            progress=RedisProgressReporter(
                redis_client, ttl_seconds=settings.job_progress_ttl_seconds
            ),
            dead_letter=RedisDeadLetterSink(redis_client),
            logger=WorkerLogger(),
        )

    if outcome is JobOutcome.RETRY:
        raise self.retry(
            countdown=settings.job_retry_countdown_seconds,
            max_retries=settings.job_max_retries,
        )

    return outcome.value
