"""Transcript persistence wiring tests. Source: Sprint 1.5 brief > Storage.

"Persist Transcript. Associate with Video. Store provider metadata. Store
processing metrics." Uses a fake repository — no real DB, matching this
project's existing test conventions (tests/conftest.py's Fake*Repository
fixtures).
"""

import uuid

import pytest

from app.ai.orchestration.engine import AIPipelineOrchestrationEngine
from app.ai.orchestration.metrics import InMemoryMetricsRecorder
from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.transcript_persistence import persist_transcript_if_present
from app.ai.providers.dummy.speech import DummySpeechProvider
from app.ai.orchestration.stage import StageDefinition
from app.ai.orchestration.stage_registry import StageRegistry
from app.ai.orchestration.validators import validate_transcript_business_rules
from app.ai.types import PipelineContext, PipelineStage
from packages.contracts.python import Transcript

pytestmark = pytest.mark.asyncio


class FakeTranscriptRepository:
    def __init__(self) -> None:
        self.created: list[dict] = []

    async def create(self, *, project_id, language, provider, version, transcript_json):
        record = {
            "project_id": project_id,
            "language": language,
            "provider": provider,
            "version": version,
            "transcript_json": transcript_json,
        }
        self.created.append(record)
        return record


def _registry() -> StageRegistry:
    registry = StageRegistry()
    speech_provider = DummySpeechProvider()
    registry.register(
        StageDefinition(
            stage=PipelineStage.SPEECH_RECOGNITION,
            output_model=Transcript,
            provider_call=lambda ctx: speech_provider.transcribe(video_storage_path=""),
        )
    )
    registry.register(
        StageDefinition(
            stage=PipelineStage.TRANSCRIPT_VALIDATION,
            output_model=Transcript,
            validator_call=validate_transcript_business_rules,
        )
    )
    return registry


async def test_persist_transcript_if_present_persists_after_validation():
    project_id = uuid.uuid4()
    ctx = PipelineContext(
        project_id=str(project_id),
        video_id=str(uuid.uuid4()),
        job_id=str(uuid.uuid4()),
        config={"speech_provider_name": "dummy"},
    )
    executor = StageExecutor(metrics_recorder=InMemoryMetricsRecorder())
    engine = AIPipelineOrchestrationEngine(stage_registry=_registry(), stage_executor=executor)

    outcome = await engine.run(ctx)
    assert outcome.success is True

    repository = FakeTranscriptRepository()
    persisted = await persist_transcript_if_present(ctx, repository)

    assert persisted is not None
    assert len(repository.created) == 1
    record = repository.created[0]
    assert record["project_id"] == project_id
    assert record["provider"] == "dummy"
    assert record["transcript_json"]["language"] == "en"


async def test_persist_transcript_if_present_returns_none_when_stage_never_ran():
    ctx = PipelineContext(project_id=str(uuid.uuid4()), video_id=str(uuid.uuid4()), job_id=str(uuid.uuid4()))
    repository = FakeTranscriptRepository()

    result = await persist_transcript_if_present(ctx, repository)

    assert result is None
    assert repository.created == []
