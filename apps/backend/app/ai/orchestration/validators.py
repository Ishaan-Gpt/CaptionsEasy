"""Business-rule validation stages. Source: contracts/ai.md > Stage 2,
Sprint 1.4 brief > Architecture (the *_VALIDATION stages).

These run after a provider stage has already passed JSON-schema validation
(app.ai.orchestration.stage_executor) — they check domain rules schema
validation can't express. They never call a provider (deterministic code
only) and never mutate wording/content beyond what contracts/ai.md
explicitly allows.

contracts/ai.md only specifies extra business rules for the transcript
("remove empty words, merge duplicate timestamps, validate chronology,
reject invalid transcript. Never modify wording."). No equivalent rules are
defined for CreativePlan/CaptionPlan/RenderPlan beyond their JSON Schemas,
so those three validators are intentionally pass-through — inventing rules
the contracts don't specify would violate ai-context/SHARED_CONTEXT.md
("Never invent business rules").
"""

from packages.contracts.python import CaptionPlan, CreativePlan, RenderPlan, Transcript  # type: ignore[import-not-found]
from packages.contracts.python.pipeline import TranscriptWord  # type: ignore[import-not-found]


class TranscriptValidationError(ValueError):
    pass


def validate_transcript_business_rules(transcript: Transcript) -> Transcript:
    """contracts/ai.md > Stage 2 responsibilities:
    - Remove empty words.
    - Merge duplicate timestamps.
    - Validate chronology.
    - Reject invalid transcript.
    Never modifies `text` wording — only filters/merges entries and their
    timing metadata.
    """
    words = [w for w in transcript.words if w.text.strip()]

    merged: list[TranscriptWord] = []
    for word in words:
        if merged and merged[-1].start_ms == word.start_ms and merged[-1].end_ms == word.end_ms:
            merged[-1] = word  # duplicate timestamp: keep the latest entry
        else:
            merged.append(word)

    for previous, current in zip(merged, merged[1:]):
        if current.start_ms < previous.start_ms:
            raise TranscriptValidationError(
                "Transcript is not chronological: "
                f"'{current.text}' starts before '{previous.text}'."
            )

    return transcript.model_copy(update={"words": merged})


def validate_creative_plan_business_rules(creative_plan: CreativePlan) -> CreativePlan:
    """Pass-through — see module docstring."""
    return creative_plan


def validate_caption_plan_business_rules(caption_plan: CaptionPlan) -> CaptionPlan:
    """Pass-through — see module docstring."""
    return caption_plan


def validate_render_plan_business_rules(render_plan: RenderPlan) -> RenderPlan:
    """Pass-through — see module docstring."""
    return render_plan
