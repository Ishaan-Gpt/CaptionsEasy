"""Structured logging for the AI pipeline. Source: contracts/ai.md > Logging

"Every stage records: latency, tokens, estimated cost, provider, model,
success, failure."

This wraps the standard `logging` module with a fixed, structured shape — it
does not decide *what* to log beyond what the contract requires.
"""

import logging
from typing import Any

from app.ai.types import PipelineStage, ProviderUsage

logger = logging.getLogger("motionai.ai_pipeline")


class StageLogger:
    """Emits one structured log record per pipeline event.

    Wraps `app.ai.types.PipelineContext` identifiers (job_id, project_id) so
    every log line is correlatable, per AI_CONTEXT.md > Logging / Error
    Handling (correlation id requirement).
    """

    def __init__(self, *, job_id: str, project_id: str) -> None:
        self._job_id = job_id
        self._project_id = project_id

    def _base_fields(self, stage: PipelineStage) -> dict[str, Any]:
        return {
            "job_id": self._job_id,
            "project_id": self._project_id,
            "stage": stage.value,
        }

    def log_success(
        self,
        *,
        stage: PipelineStage,
        usage: ProviderUsage,
        attempt: int,
        repaired: bool,
    ) -> None:
        logger.info(
            "ai_stage_success",
            extra={
                **self._base_fields(stage),
                "provider": usage.provider,
                "model": usage.model,
                "latency_ms": usage.latency_ms,
                "tokens": usage.tokens,
                "estimated_cost_usd": usage.estimated_cost_usd,
                "attempt": attempt,
                "repaired": repaired,
                "success": True,
            },
        )

    def log_failure(self, *, stage: PipelineStage, error: Exception, attempt: int) -> None:
        logger.error(
            "ai_stage_failure stage=%s job_id=%s attempt=%s error_type=%s error=%s",
            stage.value,
            self._job_id,
            attempt,
            type(error).__name__,
            error,
        )

    def log_retry(self, *, stage: PipelineStage, attempt: int, error: Exception) -> None:
        logger.warning(
            "ai_stage_retry stage=%s job_id=%s attempt=%s error_type=%s error=%s",
            stage.value,
            self._job_id,
            attempt,
            type(error).__name__,
            error,
        )
