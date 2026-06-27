"""Shared Redis connection. Source: Sprint 1.3 brief > Build (Redis)."""

import redis

from app.core.config import Settings

_client: redis.Redis | None = None


def get_redis_client(settings: Settings) -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _client
