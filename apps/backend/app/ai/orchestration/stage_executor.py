"""Stage Executor. Source: Sprint 1.4 brief > Build (Stage Executor),
Validation, Observability.

Runs a single StageDefinition:
- provider stages: call the provider -> validate the raw JSON against
  `output_model` (app.ai.validation.middleware.validate_with_repair, already
  existing infra, reused unmodified) -> on failure, retry the *provider*
  exactly once and validate again -> if still invalid, raise StageFailure.
  "No invalid JSON may continue downstream" (Sprint 1.4 brief > Validation).
- validator stages: call the deterministic business-rule function directly
  (no provider, no JSON-schema step — its input is already a validated
  Pydantic model from the prior provider stage).

Every attempt is recorded via MetricsRecorder and logged via the existing
StageLogger (app.ai.logging.structured) — no new logging shape invented.
"""

from dataclasses import replace

from app.ai.logging.structured import StageLogger
from app.ai.orchestration.metrics import MetricsRecorder, StageMetric
from app.ai.orchestration.stage import StageDefinition
from app.ai.types import PipelineContext, ProviderUsage, StageFailure
from app.ai.validation.middleware import RepairFn, validate_with_repair

DETERMINISTIC_PROVIDER_NAME = "deterministic"
DETERMINISTIC_MODEL_NAME = "business-rules"

# "Attempt structured repair once" (Sprint 1.4 brief > Validation) — this
# sprint implements no provider-specific/LLM-based repair (explicitly out of
# scope: "Do NOT implement provider-specific prompts"), so the default
# repair is a no-op. It still occupies the one mandated repair attempt;
# tests inject a real repair_fn to exercise the "repair succeeds" path.
async def identity_repair_fn(raw: dict, error: Exception) -> dict:  # noqa: ARG001
    return raw


class StageExecutor:
    def __init__(
        self,
        *,
        metrics_recorder: MetricsRecorder,
        repair_fn: RepairFn | None = None,
    ) -> None:
        self._metrics = metrics_recorder
        self._repair_fn = repair_fn or identity_repair_fn

    async def execute(self, definition: StageDefinition, ctx: PipelineContext):
        stage_logger = StageLogger(job_id=ctx.job_id, project_id=ctx.project_id)
        if definition.is_provider_stage:
            return await self._execute_provider_stage(definition, ctx, stage_logger)
        return await self._execute_validator_stage(definition, ctx, stage_logger)

    async def _execute_validator_stage(self, definition: StageDefinition, ctx, stage_logger):
        usage = ProviderUsage(
            provider=DETERMINISTIC_PROVIDER_NAME,
            model=DETERMINISTIC_MODEL_NAME,
            latency_ms=0.0,
        )
        try:
            result = definition.validator_call(ctx.previous_output)
        except Exception as exc:  # noqa: BLE001 - any validator failure stops the pipeline
            self._record(ctx.job_id, definition.stage, usage, success=False)
            stage_logger.log_failure(stage=definition.stage, error=exc, attempt=1)
            raise StageFailure(definition.stage, f"Business validation failed: {exc}", cause=exc) from exc

        self._record(
            ctx.job_id,
            definition.stage,
            usage,
            success=True,
            video_id=ctx.video_id,
            language=getattr(result, "language", None),
            duration_ms=getattr(result, "duration_ms", None),
        )
        stage_logger.log_success(stage=definition.stage, usage=usage, attempt=1, repaired=False)
        return result

    async def _execute_provider_stage(self, definition: StageDefinition, ctx, stage_logger):
        last_error: Exception | None = None
        last_usage: ProviderUsage | None = None

        for attempt in (1, 2):  # initial call + "retry provider once"
            try:
                output = await definition.provider_call(ctx)
            except Exception as exc:  # noqa: BLE001 - provider call itself failed
                last_error = exc
                stage_logger.log_retry(stage=definition.stage, attempt=attempt, error=exc)
                continue

            try:
                validated, repaired = await validate_with_repair(
                    stage=definition.stage,
                    raw=output.data,
                    model=definition.output_model,
                    repair_fn=self._repair_fn,
                )
            except StageFailure as exc:
                last_error = exc
                last_usage = output.usage
                stage_logger.log_retry(stage=definition.stage, attempt=attempt, error=exc)
                continue

            usage = replace(output.usage, retries=attempt - 1)
            self._record(
                ctx.job_id,
                definition.stage,
                usage,
                success=True,
                video_id=ctx.video_id,
                language=getattr(validated, "language", None),
                duration_ms=getattr(validated, "duration_ms", None),
            )
            stage_logger.log_success(
                stage=definition.stage, usage=usage, attempt=attempt, repaired=repaired
            )
            return validated

        final_usage = (
            replace(last_usage, retries=1)
            if last_usage is not None
            else ProviderUsage(provider="unknown", model="unknown", latency_ms=0.0, retries=1)
        )
        self._record(ctx.job_id, definition.stage, final_usage, success=False)
        stage_logger.log_failure(stage=definition.stage, error=last_error, attempt=2)
        raise StageFailure(
            definition.stage,
            "Provider output failed validation after repair and one retry",
            cause=last_error,
        )

    def _record(
        self,
        job_id,
        stage,
        usage: ProviderUsage,
        *,
        success: bool,
        video_id: str | None = None,
        language: str | None = None,
        duration_ms: int | None = None,
    ) -> None:
        self._metrics.record(
            StageMetric.from_usage(
                job_id=job_id,
                stage=stage,
                usage=usage,
                success=success,
                video_id=video_id,
                language=language,
                duration_ms=duration_ms,
            )
        )
