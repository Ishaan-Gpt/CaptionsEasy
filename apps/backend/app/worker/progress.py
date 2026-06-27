"""Live progress reporting. Source: Sprint 1.3 brief > Progress.

"Every stage updates percentage, current_stage, estimated_remaining."

This is ephemeral (Redis, TTL'd) rather than a new `jobs` table column —
contracts/database.md does not define a stage/estimated_remaining column,
and the brief's "do not invent" rule (ai-context/SHARED_CONTEXT.md) applies
to schema as much as to APIs. Durable lifecycle (status/progress) is still
persisted via app.worker.job_repository.WorkerJobRepository; this only
carries the high-frequency, disposable "what's happening right now" view
that contracts/json-schemas.md's JobStatus schema (stage,
estimated_remaining_ms) describes as a response DTO, not a stored table.
"""

import json

import redis

_PROGRESS_KEY_PREFIX = "motionai:job-progress:"


class RedisProgressReporter:
    def __init__(self, redis_client: redis.Redis, *, ttl_seconds: int) -> None:
        self._redis = redis_client
        self._ttl_seconds = ttl_seconds

    def set_progress(
        self, job_id: str, *, stage: str, percentage: int, estimated_remaining_ms: int
    ) -> None:
        payload = {
            "stage": stage,
            "percentage": percentage,
            "estimated_remaining_ms": estimated_remaining_ms,
        }
        self._redis.set(
            _PROGRESS_KEY_PREFIX + job_id, json.dumps(payload), ex=self._ttl_seconds
        )

    def clear(self, job_id: str) -> None:
        self._redis.delete(_PROGRESS_KEY_PREFIX + job_id)

    def get_progress(self, job_id: str) -> dict | None:
        raw = self._redis.get(_PROGRESS_KEY_PREFIX + job_id)
        return json.loads(raw) if raw else None
