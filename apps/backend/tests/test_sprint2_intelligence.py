import uuid
import pytest
from pydantic import ValidationError

from app.ai.prompts import load_prompt
from app.ai.providers.stage_provider_registry import (
    creative_provider_registry,
    caption_provider_registry,
)
from app.ai.orchestration.metrics import InMemoryMetricsRecorder
from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.stage import StageDefinition
from app.ai.types import PipelineContext, PipelineStage, ProviderUsage, StageFailure
from app.ai.providers.stage_providers import ProviderOutput
from packages.contracts.python import (
    CreativePlan,
    CaptionPlan,
    CaptionSegment,
    Transcript,
    CaptionStyle,
    validate_creative_plan,
    validate_caption_plan,
)

# Mock models/data for validation checks
MOCK_TRANSCRIPT_DATA = {
    "version": "1.0",
    "language": "en",
    "duration_ms": 5000,
    "words": [
        {"text": "Hello", "start_ms": 0, "end_ms": 500, "confidence": 0.9},
        {"text": "world", "start_ms": 600, "end_ms": 1000, "confidence": 0.95},
    ],
}

MOCK_CREATIVE_PLAN_DATA = {
    "version": "1.0",
    "speaking_style": "energetic",
    "emotion": "excited",
    "pacing": "fast",
    "energy_curve": [{"t_ms": 0, "energy": 0.9}],
    "audience": "creators",
    "key_moments": [{"start_ms": 0, "end_ms": 1000, "label": "Hook"}],
    "recommended_style": "formal",
    "speaking_pace": "150 wpm",
    "hook_quality": "excellent",
    "strongest_moments": ["Hello world"],
    "audience_engagement_score": 9.2,
    "tone": "excited",
}

MOCK_CAPTION_PLAN_DATA = {
    "version": "1.0",
    "caption_segments": [
        {
            "id": "seg-0",
            "text": "Hello world",
            "start_ms": 0,
            "end_ms": 1000,
            "emphasis": [0],
            "confidence": 0.95,
        }
    ],
}


def test_prompt_loading():
    # Verify we can load the creative_analysis and caption_planning prompts
    creative_prompt = load_prompt("creative_analysis")
    caption_prompt = load_prompt("caption_planning")
    assert "{transcript_json}" in creative_prompt
    assert "{creative_plan_json}" in caption_prompt


def test_creative_plan_validation():
    # Valid creative plan passes
    plan = validate_creative_plan(MOCK_CREATIVE_PLAN_DATA)
    assert plan.speaking_style == "energetic"
    assert plan.audience_engagement_score == 9.2

    # Invalid timestamp ordering in key moment fails
    invalid_data = dict(MOCK_CREATIVE_PLAN_DATA)
    invalid_data["key_moments"] = [{"start_ms": 500, "end_ms": 100, "label": "Invalid"}]
    with pytest.raises(ValidationError):
        validate_creative_plan(invalid_data)


def test_caption_plan_validation():
    # Valid caption plan passes
    plan = validate_caption_plan(MOCK_CAPTION_PLAN_DATA)
    assert len(plan.caption_segments) == 1

    # Overlapping segment timestamps fail
    invalid_overlap = {
        "version": "1.0",
        "caption_segments": [
            {
                "id": "seg-0",
                "text": "First",
                "start_ms": 0,
                "end_ms": 1000,
                "emphasis": [],
                "confidence": 0.9,
            },
            {
                "id": "seg-1",
                "text": "Second",
                "start_ms": 500,
                "end_ms": 1500,
                "emphasis": [],
                "confidence": 0.9,
            },
        ],
    }
    with pytest.raises(ValidationError):
        validate_caption_plan(invalid_overlap)

    # Max line break rules fail (more than 2 lines)
    invalid_lines = {
        "version": "1.0",
        "caption_segments": [
            {
                "id": "seg-0",
                "text": "Line one\nLine two\nLine three",
                "start_ms": 0,
                "end_ms": 1000,
                "emphasis": [],
                "confidence": 0.9,
            }
        ],
    }
    with pytest.raises(ValidationError):
        validate_caption_plan(invalid_lines)

    # Line character limit fails (> 40 characters)
    invalid_length = {
        "version": "1.0",
        "caption_segments": [
            {
                "id": "seg-0",
                "text": "This line is extremely long and definitely has more than forty characters",
                "start_ms": 0,
                "end_ms": 1000,
                "emphasis": [],
                "confidence": 0.9,
            }
        ],
    }
    with pytest.raises(ValidationError):
        validate_caption_plan(invalid_length)


