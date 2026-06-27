"""Dummy CreativeProvider. Source: Sprint 1.4 brief > Dummy Providers."""

import time

from app.ai.providers.stage_providers import CreativeProvider, ProviderOutput
from app.ai.types import ProviderUsage
from packages.contracts.python import Transcript  # type: ignore[import-not-found]

DUMMY_MODEL_NAME = "dummy-creative-v1"


class DummyCreativeProvider(CreativeProvider):
    async def analyze(self, *, transcript: Transcript) -> ProviderOutput:
        start = time.monotonic()

        data = {
            "version": "1.0",
            "speaking_style": "conversational",
            "emotion": "neutral",
            "pacing": "medium",
            "energy_curve": [
                {"t_ms": 0, "energy": 0.5},
                {"t_ms": transcript.duration_ms, "energy": 0.5},
            ],
            "audience": "general",
            "key_moments": [],
            "recommended_style": "formal",
        }

        latency_ms = (time.monotonic() - start) * 1000
        usage = ProviderUsage(
            provider="dummy",
            model=DUMMY_MODEL_NAME,
            latency_ms=latency_ms,
            input_tokens=len(transcript.words) * 2,
            output_tokens=24,
            estimated_cost_usd=0.0,
        )
        return ProviderOutput(data=data, usage=usage)
