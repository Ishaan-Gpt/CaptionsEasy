"""Pipeline orchestration. Source: contracts/ai.md > Pipeline

Video -> Speech Recognition -> Transcript Validation -> Creative Analysis ->
Caption Planning -> Render Planning -> Validation -> Renderer.

The orchestrator sequences stages, applies retry + validation middleware,
and emits structured logs. It does not render, and it does not know about
any specific provider — those are resolved through injected services.
"""

import time
from collections.abc import Awaitable, Callable
from typing import Any

from app.ai.logging.structured import StageLogger
from app.ai.retry.policy import run_with_retry
from app.ai.services.base import (
    CaptionPlanningService,
    CreativeAnalysisService,
    RenderPlanningService,
    SpeechRecognitionService,
    TranscriptValidationService,
)
from app.ai.types import PipelineContext, PipelineStage, StageResult

from packages.contracts.python import RenderPlan  # type: ignore[import-not-found]


class PipelineOrchestrator:
    """Runs Stages 1-5 in order for a single video, returning the final
    RenderPlan. Each stage's service implementation is injected (see
    app.ai.container) rather than constructed here.
    """

    def __init__(
        self,
        *,
        speech_recognition: SpeechRecognitionService,
        transcript_validation: TranscriptValidationService,
        creative_analysis: CreativeAnalysisService,
        caption_planning: CaptionPlanningService,
        render_planning: RenderPlanningService,
    ) -> None:
        self._speech_recognition = speech_recognition
        self._transcript_validation = transcript_validation
        self._creative_analysis = creative_analysis
        self._caption_planning = caption_planning
        self._render_planning = render_planning

    async def run(self, ctx: PipelineContext, *, video_storage_path: str) -> RenderPlan:
        stage_logger = StageLogger(job_id=ctx.job_id, project_id=ctx.project_id)

        transcript = await self._run_stage(
            stage_logger,
            PipelineStage.SPEECH_RECOGNITION,
            lambda attempt: self._speech_recognition.recognize(
                ctx, video_storage_path=video_storage_path
            ),
        )

        validated_transcript = await self._run_stage(
            stage_logger,
            PipelineStage.TRANSCRIPT_VALIDATION,
            lambda attempt: self._transcript_validation.validate(ctx, transcript=transcript),
        )

        creative_plan = await self._run_stage(
            stage_logger,
            PipelineStage.CREATIVE_ANALYSIS,
            lambda attempt: self._creative_analysis.analyze(
                ctx, transcript=validated_transcript
            ),
        )

        caption_plan = await self._run_stage(
            stage_logger,
            PipelineStage.CAPTION_PLANNING,
            lambda attempt: self._caption_planning.plan(
                ctx, transcript=validated_transcript, creative_plan=creative_plan
            ),
        )

        render_plan = await self._run_stage(
            stage_logger,
            PipelineStage.RENDER_PLANNING,
            lambda attempt: self._render_planning.plan(
                ctx,
                transcript=validated_transcript,
                creative_plan=creative_plan,
                caption_plan=caption_plan,
            ),
        )

        return render_plan

    @staticmethod
    async def _run_stage(
        stage_logger: StageLogger,
        stage: PipelineStage,
        call: Callable[[int], Awaitable[StageResult[Any]]],
    ) -> Any:
        async def attempt_fn(attempt: int):
            start = time.monotonic()
            result: StageResult = await call(attempt)
            elapsed_ms = (time.monotonic() - start) * 1000
            stage_logger.log_success(
                stage=stage,
                usage=result.usage,
                attempt=attempt,
                repaired=result.repaired,
            )
            # `elapsed_ms` is measured around the call for defense-in-depth;
            # the authoritative latency is whatever the provider reports in
            # `result.usage.latency_ms` per contracts/ai.md > Logging.
            del elapsed_ms
            return result.data

        try:
            return await run_with_retry(stage=stage, logger=stage_logger, fn=attempt_fn)
        except Exception as exc:  # noqa: BLE001 - final failure is logged then re-raised
            stage_logger.log_failure(stage=stage, error=exc, attempt=-1)
            raise
