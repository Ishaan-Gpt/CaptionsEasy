"""Dummy RenderPlanProvider. Source: Sprint 1.4 brief > Dummy Providers.

Builds a minimal, schema-valid RenderPlan: one caption timeline event per
caption segment, fixed global settings. No typography/animation "choice"
logic beyond a fixed default — that's deliberately out of scope here.
"""

import time
from datetime import datetime, timezone

from app.ai.providers.stage_providers import ProviderOutput, RenderPlanProvider
from app.ai.types import ProviderUsage
from packages.contracts.python import CaptionPlan, CreativePlan, Transcript  # type: ignore[import-not-found]

DUMMY_MODEL_NAME = "dummy-render-plan-v1"


class DummyRenderPlanProvider(RenderPlanProvider):
    async def plan(
        self,
        *,
        transcript: Transcript,
        creative_plan: CreativePlan,
        caption_plan: CaptionPlan,
        project_id: str,
        video_id: str,
    ) -> ProviderOutput:
        start = time.monotonic()

        timeline = [
            {
                "id": f"evt-{segment.id}",
                "start_ms": segment.start_ms,
                "end_ms": segment.end_ms,
                "layer": "captions",
                "type": "caption",
                "payload": {
                    "text": segment.text,
                    "font": "Inter",
                    "size": 48,
                    "weight": "700",
                    "color": "#FFFFFF",
                    "alignment": "center",
                    "animation": "fade",
                },
            }
            for segment in caption_plan.caption_segments
        ]

        data = {
            "metadata": {
                "version": "1.0",
                "project_id": project_id,
                "video_id": video_id,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generator_version": DUMMY_MODEL_NAME,
            },
            "assets": [],
            "global_settings": {
                "canvas": {"width": 1080, "height": 1920},
                "frame_rate": 30,
                "resolution": "1080x1920",
                "aspect_ratio": "9:16",
                "safe_area": {"top": 80, "bottom": 80, "left": 40, "right": 40},
                "theme": "dark",
                "default_font": "Inter",
                "default_colors": ["#FFFFFF"],
                "motion_preset": "minimal",
            },
            "timeline": timeline,
        }

        latency_ms = (time.monotonic() - start) * 1000
        usage = ProviderUsage(
            provider="dummy",
            model=DUMMY_MODEL_NAME,
            latency_ms=latency_ms,
            input_tokens=len(caption_plan.caption_segments) * 4,
            output_tokens=len(timeline) * 5,
            estimated_cost_usd=0.0,
        )
        return ProviderOutput(data=data, usage=usage)
