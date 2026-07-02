"""FastAPI application bootstrap. Source: contracts/api.md, docs/SYSTEM_OVERVIEW.md"""

import logging
import threading

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.deps import check_rate_limit

from app.api.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import RequestLoggingMiddleware, configure_logging

logger = logging.getLogger("motionai.api")


def _start_inline_worker() -> None:
    """Runs the Celery worker loop in this same process. Only used when
    RUN_WORKER_INLINE=true (no separate worker service — see
    Settings.run_worker_inline). `--pool=solo` keeps it to one thread-safe
    synchronous executor rather than forking subprocesses inside a process
    that's also serving HTTP requests.

    Deliberately does NOT pass `-B` (embedded beat) — Celery hard-disallows
    it on Windows (`BadParameter: -B option does not work on Windows`),
    which killed this entire thread at startup with zero jobs processed
    afterwards. `_start_inline_beat` below reimplements the one thing this
    project's beat_schedule needs (periodic task dispatch) with a plain
    thread + sleep loop, which is portable."""
    from app.worker.celery_app import celery_app

    def _run() -> None:
        celery_app.worker_main(
            [
                "worker",
                "--loglevel=info",
                "--pool=solo",
                "--concurrency=1",
                "--without-gossip",
                "--without-mingle",
            ]
        )

    thread = threading.Thread(target=_run, name="inline-celery-worker", daemon=True)
    thread.start()
    logger.info("inline_worker_started")


def _start_inline_beat() -> None:
    """Portable stand-in for `celery beat` — periodically dispatches this
    project's two scheduled tasks (see app.worker.celery_app.beat_schedule).
    Without this, recover_failed_jobs (which auto-fails jobs stuck in
    "processing" for >30min) never runs on Windows dev machines."""
    import time

    def _run() -> None:
        from app.worker.tasks import cleanup_old_exports, recover_failed_jobs

        recover_failed_jobs_interval_s = 3600
        cleanup_old_exports_interval_s = 86400
        elapsed_s = 0
        poll_s = 60
        while True:
            time.sleep(poll_s)
            elapsed_s += poll_s
            try:
                if elapsed_s % recover_failed_jobs_interval_s == 0:
                    recover_failed_jobs.delay()
                if elapsed_s % cleanup_old_exports_interval_s == 0:
                    cleanup_old_exports.delay()
            except Exception:  # noqa: BLE001 - a missed tick must not kill the loop
                logger.exception("inline_beat_tick_failed")

    thread = threading.Thread(target=_run, name="inline-celery-beat", daemon=True)
    thread.start()
    logger.info("inline_beat_started")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(title="MotionAI API", version="1.0")

    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_v1_prefix, dependencies=[Depends(check_rate_limit)])

    if settings.run_worker_inline:
        @app.on_event("startup")
        def _startup_inline_worker() -> None:
            _start_inline_worker()
            _start_inline_beat()

    return app


app = create_app()
