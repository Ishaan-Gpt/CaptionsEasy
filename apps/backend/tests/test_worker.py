"""Worker pipeline tests. Source: Sprint 1.3 brief > Tests.

Calls app.worker.pipeline.run_job_pipeline directly with fakes — no Celery
broker, no Redis, no Postgres required (mirrors the fake-repository pattern
already used in tests/conftest.py for the async API layer).
"""

import threading
import time

import pytest

from app.worker.logging import WorkerLogger
from app.worker.pipeline import run_job_pipeline
from app.worker.stages import Stage
from app.worker.types import JobOutcome, WorkerJobView


class FakeWorkerJobRepository:
    def __init__(self, *, status: str = "queued") -> None:
        self.status = status
        self.progress = 0
        self.error_message: str | None = None
        self.calls: list[str] = []
        self.cancel_after_stage: int | None = None
        self._stage_count = 0

    def get(self, job_id: str) -> WorkerJobView | None:
        return WorkerJobView(id=job_id, status=self.status)

    def mark_processing(self, job_id: str) -> None:
        self.status = "processing"
        self.calls.append("mark_processing")

    def update_progress(self, job_id: str, percentage: int) -> None:
        self.progress = percentage
        self.calls.append(f"progress:{percentage}")

    def mark_completed(self, job_id: str) -> None:
        self.status = "completed"
        self.calls.append("mark_completed")

    def mark_failed(self, job_id: str, *, error_message: str) -> None:
        self.status = "failed"
        self.error_message = error_message
        self.calls.append("mark_failed")

    def mark_cancelled(self, job_id: str) -> None:
        self.status = "cancelled"
        self.calls.append("mark_cancelled")

    def is_cancelled(self, job_id: str) -> bool:
        self._stage_count += 1
        return self.cancel_after_stage is not None and self._stage_count > self.cancel_after_stage


class FakeJobLock:
    """Shared across "workers" via a class-level dict + lock to simulate
    concurrent acquisition attempts for the same job_id (mirrors Redis SET
    NX semantics: first acquirer wins, others are rejected)."""

    _held: dict[str, str] = {}
    _guard = threading.Lock()

    def __init__(self, worker_name: str = "worker") -> None:
        self.worker_name = worker_name

    def acquire(self, job_id: str) -> bool:
        with self._guard:
            if job_id in self._held:
                return False
            self._held[job_id] = self.worker_name
            return True

    def release(self, job_id: str) -> None:
        with self._guard:
            if self._held.get(job_id) == self.worker_name:
                del self._held[job_id]


class FakeProgressReporter:
    def __init__(self) -> None:
        self.updates: list[dict] = []
        self.cleared = False

    def set_progress(self, job_id, *, stage, percentage, estimated_remaining_ms):
        self.updates.append(
            {"stage": stage, "percentage": percentage, "estimated_remaining_ms": estimated_remaining_ms}
        )

    def clear(self, job_id):
        self.cleared = True

    def get_progress(self, job_id):
        return self.updates[-1] if self.updates else None


class FakeDeadLetterSink:
    def __init__(self) -> None:
        self.entries: list[dict] = []

    def record(self, *, job_id, error, retry_count):
        self.entries.append({"job_id": job_id, "error": error, "retry_count": retry_count})


def _stages(*, fail_times: int = 0) -> list[Stage]:
    state = {"calls": 0}

    def maybe_fail():
        state["calls"] += 1
        if state["calls"] <= fail_times:
            raise RuntimeError("dummy stage failure")

    return [
        Stage("Extract Video Metadata", maybe_fail),
        Stage("Extract Audio", lambda: None),
        Stage("Prepare Workspace", lambda: None),
    ]


@pytest.fixture(autouse=True)
def _reset_lock_state():
    FakeJobLock._held.clear()
    yield
    FakeJobLock._held.clear()


def _run(*, job_id="job-1", retry_count=0, max_retries=2, repo=None, lock=None, stages=None):
    repo = repo or FakeWorkerJobRepository()
    lock = lock or FakeJobLock()
    progress = FakeProgressReporter()
    dead_letter = FakeDeadLetterSink()
    stages = stages if stages is not None else _stages()

    outcome = run_job_pipeline(
        job_id=job_id,
        retry_count=retry_count,
        max_retries=max_retries,
        stages=stages,
        repo=repo,
        lock=lock,
        progress=progress,
        dead_letter=dead_letter,
        logger=WorkerLogger(),
    )
    return outcome, repo, lock, progress, dead_letter


