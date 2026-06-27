"""Dummy RenderPlanProvider. Source: Sprint 1.4 brief > Dummy Providers.

Builds a minimal, schema-valid RenderPlan: one caption timeline event per
caption segment, fixed global settings. No typography/animation "choice"
logic beyond a fixed default — that's deliberately out of scope here.
"""

import time
from datetime import datetime, timezone
from typing import Optional

from app.ai.providers.stage_providers import ProviderOutput, RenderPlanProvider
from app.ai.types import ProviderUsage
from app.render.presets import StylePresetManager
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
        style: Optional[str] = None,
    ) -> ProviderOutput:
        start = time.monotonic()

        # Load chosen style preset
        preset = StylePresetManager.get_preset(style)

        timeline = []
        event_counter = 1

        for segment in caption_plan.caption_segments:
            words = segment.text.split()
            word_limit = preset.timing.word_limit

            # Group words by the word limit
            word_groups = []
            for i in range(0, len(words), word_limit):
                word_groups.append(" ".join(words[i:i+word_limit]))

            if not word_groups:
                continue

            total_duration = segment.end_ms - segment.start_ms
            group_duration = total_duration // len(word_groups)

            for index, group_text in enumerate(word_groups):
                g_start = segment.start_ms + index * group_duration
                g_end = g_start + group_duration - preset.timing.caption_spacing_ms
                if g_end <= g_start:
                    g_end = g_start + 1

                # Append emoji suggestion if requested by style preset and exists
                emoji_suffix = ""
                if preset.emoji.behavior != "none" and segment.emoji_suggestions:
                    if preset.emoji.behavior == "frequent" or (preset.emoji.behavior == "occasional" and index == 0):
                        emoji_suffix = " " + " ".join(segment.emoji_suggestions[:1])

                # Highlights coloring logic
                color = preset.typography.color
                if preset.highlight.colors and segment.emphasis:
                    color = preset.highlight.colors[0]

                timeline.append({
                    "id": f"evt-{event_counter}",
                    "start_ms": g_start,
                    "end_ms": g_end,
                    "layer": "captions",
                    "type": "caption",
                    "payload": {
                        "text": group_text + emoji_suffix,
                        "font": preset.typography.font,
                        "size": preset.typography.size,
                        "weight": preset.typography.weight,
                        "color": color,
                        "alignment": preset.typography.alignment,
                        "animation": preset.animation.caption_animation,
                    },
                })
                event_counter += 1

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
                "frame_rate": 30.0,
                "resolution": "1080x1920",
                "aspect_ratio": "9:16",
                "safe_area": {
                    "top": preset.safe_area.top,
                    "bottom": preset.safe_area.bottom,
                    "left": preset.safe_area.left,
                    "right": preset.safe_area.right,
                },
                "theme": preset.name.lower(),
                "default_font": preset.typography.font,
                "default_colors": preset.highlight.colors,
                "motion_preset": preset.animation.motion_preset,
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
