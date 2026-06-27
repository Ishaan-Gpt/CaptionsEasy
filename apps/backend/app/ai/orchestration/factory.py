"""Engine assembly. Source: Sprint 1.4 brief > Providers ("Provider
selection must come from configuration.").

The only place that knows how stages wire to providers and how provider
names are resolved from config — analogous in spirit to the pre-existing
app.ai.container, but driving the new StageRegistry/StageExecutor/Engine
instead of the fixed-chain PipelineOrchestrator.
"""

from app.ai.orchestration.engine import AIPipelineOrchestrationEngine
from app.ai.orchestration.metrics import InMemoryMetricsRecorder, MetricsRecorder
from app.ai.orchestration.stage import StageDefinition
from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.stage_registry import StageRegistry
from app.ai.orchestration.validators import (
    validate_caption_plan_business_rules,
    validate_creative_plan_business_rules,
    validate_render_plan_business_rules,
    validate_transcript_business_rules,
)
from app.ai.providers.dummy import register_dummy_providers
from app.ai.providers.speech import register_groq_speech_provider
from app.ai.providers.stage_provider_registry import (
    caption_provider_registry,
    creative_provider_registry,
    render_plan_provider_registry,
    speech_provider_registry,
)
from app.ai.providers.stage_providers import (
    CaptionProvider,
    CreativeProvider,
    RenderPlanProvider,
    SpeechProvider,
)
from app.ai.types import PipelineContext, PipelineStage
from packages.contracts.python import CaptionPlan, CreativePlan, RenderPlan, Transcript  # type: ignore[import-not-found]


def build_stage_registry(
    *,
    speech_provider: SpeechProvider,
    creative_provider: CreativeProvider,
    caption_provider: CaptionProvider,
    render_plan_provider: RenderPlanProvider,
) -> StageRegistry:
    registry = StageRegistry()

    async def run_speech(ctx: PipelineContext):
        video_storage_path = getattr(ctx.video, "storage_path", None) or ctx.config.get(
            "video_storage_path"
        )
        return await speech_provider.transcribe(video_storage_path=video_storage_path)

    async def run_creative(ctx: PipelineContext):
        transcript = ctx.stage_outputs[PipelineStage.TRANSCRIPT_VALIDATION]
        return await creative_provider.analyze(transcript=transcript)

    async def run_caption(ctx: PipelineContext):
        transcript = ctx.stage_outputs[PipelineStage.TRANSCRIPT_VALIDATION]
        creative_plan = ctx.stage_outputs[PipelineStage.CREATIVE_VALIDATION]
        return await caption_provider.plan(transcript=transcript, creative_plan=creative_plan)

    async def run_render(ctx: PipelineContext):
        transcript = ctx.stage_outputs[PipelineStage.TRANSCRIPT_VALIDATION]
        creative_plan = ctx.stage_outputs[PipelineStage.CREATIVE_VALIDATION]
        caption_plan = ctx.stage_outputs[PipelineStage.CAPTION_VALIDATION]
        return await render_plan_provider.plan(
            transcript=transcript,
            creative_plan=creative_plan,
            caption_plan=caption_plan,
            project_id=ctx.project_id,
            video_id=ctx.video_id,
        )

    registry.register(
        StageDefinition(
            stage=PipelineStage.SPEECH_RECOGNITION, output_model=Transcript, provider_call=run_speech
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.TRANSCRIPT_VALIDATION,
            output_model=Transcript,
            validator_call=validate_transcript_business_rules,
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.CREATIVE_ANALYSIS, output_model=CreativePlan, provider_call=run_creative
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.CREATIVE_VALIDATION,
            output_model=CreativePlan,
            validator_call=validate_creative_plan_business_rules,
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.CAPTION_PLANNING, output_model=CaptionPlan, provider_call=run_caption
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.CAPTION_VALIDATION,
            output_model=CaptionPlan,
            validator_call=validate_caption_plan_business_rules,
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.RENDER_PLANNING, output_model=RenderPlan, provider_call=run_render
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.RENDER_VALIDATION,
            output_model=RenderPlan,
            validator_call=validate_render_plan_business_rules,
        )
    )

    return registry


def build_default_engine(
    *,
    speech_provider_name: str = "dummy",
    creative_provider_name: str = "dummy",
    caption_provider_name: str = "dummy",
    render_plan_provider_name: str = "dummy",
    metrics_recorder: MetricsRecorder | None = None,
) -> tuple[AIPipelineOrchestrationEngine, MetricsRecorder]:
    """Resolves providers by name from the typed registries (never hardcoded
    here — see contracts/ai.md > Providers) and assembles the engine.
    Returns the recorder too, so callers can read metrics back out."""
    register_dummy_providers()  # idempotent; ensures "dummy" is always resolvable.
    register_groq_speech_provider()  # idempotent; ensures "groq" is resolvable.
    recorder = metrics_recorder or InMemoryMetricsRecorder()

    stage_registry = build_stage_registry(
        speech_provider=speech_provider_registry.create(speech_provider_name),
        creative_provider=creative_provider_registry.create(creative_provider_name),
        caption_provider=caption_provider_registry.create(caption_provider_name),
        render_plan_provider=render_plan_provider_registry.create(render_plan_provider_name),
    )
    executor = StageExecutor(metrics_recorder=recorder)
    engine = AIPipelineOrchestrationEngine(stage_registry=stage_registry, stage_executor=executor)
    return engine, recorder


def build_speech_only_engine(
    *,
    speech_provider_name: str = "dummy",
    metrics_recorder: MetricsRecorder | None = None,
) -> tuple[AIPipelineOrchestrationEngine, MetricsRecorder]:
    """Sprint 1.6: engine restricted to SPEECH_RECOGNITION + TRANSCRIPT_VALIDATION.

    Creative/caption/render planning are explicitly out of scope for this
    integration sprint (docs/ROADMAP.md Phases 7+) — `StageRegistry.ordered_stages()`
    only yields stages that were registered, so simply not registering the
    other six keeps the engine from running them, with no change to the
    full-pipeline `build_default_engine`/`build_stage_registry` above.
    """
    register_dummy_providers()
    register_groq_speech_provider()
    recorder = metrics_recorder or InMemoryMetricsRecorder()
    speech_provider = speech_provider_registry.create(speech_provider_name)

    async def run_speech(ctx: PipelineContext):
        video_storage_path = getattr(ctx.video, "storage_path", None) or ctx.config.get(
            "video_storage_path"
        )
        return await speech_provider.transcribe(video_storage_path=video_storage_path)

    registry = StageRegistry()
    registry.register(
        StageDefinition(
            stage=PipelineStage.SPEECH_RECOGNITION, output_model=Transcript, provider_call=run_speech
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.TRANSCRIPT_VALIDATION,
            output_model=Transcript,
            validator_call=validate_transcript_business_rules,
        )
    )

    executor = StageExecutor(metrics_recorder=recorder)
    engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)
    return engine, recorder
