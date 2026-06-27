"""Shared types for the background processing worker.

Source: Sprint 1.3 brief > Job Lifecycle / Reliability / Progress.

Job Lifecycle as persisted to `jobs.status` (contracts/database.md only
defines queued/processing/completed/failed/cancelled — there is no
"preparing"/"running" enum value). This worker treats "preparing" and
"running" from the brief's lifecycle diagram as sub-phases of the single
persisted `processing` status: the fine-grained phase is exposed only as
ephemeral progress (`current_stage`), never written to the `status` column,
so no new enum value is invented.
"""

import enum
from dataclasses import dataclass
from typing import Protocol


class JobOutcome(str, enum.Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RETRY = "retry"
    DEAD_LETTERED = "dead_lettered"
    SKIPPED_LOCKED = "skipped_locked"
    SKIPPED_NOT_FOUND = "skipped_not_found"
    SKIPPED_ALREADY_TERMINAL = "skipped_already_terminal"


@dataclass(frozen=True)
class WorkerJobView:
    """Minimal job projection the pipeline runner needs — decoupled from the
    SQLAlchemy model so it can be satisfied by fakes in tests."""

    id: str
    status: str


class JobRepositoryProtocol(Protocol):
    def get(self, job_id: str) -> WorkerJobView | None: ...
    def mark_processing(self, job_id: str) -> None: ...
    def update_progress(self, job_id: str, percentage: int) -> None: ...
    def mark_completed(self, job_id: str) -> None: ...
    def mark_failed(self, job_id: str, *, error_message: str) -> None: ...
    def mark_cancelled(self, job_id: str) -> None: ...
    def is_cancelled(self, job_id: str) -> bool: ...


class JobLockProtocol(Protocol):
    def acquire(self, job_id: str) -> bool: ...
    def release(self, job_id: str) -> None: ...


class ProgressReporterProtocol(Protocol):
    def set_progress(
        self, job_id: str, *, stage: str, percentage: int, estimated_remaining_ms: int
    ) -> None: ...
    def clear(self, job_id: str) -> None: ...
    def get_progress(self, job_id: str) -> dict | None: ...


class DeadLetterSinkProtocol(Protocol):
    def record(self, *, job_id: str, error: str, retry_count: int) -> None: ...
