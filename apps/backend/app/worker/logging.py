"""Structured job logging. Source: Sprint 1.3 brief > Logging.

"Every job records: start, finish, duration, errors, retry_count."
Mirrors the style of app.ai.logging.structured.StageLogger.
"""

import logging

logger = logging.getLogger("motionai.worker")


class WorkerLogger:
    def log_start(self, job_id: str, *, retry_count: int) -> None:
        logger.info("job_started", extra={"job_id": job_id, "retry_count": retry_count})

    def log_stage(self, job_id: str, *, stage: str, percentage: int) -> None:
        logger.info(
            "job_stage_progress",
            extra={"job_id": job_id, "stage": stage, "percentage": percentage},
        )

    def log_finish(self, job_id: str, *, duration_ms: float, retry_count: int) -> None:
        logger.info(
            "job_finished",
            extra={"job_id": job_id, "duration_ms": duration_ms, "retry_count": retry_count},
        )

    def log_cancelled(self, job_id: str, *, retry_count: int) -> None:
        logger.info("job_cancelled", extra={"job_id": job_id, "retry_count": retry_count})

    def log_error(self, job_id: str, *, error: Exception, retry_count: int) -> None:
        logger.warning(
            "job_error job_id=%s retry_count=%s error_type=%s error=%s",
            job_id,
            retry_count,
            type(error).__name__,
            error,
        )

    def log_dead_letter(self, job_id: str, *, retry_count: int) -> None:
        logger.error("job_dead_lettered", extra={"job_id": job_id, "retry_count": retry_count})

    def log_lock_skipped(self, job_id: str) -> None:
        logger.info("job_skipped_locked", extra={"job_id": job_id})