def test_provider_registry():
    # Register registries to make sure they are populated
    from app.ai.providers.dummy import register_dummy_providers
    from app.ai.providers.creative import register_groq_creative_provider
    from app.ai.providers.caption import register_groq_caption_provider

    register_dummy_providers()
    register_groq_creative_provider()
    register_groq_caption_provider()

    assert "dummy" in creative_provider_registry.available()
    assert "dummy" in caption_provider_registry.available()
    assert "groq" in creative_provider_registry.available()
    assert "groq" in caption_provider_registry.available()


@pytest.mark.asyncio
async def test_repair_and_metrics():
    # Set up flaky provider that returns invalid data first, then repair function fixes it
    recorder = InMemoryMetricsRecorder()

    async def flaky_creative(ctx: PipelineContext):
        return ProviderOutput(
            data={"version": "1.0", "invalid_field": "corrupted"},
            usage=ProviderUsage(provider="test-provider", model="test-model", latency_ms=10.0),
        )

    async def repair_fn(raw: dict, error: ValidationError) -> dict:
        return MOCK_CREATIVE_PLAN_DATA

    executor = StageExecutor(metrics_recorder=recorder, repair_fn=repair_fn)
    definition = StageDefinition(
        stage=PipelineStage.CREATIVE_ANALYSIS,
        output_model=CreativePlan,
        provider_call=flaky_creative,
    )
    
    ctx = PipelineContext(project_id="p-1", video_id="v-1", job_id="j-1")
    validated = await executor.execute(definition, ctx)
    assert validated.speaking_style == "energetic"
    
    # Verify metrics capture repair count and validation failure
    records = recorder.records
    assert len(records) == 1
    metric = records[0]
    assert metric.repair_count == 1
    assert metric.validation_failures == 1
    assert metric.success is True


class FakeCreativePlanRepository:
    def __init__(self) -> None:
        self.plans = []

    async def create(self, *, project_id, creative_plan_json):
        plan = {"project_id": project_id, "creative_plan": creative_plan_json}
        self.plans.append(plan)
        return plan

    async def get_latest_for_project(self, project_id):
        matches = [p for p in self.plans if p["project_id"] == project_id]
        return matches[-1] if matches else None


class FakeCaptionPlanRepository:
    def __init__(self) -> None:
        self.plans = []

    async def create(self, *, project_id, caption_json):
        plan = {"project_id": project_id, "caption_json": caption_json}
        self.plans.append(plan)
        return plan

    async def get_latest_for_project(self, project_id):
        matches = [p for p in self.plans if p["project_id"] == project_id]
        return matches[-1] if matches else None


@pytest.mark.asyncio
async def test_repositories():
    project_id = uuid.uuid4()
    creative_repo = FakeCreativePlanRepository()
    caption_repo = FakeCaptionPlanRepository()

    # Create & retrieve creative plan
    await creative_repo.create(project_id=project_id, creative_plan_json=MOCK_CREATIVE_PLAN_DATA)
    fetched_creative = await creative_repo.get_latest_for_project(project_id)
    assert fetched_creative is not None
    assert fetched_creative["creative_plan"]["speaking_style"] == "energetic"

    # Create & retrieve caption plan
    await caption_repo.create(project_id=project_id, caption_json=MOCK_CAPTION_PLAN_DATA)
    fetched_caption = await caption_repo.get_latest_for_project(project_id)
    assert fetched_caption is not None
    assert fetched_caption["caption_json"]["caption_segments"][0]["text"] == "Hello world"
