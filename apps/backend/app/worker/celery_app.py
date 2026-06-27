"""Celery application. Source: Sprint 1.3 brief > Build (Celery, Redis).

`task_acks_late` + `worker_prefetch_multiplier=1` mean a worker only takes
one job at a time and only acknowledges it after it finishes, so a crashed
worker's in-flight job is redelivered rather than silently dropped — this is
the broker-level half of "no duplicate execution"; `app.worker.locks` is the
Redis-level half (guards against two workers picking up the same redelivered
job concurrently).
"""

from celery import Celery
from celery.signals import worker_shutting_down

from app.core.config import get_settings
from app.worker.logging import logger

settings = get_settings()

celery_app = Celery("motionai", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    worker_concurrency=4,
)

celery_app.conf.beat_schedule = {
    "cleanup-old-exports-daily": {
        "task": "motionai.cleanup_old_exports",
        "schedule": 86400.0,
    },
    "recover-failed-jobs-hourly": {
        "task": "motionai.recover_failed_jobs",
        "schedule": 3600.0,
    }
}


@worker_shutting_down.connect
def _on_worker_shutting_down(**kwargs) -> None:
    """Graceful shutdown hook. Source: Sprint 1.3 brief > Reliability.

    `task_acks_late` ensures Celery itself redelivers any task this worker
    was mid-processing; this hook only adds visibility into that handoff.
    """
    logger.warning("worker_shutting_down")
