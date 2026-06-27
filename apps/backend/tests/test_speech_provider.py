"""FireworksSpeechProvider tests. Source: Sprint 1.5 brief > Tests.

Covers: successful transcription, silent video, unsupported media, provider
timeout, invalid transcript, retry, schema validation. No real network calls
— httpx.MockTransport fakes the Fireworks HTTP endpoint.
"""

import uuid

import httpx
import pytest
from pydantic import ValidationError

from app.ai.orchestration.metrics import InMemoryMetricsRecorder
from app.ai.orchestration.stage import StageDefinition
from app.ai.orchestration.stage_executor import StageExecutor
from app.ai.orchestration.stage_registry import StageRegistry
from app.ai.orchestration.engine import AIPipelineOrchestrationEngine
from app.ai.providers.speech.audio_extractor import AudioExtractor, UnsupportedMediaTypeError
from app.ai.providers.speech.fireworks_speech_provider import FireworksSpeechProvider
from app.ai.types import PipelineContext, PipelineStage
from app.core.config import get_settings
from packages.contracts.python import Transcript


class FakeAudioExtractor(AudioExtractor):
    async def extract(self, *, video_bytes: bytes, content_type: str) -> bytes:
        return b"fake-audio-bytes"


def _settings():
    return get_settings().model_copy(
        update={"fireworks_api_key": "test-key", "fireworks_speech_model": "whisper-v3"}
    )


def _mock_transport(handler):
    return httpx.MockTransport(handler)


def _ctx() -> PipelineContext:
    return PipelineContext(
        project_id=str(uuid.uuid4()),
        video_id=str(uuid.uuid4()),
        job_id=str(uuid.uuid4()),
        config={"video_storage_path": "projects/p/videos/v.mp4"},
    )


async def _populated_storage_client(path: str = "projects/p/videos/v.mp4") -> object:
    from tests.conftest import FakeStorageClient

    client = FakeStorageClient()
    await client.upload(path=path, content=b"fake-video-bytes", content_type="video/mp4")
    return client


class TestSuccessfulTranscription:
    async def test_successful_transcription_maps_to_transcript_schema(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "language": "en",
                    "duration": 1.8,
                    "segments": [{"start": 0.0, "end": 1.8, "avg_logprob": -0.1}],
                    "words": [
                        {"word": "hello", "start": 0.0, "end": 0.5},
                        {"word": "world", "start": 0.6, "end": 1.2},
                    ],
                },
            )

        storage = await _populated_storage_client()
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        output = await provider.transcribe(video_storage_path="projects/p/videos/v.mp4")

        transcript = Transcript.model_validate(output.data)
        assert transcript.language == "en"
        assert transcript.duration_ms == 1800
        assert [w.text for w in transcript.words] == ["hello", "world"]
        assert all(0.0 <= w.confidence <= 1.0 for w in transcript.words)
        assert output.usage.provider == "fireworks"
        assert output.usage.model == "whisper-v3"
        assert output.usage.estimated_cost_usd is not None


class TestSilentVideo:
    async def test_silent_video_does_not_crash_provider_but_is_rejected_downstream(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200, json={"language": "en", "duration": 4.0, "segments": [], "words": []}
            )

        storage = await _populated_storage_client()
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        output = await provider.transcribe(video_storage_path="projects/p/videos/v.mp4")
        assert output.data["words"] == []

        with pytest.raises(ValidationError, match="at least one word"):
            Transcript.model_validate(output.data)


class TestUnsupportedMedia:
    async def test_unsupported_extension_is_rejected_before_any_network_call(self):
        storage = await _populated_storage_client(path="projects/p/videos/v.avi")
        provider = FireworksSpeechProvider(
            settings=_settings(), storage_client=storage, audio_extractor=FakeAudioExtractor()
        )

        with pytest.raises(UnsupportedMediaTypeError):
            await provider.transcribe(video_storage_path="projects/p/videos/v.avi")

    @pytest.mark.parametrize("path", ["v.mp4", "v.mov", "v.webm"])
    async def test_mp4_mov_webm_are_all_accepted(self, path):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "language": "en",
                    "duration": 0.5,
                    "segments": [{"start": 0.0, "end": 0.5, "avg_logprob": -0.05}],
                    "words": [{"word": "hi", "start": 0.0, "end": 0.5}],
                },
            )

        storage = await _populated_storage_client(path=f"projects/p/videos/{path}")
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        output = await provider.transcribe(video_storage_path=f"projects/p/videos/{path}")
        Transcript.model_validate(output.data)


