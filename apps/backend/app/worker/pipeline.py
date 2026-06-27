"""Job pipeline runner. Source: Sprint 1.3 brief > Worker, Reliability.

Pure dependency-injected logic — no Celery, no Redis, no SQLAlchemy import
here. `app.worker.tasks.process_job` is a thin Celery wrapper around
`run_job_pipeline`; tests call this function directly with fakes.
"""

import time

from app.worker.logging import WorkerLogger
from app.worker.stages import Stage
from app.worker.types import (
    DeadLetterSinkProtocol,
    JobLockProtocol,
    JobOutcome,
    JobRepositoryProtocol,
    ProgressReporterProtocol,
)

_TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


def run_job_pipeline(
    *,
    job_id: str,
    retry_count: int,
    max_retries: int,
    stages: list[Stage],
    repo: JobRepositoryProtocol,
    lock: JobLockProtocol,
    progress: ProgressReporterProtocol,
    dead_letter: DeadLetterSinkProtocol,
    logger: WorkerLogger,
) -> JobOutcome:
    if not lock.acquire(job_id):
        logger.log_lock_skipped(job_id)
        return JobOutcome.SKIPPED_LOCKED

    try:
        job = repo.get(job_id)
        if job is None:
            return JobOutcome.SKIPPED_NOT_FOUND
        if job.status in _TERMINAL_STATUSES:
            return JobOutcome.SKIPPED_ALREADY_TERMINAL

        repo.mark_processing(job_id)
        logger.log_start(job_id, retry_count=retry_count)
        start = time.monotonic()

        outcome = _run_stages(
            job_id=job_id,
            stages=stages,
            repo=repo,
            progress=progress,
            logger=logger,
            retry_count=retry_count,
        )
        if outcome is not None:
            return outcome

        repo.mark_completed(job_id)
        progress.clear(job_id)
        duration_ms = (time.monotonic() - start) * 1000
        logger.log_finish(job_id, duration_ms=duration_ms, retry_count=retry_count)
        return JobOutcome.COMPLETED

    except Exception as exc:  # noqa: BLE001 - any stage failure routes through retry/dead-letter
        logger.log_error(job_id, error=exc, retry_count=retry_count)
        if retry_count < max_retries:
            return JobOutcome.RETRY

        repo.mark_failed(job_id, error_message=str(exc))
        dead_letter.record(job_id=job_id, error=str(exc), retry_count=retry_count)
        logger.log_dead_letter(job_id, retry_count=retry_count)
        return JobOutcome.DEAD_LETTERED

    finally:
        lock.release(job_id)


def _run_stages(
    *,
    job_id: str,
    stages: list[Stage],
    repo: JobRepositoryProtocol,
    progress: ProgressReporterProtocol,
    logger: WorkerLogger,
    retry_count: int,
) -> JobOutcome | None:
    """Runs `stages` in order, reporting progress after each. Returns a
    terminal JobOutcome if cancellation is detected, else None to signal the
    caller should proceed to mark the job completed."""
    stage_estimate_ms = 1000  # dummy fixed per-stage estimate; no AI timing exists yet.

    for index, stage in enumerate(stages):
        if repo.is_cancelled(job_id):
            repo.mark_cancelled(job_id)
            progress.clear(job_id)
            logger.log_cancelled(job_id, retry_count=retry_count)
            return JobOutcome.CANCELLED

        stage.run()

        percentage = round((index + 1) / len(stages) * 100)
        remaining_stages = len(stages) - (index + 1)
        progress.set_progress(
            job_id,
            stage=stage.name,
            percentage=percentage,
            estimated_remaining_ms=remaining_stages * stage_estimate_ms,
        )
        repo.update_progress(job_id, percentage)
        logger.log_stage(job_id, stage=stage.name, percentage=percentage)

    return None
