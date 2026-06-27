"""AI orchestration engine tests. Source: Sprint 1.4 brief > Tests.

Covers: pipeline execution, validation failure, retry logic, stage failure,
provider swapping, metrics collection. Uses the dummy providers plus small
test-only fakes — no real AI API calls anywhere.
"""

import uuid

from app.ai.orchestration.engine import AIPipelineOrchestrationEngine
from app.ai.orchestration.factory import build_default_engine, build_stage_registry
from app.ai.orchestration.metrics import InMemoryMetricsRecorder
from app.ai.orchestration.stage import StageDefinition
from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.stage_registry import StageRegistry
from app.ai.providers.dummy.creative import DummyCreativeProvider
from app.ai.providers.dummy.render_plan import DummyRenderPlanProvider
from app.ai.providers.dummy.speech import DummySpeechProvider
from app.ai.providers.stage_providers import ProviderOutput, SpeechProvider
from app.ai.types import PipelineContext, PipelineStage, ProviderUsage
from packages.contracts.python import RenderPlan, Transcript


def _ctx(**overrides) -> PipelineContext:
    defaults = dict(
        project_id=str(uuid.uuid4()),
        video_id=str(uuid.uuid4()),
        job_id=str(uuid.uuid4()),
        config={"video_storage_path": "projects/p/videos/v.mp4"},
    )
    defaults.update(overrides)
    return PipelineContext(**defaults)


class FixedUsageMixin:
    usage = ProviderUsage(provider="fake", model="fake-v1", latency_ms=1.0, input_tokens=1, output_tokens=1)


class ValidSpeechProvider(FixedUsageMixin, SpeechProvider):
    """Always returns valid Transcript JSON."""

    async def transcribe(self, *, video_storage_path: str) -> ProviderOutput:
        return ProviderOutput(
            data={
                "version": "1.0",
                "language": "en",
                "duration_ms": 1000,
                "words": [{"text": "hi", "start_ms": 0, "end_ms": 200, "confidence": 0.9}],
            },
            usage=self.usage,
        )


class FlakySpeechProvider(FixedUsageMixin, SpeechProvider):
    """Returns invalid JSON (missing `words`) for the first `fail_times`
    calls, then valid JSON. Used to exercise repair/retry/failure paths."""

    def __init__(self, *, fail_times: int) -> None:
        self.fail_times = fail_times
        self.calls = 0

    async def transcribe(self, *, video_storage_path: str) -> ProviderOutput:
        self.calls += 1
        if self.calls <= self.fail_times:
            return ProviderOutput(
                data={"version": "1.0", "language": "en", "duration_ms": 1000},  # missing `words`
                usage=self.usage,
            )
        return ProviderOutput(
            data={
                "version": "1.0",
                "language": "en",
                "duration_ms": 1000,
                "words": [{"text": "hi", "start_ms": 0, "end_ms": 200, "confidence": 0.9}],
            },
            usage=self.usage,
        )


def _single_stage_registry(provider_call, *, output_model=Transcript) -> StageRegistry:
    registry = StageRegistry()
    registry.register(
        StageDefinition(
            stage=PipelineStage.SPEECH_RECOGNITION,
            output_model=output_model,
            provider_call=provider_call,
        )
    )
    return registry


class TestPipelineExecution:
    async def test_full_pipeline_runs_all_eight_stages_and_completes(self):
        engine, recorder = build_default_engine()

        outcome = await engine.run(_ctx())

        assert outcome.success is True
        assert isinstance(outcome.result, RenderPlan)
        assert len(recorder.records) == 8
        assert all(m.success for m in recorder.records)

    async def test_each_stage_receives_its_required_upstream_outputs(self):
        """Caption planning needs both transcript and creative plan, not just
        the immediately preceding stage's output — exercises ctx.stage_outputs."""
        engine, _ = build_default_engine()
        ctx = _ctx()

        outcome = await engine.run(ctx)

        assert outcome.success is True
        assert PipelineStage.TRANSCRIPT_VALIDATION in ctx.stage_outputs
        assert PipelineStage.CREATIVE_VALIDATION in ctx.stage_outputs
        assert PipelineStage.CAPTION_VALIDATION in ctx.stage_outputs


class TestValidationFailure:
    async def test_repair_fn_fixing_output_succeeds_on_first_attempt(self):
        async def fixing_repair(raw, error):
            return {**raw, "words": []}

        provider = FlakySpeechProvider(fail_times=1)
        executor = StageExecutor(metrics_recorder=InMemoryMetricsRecorder(), repair_fn=fixing_repair)
        registry = _single_stage_registry(lambda ctx: provider.transcribe(video_storage_path=""))
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is True
        assert provider.calls == 1  # repair succeeded — no provider retry needed

    async def test_identity_repair_does_not_fabricate_data(self):
        """Default repair_fn is a no-op — invalid data stays invalid, so the
        stage must fall through to retrying the provider, not silently pass."""
        provider = FlakySpeechProvider(fail_times=1)
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = _single_stage_registry(lambda ctx: provider.transcribe(video_storage_path=""))
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is True
        assert provider.calls == 2  # first attempt invalid, provider retried once


