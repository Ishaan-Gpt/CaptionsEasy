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
    that's also serving HTTP requests."""
    from app.worker.celery_app import celery_app

    def _run() -> None:
        celery_app.worker_main(
            ["worker", "--loglevel=info", "--pool=solo", "--concurrency=1", "--without-gossip", "--without-mingle"]
        )

    thread = threading.Thread(target=_run, name="inline-celery-worker", daemon=True)
    thread.start()
    logger.info("inline_worker_started")


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

    return app


app = create_app()
