"""Dead-letter sink. Source: Sprint 1.3 brief > Reliability ("Dead-letter
failed jobs after retries.").

Recorded to Redis (a list, capped, inspectable) rather than a new table —
contracts/database.md has no dead-letter table, and `jobs.error_message` /
`jobs.status = failed` already persist the durable outcome via
WorkerJobRepository.mark_failed. This is the operational record of *why and
how many times* a job exhausted retries, for ops visibility.
"""

import json
import time

import redis

_DEAD_LETTER_KEY = "motionai:job-dead-letter"
_MAX_ENTRIES = 1000


class RedisDeadLetterSink:
    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client

    def record(self, *, job_id: str, error: str, retry_count: int) -> None:
        entry = {
            "job_id": job_id,
            "error": error,
            "retry_count": retry_count,
            "recorded_at": time.time(),
        }
        self._redis.lpush(_DEAD_LETTER_KEY, json.dumps(entry))
        self._redis.ltrim(_DEAD_LETTER_KEY, 0, _MAX_ENTRIES - 1)
