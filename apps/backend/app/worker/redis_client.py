"""Shared Redis connection. Source: Sprint 1.3 brief > Build (Redis)."""

import logging
import redis
import fakeredis

from app.core.config import Settings

logger = logging.getLogger("motionai.api")
_client: redis.Redis | None = None


def get_redis_client(settings: Settings) -> redis.Redis:
    global _client
    if _client is None:
        if settings.redis_url.startswith("memory://") or settings.redis_url.startswith("redis-mock://"):
            logger.warning("Using in-memory Fakeredis client (memory:// or redis-mock:// configured)")
            _client = fakeredis.FakeRedis(decode_responses=True)
        else:
            try:
                # Try to connect to real Redis client
                client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
                client.ping()
                _client = client
                logger.info("Successfully connected to real Redis server at %s", settings.redis_url)
            except Exception as exc:
                if settings.environment == "development":
                    logger.warning(
                        "Failed to connect to real Redis at %s: %s. Falling back to in-memory Fakeredis for development.",
                        settings.redis_url,
                        exc,
                    )
                    _client = fakeredis.FakeRedis(decode_responses=True)
                else:
                    raise exc
    return _client
