"""AI Pipeline Orchestrator. Source: Sprint 1.4 brief > Build (AI Pipeline
Orchestrator), Architecture, Failure Recovery.

Sequences whatever stages the injected StageRegistry has registered, in
ORDERED_STAGES order, feeding each stage's output forward as the next
stage's `ctx.previous_output`. "No stage may directly call another
provider" — only this engine decides what runs next; stages/providers never
reference each other.

Failure Recovery: a failing stage does not raise out of `run()` and crash
the caller — it's caught, logged (already done inside StageExecutor) and
returned as a `PipelineOutcome.failed(...)`, so a future caller (e.g. the
Celery worker) can mark the job failed/dead-lettered the same way Sprint
1.3's worker pipeline does, without this engine needing to know about jobs
or workers at all.
"""

from dataclasses import dataclass
from typing import Any

from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.stage_registry import StageRegistry
from app.ai.types import PipelineContext, PipelineStage, StageFailure


@dataclass(frozen=True)
class PipelineOutcome:
    success: bool
    result: Any | None = None
    failed_stage: PipelineStage | None = None
    reason: str | None = None

    @classmethod
    def completed(cls, result: Any) -> "PipelineOutcome":
        return cls(success=True, result=result)

    @classmethod
    def failed(cls, stage: PipelineStage, reason: str) -> "PipelineOutcome":
        return cls(success=False, failed_stage=stage, reason=reason)


class AIPipelineOrchestrationEngine:
    def __init__(self, *, stage_registry: StageRegistry, stage_executor: StageExecutor) -> None:
        self._stage_registry = stage_registry
        self._stage_executor = stage_executor

    async def run(self, ctx: PipelineContext) -> PipelineOutcome:
        stages = self._stage_registry.ordered_stages()

        for definition in stages:
            try:
                output = await self._stage_executor.execute(definition, ctx)
            except StageFailure as exc:
                return PipelineOutcome.failed(exc.stage, exc.reason)

            ctx.previous_output = output
            ctx.stage_outputs[definition.stage] = output

        return PipelineOutcome.completed(ctx.previous_output)
