"""Celery task wrapper. Source: Sprint 1.3 brief > Worker, Reliability.

Thin glue between Celery's task/runtime concerns (retry scheduling, broker
ack) and the pure `run_job_pipeline` logic in app.worker.pipeline.
"""

from app.core.config import get_settings
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


@celery_app.task(bind=True, name="motionai.process_job")
def process_job(self, job_id: str) -> str:
    settings = get_settings()
    redis_client = get_redis_client(settings)

    with worker_session(settings) as session:
        outcome = run_job_pipeline(
            job_id=job_id,
            retry_count=self.request.retries,
            max_retries=settings.job_max_retries,
            stages=build_dummy_stages(stage_duration_seconds=settings.job_stage_duration_seconds),
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
