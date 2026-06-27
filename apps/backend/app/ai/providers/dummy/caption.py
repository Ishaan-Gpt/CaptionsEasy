"""Dummy CaptionProvider. Source: Sprint 1.4 brief > Dummy Providers.

Segments the transcript's words into one caption segment per word — purely
mechanical, no caption "optimization" (explicitly out of scope this sprint).
"""

import time

from app.ai.providers.stage_providers import CaptionProvider, ProviderOutput
from app.ai.types import ProviderUsage
from packages.contracts.python import CreativePlan, Transcript  # type: ignore[import-not-found]

DUMMY_MODEL_NAME = "dummy-caption-v1"


class DummyCaptionProvider(CaptionProvider):
    async def plan(self, *, transcript: Transcript, creative_plan: CreativePlan) -> ProviderOutput:
        start = time.monotonic()

        segments = [
            {
                "id": f"seg-{index}",
                "text": word.text,
                "start_ms": word.start_ms,
                "end_ms": word.end_ms,
                "emphasis": [],
                "confidence": word.confidence,
            }
            for index, word in enumerate(transcript.words)
        ]
        data = {"version": "1.0", "caption_segments": segments}

        latency_ms = (time.monotonic() - start) * 1000
        usage = ProviderUsage(
            provider="dummy",
            model=DUMMY_MODEL_NAME,
            latency_ms=latency_ms,
            input_tokens=len(transcript.words) * 2,
            output_tokens=len(segments) * 3,
            estimated_cost_usd=0.0,
        )
        return ProviderOutput(data=data, usage=usage)
