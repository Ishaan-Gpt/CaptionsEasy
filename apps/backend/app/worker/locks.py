"""Job locking. Source: Sprint 1.3 brief > Reliability ("Job locking. No
duplicate execution.").

Uses Redis SET NX EX with a per-acquisition token so a worker can only
release the lock it itself holds (a stale TTL'd lock re-acquired by another
worker is never accidentally released by the first).
"""

import uuid

import redis

_LOCK_KEY_PREFIX = "motionai:job-lock:"

_RELEASE_IF_OWNER_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class RedisJobLock:
    def __init__(self, redis_client: redis.Redis, *, ttl_seconds: int) -> None:
        self._redis = redis_client
        self._ttl_seconds = ttl_seconds
        self._tokens: dict[str, str] = {}

    def acquire(self, job_id: str) -> bool:
        token = str(uuid.uuid4())
        acquired = self._redis.set(
            _LOCK_KEY_PREFIX + job_id, token, nx=True, ex=self._ttl_seconds
        )
        if acquired:
            self._tokens[job_id] = token
        return bool(acquired)

    def release(self, job_id: str) -> None:
        token = self._tokens.pop(job_id, None)
        if token is None:
            return
        key = _LOCK_KEY_PREFIX + job_id
        try:
            self._redis.eval(_RELEASE_IF_OWNER_SCRIPT, 1, key, token)
        except redis.exceptions.ResponseError:
            # fakeredis (used for REDIS_URL=memory:// local dev, see
            # app.worker.redis_client) doesn't implement EVAL/Lua scripting —
            # fall back to a non-atomic check-then-delete. This only
            # matters for the single-process dev setup this fallback
            # targets; a real Redis in production always takes the atomic
            # path above. Uncaught here, this raised out of the pipeline's
            # `finally: lock.release(...)` (app.worker.pipeline), which
            # made Celery report every otherwise-successful job as failed
            # and left its lock un-released for the full TTL.
            if self._redis.get(key) == token:
                self._redis.delete(key)
