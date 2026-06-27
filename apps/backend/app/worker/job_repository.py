"""Sync job repository for worker use. Source: contracts/database.md > jobs.

Persists every lifecycle transition the brief requires (queued -> processing
-> completed/failed/cancelled), matching app.worker.types.JobRepositoryProtocol
so app.worker.pipeline can be tested against a fake implementation.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.enums import JobStatus
from app.db.models.job import Job
from app.worker.types import WorkerJobView


class WorkerJobRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, job_id: str) -> WorkerJobView | None:
        job = self._get_model(job_id)
        if job is None:
            return None
        return WorkerJobView(id=str(job.id), status=job.status.value)

    def mark_processing(self, job_id: str) -> None:
        job = self._require(job_id)
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        job.progress = 0
        self._session.commit()

    def update_progress(self, job_id: str, percentage: int) -> None:
        job = self._require(job_id)
        job.progress = percentage
        self._session.commit()

    def mark_completed(self, job_id: str) -> None:
        job = self._require(job_id)
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        self._session.commit()

    def mark_failed(self, job_id: str, *, error_message: str) -> None:
        job = self._require(job_id)
        job.status = JobStatus.FAILED
        job.finished_at = datetime.now(timezone.utc)
        job.error_message = error_message
        self._session.commit()

    def mark_cancelled(self, job_id: str) -> None:
        job = self._require(job_id)
        job.status = JobStatus.CANCELLED
        job.finished_at = datetime.now(timezone.utc)
        self._session.commit()

    def is_cancelled(self, job_id: str) -> bool:
        job = self._get_model(job_id)
        return job is not None and job.status == JobStatus.CANCELLED

    def _get_model(self, job_id: str) -> Job | None:
        return self._session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()

    def _require(self, job_id: str) -> Job:
        job = self._get_model(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        return job
