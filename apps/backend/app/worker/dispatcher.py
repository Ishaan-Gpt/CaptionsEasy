"""Job dispatcher. Source: Sprint 1.3 brief > Build (Job dispatcher).

Isolates the API layer from importing Celery tasks directly — callers depend
on this thin interface, which tests can fake without a broker.
"""

from typing import Protocol


class JobDispatcherProtocol(Protocol):
    def dispatch(self, job_id: str) -> None: ...


class CeleryJobDispatcher:
    def dispatch(self, job_id: str) -> None:
        from app.worker.tasks import process_job

        process_job.delay(job_id)
