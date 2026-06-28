"""Celery application. Source: Sprint 1.3 brief > Build (Celery, Redis).

`task_acks_late` + `worker_prefetch_multiplier=1` mean a worker only takes
one job at a time and only acknowledges it after it finishes, so a crashed
worker's in-flight job is redelivered rather than silently dropped — this is
the broker-level half of "no duplicate execution"; `app.worker.locks` is the
Redis-level half (guards against two workers picking up the same redelivered
job concurrently).
"""

import ssl

from celery import Celery
from celery.signals import worker_shutting_down

from app.core.config import get_settings
from app.worker.logging import logger

settings = get_settings()

celery_app = Celery(
    "motionai",
    broker=settings.redis_url,
    # `app.worker.tasks` is where every @celery_app.task is defined; it
    # imports `celery_app` from *this* module, so importing it directly up
    # top here would be circular. `include` has Celery import it lazily
    # after construction — without this, `celery -A app.worker.celery_app
    # worker` (the exact command render.yaml/README.md document) boots
    # "ready" with zero registered tasks, and every dispatched job is
    # silently discarded with "Received unregistered task" until a task
    # message happens to arrive after something else imports tasks.py.
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    worker_concurrency=4,
    task_ignore_result=True,
    broker_transport_options={
        "polling_interval": 10.0,  # poll Redis for jobs every 10 seconds (default is 2.0s or faster)
    },
)

if settings.redis_url.startswith("rediss://"):
    # Celery's redis transport requires an explicit ssl_cert_reqs for
    # rediss:// URLs (e.g. Upstash) — otherwise both the broker and the
    # result backend raise ValueError on first use (`.delay()`), not at
    # import time, so this was invisible until something actually
    # dispatched a task against a managed TLS Redis instance.
    _ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_app.conf.broker_use_ssl = _ssl_opts

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
