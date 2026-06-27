"""Retry framework. Source: contracts/ai.md > Retry Policy

"Retry maximum 2 times. Then fail."

Generic — has no knowledge of providers, stages content, or prompts.
"""

from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.ai.logging.structured import StageLogger
from app.ai.types import PipelineStage, StageFailure

MAX_RETRIES = 2

T = TypeVar("T")


async def run_with_retry(
    *,
    stage: PipelineStage,
    logger: StageLogger,
    fn: Callable[[int], Awaitable[T]],
) -> T:
    """Invoke `fn(attempt)` where attempt starts at 1. Retries up to
    MAX_RETRIES additional times on exception, then raises StageFailure.
    """
    last_exc: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 2):  # initial try + 2 retries
        try:
            return await fn(attempt)
        except Exception as exc:  # noqa: BLE001 - any stage exception is retryable here
            last_exc = exc
            logger.log_retry(stage=stage, attempt=attempt, error=exc)

    raise StageFailure(
        stage,
        f"Exhausted retries ({MAX_RETRIES} retries) after initial attempt",
        cause=last_exc,
    )