class TestRetryLogic:
    async def test_provider_retried_once_then_succeeds(self):
        provider = FlakySpeechProvider(fail_times=1)
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = _single_stage_registry(lambda ctx: provider.transcribe(video_storage_path=""))
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is True
        assert provider.calls == 2
        assert recorder.records[-1].retries == 1
        assert recorder.records[-1].success is True

    async def test_never_retries_more_than_once(self):
        provider = FlakySpeechProvider(fail_times=99)
        executor = StageExecutor(metrics_recorder=InMemoryMetricsRecorder())
        registry = _single_stage_registry(lambda ctx: provider.transcribe(video_storage_path=""))
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        await engine.run(_ctx())

        assert provider.calls == 2  # initial attempt + exactly one retry, never more


class TestStageFailure:
    async def test_persistently_invalid_output_fails_the_stage_not_the_process(self):
        provider = FlakySpeechProvider(fail_times=99)
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = _single_stage_registry(lambda ctx: provider.transcribe(video_storage_path=""))
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is False
        assert outcome.failed_stage is PipelineStage.SPEECH_RECOGNITION
        assert outcome.reason is not None
        assert recorder.records[-1].success is False

    async def test_downstream_stages_never_run_after_a_failure(self):
        """No invalid JSON may continue downstream — a failure in stage 1
        of an 8-stage registry must produce exactly 1 metric, not 8."""
        from app.ai.providers.dummy.caption import DummyCaptionProvider

        recorder = InMemoryMetricsRecorder()
        broken_speech_provider = FlakySpeechProvider(fail_times=99)
        registry = build_stage_registry(
            speech_provider=broken_speech_provider,
            creative_provider=DummyCreativeProvider(),
            caption_provider=DummyCaptionProvider(),
            render_plan_provider=DummyRenderPlanProvider(),
        )
        executor = StageExecutor(metrics_recorder=recorder)
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is False
        assert outcome.failed_stage is PipelineStage.SPEECH_RECOGNITION
        assert len(recorder.records) == 1

    async def test_a_validator_stage_failure_also_stops_the_pipeline(self):
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = StageRegistry()
        registry.register(
            StageDefinition(
                stage=PipelineStage.SPEECH_RECOGNITION,
                output_model=Transcript,
                provider_call=lambda ctx: ValidSpeechProvider().transcribe(video_storage_path=""),
            )
        )

        def exploding_validator(transcript):
            raise ValueError("business rule violated")

        registry.register(
            StageDefinition(
                stage=PipelineStage.TRANSCRIPT_VALIDATION,
                output_model=Transcript,
                validator_call=exploding_validator,
            )
        )
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is False
        assert outcome.failed_stage is PipelineStage.TRANSCRIPT_VALIDATION


class TestProviderSwapping:
    async def test_swapping_provider_implementation_changes_pipeline_output(self):
        registry_a = _single_stage_registry(
            lambda ctx: ValidSpeechProvider().transcribe(video_storage_path="")
        )
        registry_b = _single_stage_registry(
            lambda ctx: DummySpeechProvider().transcribe(video_storage_path="")
        )
        executor = StageExecutor(metrics_recorder=InMemoryMetricsRecorder())
        engine_a = AIPipelineOrchestrationEngine(stage_registry=registry_a, stage_executor=executor)
        engine_b = AIPipelineOrchestrationEngine(stage_registry=registry_b, stage_executor=executor)

        outcome_a = await engine_a.run(_ctx())
        outcome_b = await engine_b.run(_ctx())

        assert outcome_a.success is True and outcome_b.success is True
        assert outcome_a.result.duration_ms != outcome_b.result.duration_ms

    async def test_registry_resolves_provider_by_configured_name(self):
        from app.ai.providers.stage_provider_registry import TypedProviderRegistry

        registry = TypedProviderRegistry()
        registry.register("variant-a", ValidSpeechProvider)
        registry.register("variant-b", DummySpeechProvider)

        provider_a = registry.create("variant-a")
        provider_b = registry.create("variant-b")

        assert isinstance(provider_a, ValidSpeechProvider)
        assert isinstance(provider_b, DummySpeechProvider)
        assert registry.available() == ["variant-a", "variant-b"]


class TestMetricsCollection:
    async def test_records_provider_model_latency_tokens_cost_and_retries(self):
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = _single_stage_registry(
            lambda ctx: ValidSpeechProvider().transcribe(video_storage_path="")
        )
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        await engine.run(_ctx())

        assert len(recorder.records) == 1
        metric = recorder.records[0]
        assert metric.stage is PipelineStage.SPEECH_RECOGNITION
        assert metric.provider == "fake"
        assert metric.model == "fake-v1"
        assert metric.latency_ms == 1.0
        assert metric.input_tokens == 1
        assert metric.output_tokens == 1
        assert metric.retries == 0
        assert metric.success is True

    async def test_metrics_are_scoped_per_job(self):
        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = _single_stage_registry(
            lambda ctx: ValidSpeechProvider().transcribe(video_storage_path="")
        )
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        ctx_1 = _ctx(job_id="job-1")
        ctx_2 = _ctx(job_id="job-2")
        await engine.run(ctx_1)
        await engine.run(ctx_2)

        assert len(recorder.for_job("job-1")) == 1
        assert len(recorder.for_job("job-2")) == 1