class TestProviderTimeout:
    async def test_timeout_propagates_to_caller(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("Fireworks request timed out")

        storage = await _populated_storage_client()
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        with pytest.raises(httpx.TimeoutException):
            await provider.transcribe(video_storage_path="projects/p/videos/v.mp4")


class TestInvalidTranscript:
    def test_overlapping_timestamps_rejected(self):
        with pytest.raises(ValidationError, match="overlapping"):
            Transcript.model_validate(
                {
                    "version": "1.0",
                    "language": "en",
                    "duration_ms": 1000,
                    "words": [
                        {"text": "a", "start_ms": 0, "end_ms": 500, "confidence": 0.9},
                        {"text": "b", "start_ms": 200, "end_ms": 700, "confidence": 0.9},
                    ],
                }
            )

    def test_duplicate_words_rejected(self):
        with pytest.raises(ValidationError, match="duplicate"):
            Transcript.model_validate(
                {
                    "version": "1.0",
                    "language": "en",
                    "duration_ms": 1000,
                    "words": [
                        {"text": "a", "start_ms": 0, "end_ms": 500, "confidence": 0.9},
                        {"text": "a", "start_ms": 0, "end_ms": 500, "confidence": 0.9},
                    ],
                }
            )

    def test_negative_timestamps_rejected(self):
        with pytest.raises(ValidationError):
            Transcript.model_validate(
                {
                    "version": "1.0",
                    "language": "en",
                    "duration_ms": 1000,
                    "words": [{"text": "a", "start_ms": -1, "end_ms": 500, "confidence": 0.9}],
                }
            )

    def test_empty_transcript_rejected(self):
        with pytest.raises(ValidationError, match="at least one word"):
            Transcript.model_validate(
                {"version": "1.0", "language": "en", "duration_ms": 1000, "words": []}
            )

    def test_no_additional_fields_allowed(self):
        with pytest.raises(ValidationError):
            Transcript.model_validate(
                {
                    "version": "1.0",
                    "language": "en",
                    "duration_ms": 1000,
                    "extra_field": "nope",
                    "words": [{"text": "a", "start_ms": 0, "end_ms": 500, "confidence": 0.9}],
                }
            )


class TestRetry:
    async def test_provider_is_retried_once_then_succeeds(self):
        calls = {"count": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            calls["count"] += 1
            if calls["count"] == 1:
                raise httpx.TimeoutException("first call times out")
            return httpx.Response(
                200,
                json={
                    "language": "en",
                    "duration": 0.5,
                    "segments": [{"start": 0.0, "end": 0.5, "avg_logprob": -0.05}],
                    "words": [{"word": "hi", "start": 0.0, "end": 0.5}],
                },
            )

        storage = await _populated_storage_client()
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = StageRegistry()
        registry.register(
            StageDefinition(
                stage=PipelineStage.SPEECH_RECOGNITION,
                output_model=Transcript,
                provider_call=lambda ctx: provider.transcribe(
                    video_storage_path=ctx.config["video_storage_path"]
                ),
            )
        )
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is True
        assert calls["count"] == 2
        assert recorder.records[-1].retries == 1

    async def test_persistently_failing_provider_fails_after_one_retry(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("always times out")

        storage = await _populated_storage_client()
        provider = FireworksSpeechProvider(
            settings=_settings(),
            storage_client=storage,
            audio_extractor=FakeAudioExtractor(),
            http_client=httpx.AsyncClient(transport=_mock_transport(handler)),
        )

        recorder = InMemoryMetricsRecorder()
        executor = StageExecutor(metrics_recorder=recorder)
        registry = StageRegistry()
        registry.register(
            StageDefinition(
                stage=PipelineStage.SPEECH_RECOGNITION,
                output_model=Transcript,
                provider_call=lambda ctx: provider.transcribe(
                    video_storage_path=ctx.config["video_storage_path"]
                ),
            )
        )
        engine = AIPipelineOrchestrationEngine(stage_registry=registry, stage_executor=executor)

        outcome = await engine.run(_ctx())

        assert outcome.success is False
        assert outcome.failed_stage is PipelineStage.SPEECH_RECOGNITION


class TestRegistration:
    def test_fireworks_provider_is_registered_and_replaceable(self):
        from app.ai.providers.speech import FIREWORKS_PROVIDER_NAME, register_fireworks_speech_provider
        from app.ai.providers.stage_provider_registry import speech_provider_registry

        register_fireworks_speech_provider()
        assert FIREWORKS_PROVIDER_NAME in speech_provider_registry.available()
        provider = speech_provider_registry.create(FIREWORKS_PROVIDER_NAME)
        assert isinstance(provider, FireworksSpeechProvider)