class TestWorkerLifecycle:
    def test_happy_path_runs_all_stages_and_completes(self):
        outcome, repo, lock, progress, _ = _run()

        assert outcome is JobOutcome.COMPLETED
        assert repo.status == "completed"
        assert repo.progress == 100
        assert repo.calls[0] == "mark_processing"
        assert repo.calls[-1] == "mark_completed"
        assert len(progress.updates) == 3
        assert progress.updates[-1]["percentage"] == 100
        assert progress.cleared is True

    def test_skips_job_not_found(self):
        repo = FakeWorkerJobRepository()
        repo.get = lambda job_id: None  # type: ignore[method-assign]
        outcome, *_ = _run(repo=repo)
        assert outcome is JobOutcome.SKIPPED_NOT_FOUND

    def test_skips_already_terminal_job(self):
        repo = FakeWorkerJobRepository(status="completed")
        outcome, *_ = _run(repo=repo)
        assert outcome is JobOutcome.SKIPPED_ALREADY_TERMINAL
        assert "mark_processing" not in repo.calls


class TestRetryLogic:
    def test_failure_under_max_retries_returns_retry_without_marking_failed(self):
        outcome, repo, *_ = _run(retry_count=0, max_retries=2, stages=_stages(fail_times=1))
        assert outcome is JobOutcome.RETRY
        assert repo.status != "failed"

    def test_failure_at_max_retries_dead_letters(self):
        outcome, repo, _, _, dead_letter = _run(
            retry_count=2, max_retries=2, stages=_stages(fail_times=99)
        )
        assert outcome is JobOutcome.DEAD_LETTERED
        assert repo.status == "failed"
        assert repo.error_message
        assert len(dead_letter.entries) == 1
        assert dead_letter.entries[0]["retry_count"] == 2


class TestCancellation:
    def test_cancelled_mid_pipeline_stops_remaining_stages(self):
        repo = FakeWorkerJobRepository()
        repo.cancel_after_stage = 1  # cancelled is observed before stage 2 runs
        stage_calls: list[str] = []
        stages = [
            Stage("Extract Video Metadata", lambda: stage_calls.append("a")),
            Stage("Extract Audio", lambda: stage_calls.append("b")),
            Stage("Prepare Workspace", lambda: stage_calls.append("c")),
        ]

        outcome, repo, _, progress, _ = _run(repo=repo, stages=stages)

        assert outcome is JobOutcome.CANCELLED
        assert repo.status == "cancelled"
        assert stage_calls == ["a"]  # only the first stage ran before cancellation was observed
        assert progress.cleared is True


class TestJobLocking:
    def test_second_acquire_for_same_job_is_rejected(self):
        lock_a = FakeJobLock("worker-a")
        lock_b = FakeJobLock("worker-b")

        assert lock_a.acquire("job-1") is True
        assert lock_b.acquire("job-1") is False

        lock_a.release("job-1")
        assert lock_b.acquire("job-1") is True

    def test_concurrent_workers_only_one_processes_the_job(self):
        """Two real threads race to acquire the same job's lock at the same
        time. Exactly one must run the pipeline to completion; the other
        must observe the lock held and skip — never both running."""
        repo = FakeWorkerJobRepository()
        slow_stage_started = threading.Event()
        release_slow_stage = threading.Event()

        def slow_first_stage():
            slow_stage_started.set()
            release_slow_stage.wait(timeout=2)

        stages = [
            Stage("Extract Video Metadata", slow_first_stage),
            Stage("Extract Audio", lambda: None),
            Stage("Prepare Workspace", lambda: None),
        ]

        outcomes: dict[str, JobOutcome] = {}

        def worker(name: str, stages_for_worker):
            outcome, *_ = _run(repo=repo, lock=FakeJobLock(name), stages=stages_for_worker)
            outcomes[name] = outcome

        thread_a = threading.Thread(target=worker, args=("worker-a", stages))
        thread_a.start()
        assert slow_stage_started.wait(timeout=2), "worker-a never started its slow stage"

        # worker-a now holds the lock mid-pipeline; worker-b races in now.
        thread_b = threading.Thread(target=worker, args=("worker-b", _stages()))
        thread_b.start()
        thread_b.join(timeout=2)

        release_slow_stage.set()
        thread_a.join(timeout=2)

        assert outcomes["worker-b"] is JobOutcome.SKIPPED_LOCKED
        assert outcomes["worker-a"] is JobOutcome.COMPLETED
