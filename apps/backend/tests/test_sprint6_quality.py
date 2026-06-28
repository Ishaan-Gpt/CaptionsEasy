import pytest
import uuid
from app.ai.providers.dummy.render_plan import (
    DummyRenderPlanProvider,
    should_prevent_split,
    group_words,
)
from packages.contracts.python.pipeline import (
    Transcript,
    TranscriptWord,
    CreativePlan,
    CaptionPlan,
    CaptionSegment,
    CaptionStyle,
    EnergyCurvePoint,
    KeyMoment,
)


def test_split_prevention_heuristics():
    # Names (both capitalized)
    assert should_prevent_split("Elon", "Musk") is True
    # Numbers
    assert should_prevent_split("100", "dollars") is True
    assert should_prevent_split("page", "10") is True
    # Abbreviations
    assert should_prevent_split("SaaS", "platform") is True
    # Dates
    assert should_prevent_split("June", "27") is True
    assert should_prevent_split("2026", "year") is True
    
    # Normal splits allowed
    assert should_prevent_split("the", "video") is False


def test_word_grouping_mitigates_single_word_lines():
    # 5 words: if limit is 2, standard split is [2, 2, 1]
    # Our algorithm must merge the last dangling word to prevent single-word lines!
    word_timings = [
        ("this", 0, 100),
        ("is", 100, 200),
        ("a", 200, 300),
        ("great", 300, 400),
        ("clip", 400, 500)
    ]
    groups = group_words(word_timings, word_limit=2)
    # Expected: [["this", "is"], ["a", "great", "clip"]] (merged last word)
    assert len(groups) == 2
    assert [item[0] for item in groups[0]] == ["this", "is"]
    assert [item[0] for item in groups[1]] == ["a", "great", "clip"]


@pytest.mark.asyncio
async def test_quality_render_plan_computes_metrics_and_hooks():
    provider = DummyRenderPlanProvider()
    transcript = Transcript(
        language="en",
        duration_ms=5000,
        words=[
            TranscriptWord(text="Elon", start_ms=0, end_ms=200, confidence=1.0),
            TranscriptWord(text="Musk", start_ms=200, end_ms=400, confidence=1.0),
            TranscriptWord(text="presented", start_ms=400, end_ms=800, confidence=1.0),
            TranscriptWord(text="AI", start_ms=800, end_ms=1000, confidence=1.0),
            TranscriptWord(text="subscribe", start_ms=1000, end_ms=1400, confidence=1.0),
            TranscriptWord(text="now!", start_ms=1400, end_ms=1800, confidence=1.0),
        ]
    )
    
    # Excitement emotion
    creative_plan = CreativePlan(
        speaking_style="energetic",
        emotion="excited",
        pacing="fast",
        energy_curve=[EnergyCurvePoint(t_ms=0, energy=0.9)],
        audience="shorts",
        key_moments=[KeyMoment(start_ms=0, end_ms=1800, label="intro")],
        recommended_style=CaptionStyle.FORMAL,
    )
    caption_plan = CaptionPlan(
        version="1.0",
        caption_segments=[
            CaptionSegment(id="1", text="Elon Musk presented AI", start_ms=0, end_ms=1000, emphasis=[], confidence=1.0),
            CaptionSegment(id="2", text="subscribe now!", start_ms=1000, end_ms=1800, emphasis=[], confidence=1.0)
        ]
    )

    plan = await provider.plan(
        transcript=transcript,
        creative_plan=creative_plan,
        caption_plan=caption_plan,
        project_id=str(uuid.uuid4()),
        video_id=str(uuid.uuid4()),
        style="modern"
    )
    motion_script = plan.data
    
    # 1. Quality evaluation presence
    metadata = motion_script["metadata"]
    assert "quality_evaluation" in metadata
    quality = metadata["quality_evaluation"]
    assert quality["overall_quality_score"] > 0
    assert quality["debug_metrics"]["style_applied"] == "modern"
    
    # 2. Hook and CTA detection
    # "Elon Musk" is at start_ms = 0 (first 4s / first segment), so it is a hook event
    first_event = motion_script["timeline"][0]
    assert first_event["payload"]["text"].startswith("ELON MUSK")
    assert first_event["payload"]["animation"] == "bounce"
    
    # "subscribe now!" is a CTA event
    caption_events = [e for e in motion_script["timeline"] if e["type"] == "caption"]
    last_event = caption_events[-1]
    assert "SUBSCRIBE" in last_event["payload"]["text"]
    assert last_event["payload"]["color"] == "#00FF00"
