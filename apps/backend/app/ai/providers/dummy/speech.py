"""Dummy SpeechProvider. Source: Sprint 1.4 brief > Dummy Providers.

Returns a fixed, schema-valid Transcript regardless of input — no real
speech recognition, no AI API calls.
"""

import time

from app.ai.providers.stage_providers import ProviderOutput, SpeechProvider
from app.ai.types import ProviderUsage

DUMMY_MODEL_NAME = "dummy-speech-v1"


class DummySpeechProvider(SpeechProvider):
    async def transcribe(self, *, video_storage_path: str) -> ProviderOutput:
        start = time.monotonic()

        data = {
            "version": "1.0",
            "language": "en",
            "duration_ms": 4000,
            "words": [
                {"text": "This", "start_ms": 0, "end_ms": 300, "confidence": 0.99},
                {"text": "is", "start_ms": 300, "end_ms": 500, "confidence": 0.98},
                {"text": "a", "start_ms": 500, "end_ms": 600, "confidence": 0.97},
                {"text": "dummy", "start_ms": 600, "end_ms": 1100, "confidence": 0.99},
                {"text": "transcript.", "start_ms": 1100, "end_ms": 1800, "confidence": 0.96},
            ],
        }

        latency_ms = (time.monotonic() - start) * 1000
        usage = ProviderUsage(
            provider="dummy",
            model=DUMMY_MODEL_NAME,
            latency_ms=latency_ms,
            input_tokens=0,
            output_tokens=0,
            estimated_cost_usd=0.0,
        )
        return ProviderOutput(data=data, usage=usage)
