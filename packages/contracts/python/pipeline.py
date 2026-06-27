"""Transcript / CreativePlan / CaptionPlan Pydantic models. Source: contracts/json-schemas.md"""

import enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CaptionStyle(str, enum.Enum):
    """Per docs/PRD.md Caption Generation styles."""

    FORMAL = "formal"
    SARCASTIC = "sarcastic"
    HUMOROUS_TECH = "humorous_tech"
    HUMOROUS_NON_TECH = "humorous_non_tech"


class TranscriptWord(StrictModel):
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    confidence: float = Field(ge=0, le=1)


class Transcript(StrictModel):
    version: Literal["1.0"] = "1.0"
    language: str
    duration_ms: int = Field(ge=0)
    words: list[TranscriptWord]

    @model_validator(mode="after")
    def _check_words(self) -> "Transcript":
        # Sprint 1.5 brief > Validation: "Reject overlapping timestamps,
        # negative timestamps, duplicate words, empty transcripts." Negative
        # timestamps are already rejected by TranscriptWord's Field(ge=0);
        # the rest are structural checks across the whole word list.
        if not self.words:
            raise ValueError("Transcript must contain at least one word")
        previous: TranscriptWord | None = None
        for word in self.words:
            if word.end_ms < word.start_ms:
                raise ValueError(f"word end_ms before start_ms: {word!r}")
            if previous is not None:
                if word.start_ms == previous.start_ms and word.end_ms == previous.end_ms:
                    raise ValueError(f"duplicate word timestamps: {word!r}")
                if word.start_ms < previous.end_ms:
                    raise ValueError(f"overlapping word timestamps: {previous!r} / {word!r}")
            previous = word
        return self


class EnergyCurvePoint(StrictModel):
    t_ms: int = Field(ge=0)
    energy: float = Field(ge=0, le=1)



class KeyMoment(StrictModel):
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    label: str


class CreativePlan(StrictModel):
    version: Literal["1.0"] = "1.0"
    speaking_style: str
    emotion: str
    pacing: str
    energy_curve: list[EnergyCurvePoint]
    audience: str
    key_moments: list[KeyMoment]
    recommended_style: CaptionStyle

    # Sprint 2 added fields:
    speaking_pace: str | None = None
    emotional_progression: str | None = None
    hook_quality: str | None = None
    strongest_moments: list[str] | None = None
    audience_engagement_score: float | None = Field(default=None, ge=0, le=10)
    audience_type: str | None = None
    tone: str | None = None
    storytelling_structure: str | None = None
    key_highlights: list[str] | None = None
    emphasis_suggestions: list[str] | None = None
    pause_opportunities: list[int] | None = None
    filler_word_analysis: str | None = None
    viral_worthy_moments: list[str] | None = None
    cta_detection: str | None = None

    @model_validator(mode="after")
    def _check_key_moments(self) -> "CreativePlan":
        for moment in self.key_moments:
            if moment.end_ms < moment.start_ms:
                raise ValueError(f"Key moment end_ms before start_ms: {moment!r}")
        return self


class CaptionSegment(StrictModel):
    id: str
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    # TODO(json-schemas.md): shape not specified beyond its name; assumed
    # word-index positions within `text`.
    emphasis: list[int]
    confidence: float = Field(ge=0, le=1)

    # Sprint 2 added fields:
    speaker_id: str | None = None
    emoji_suggestions: list[str] | None = None
    keywords: list[str] | None = None


class CaptionPlan(StrictModel):
    version: Literal["1.0"] = "1.0"
    caption_segments: list[CaptionSegment]

    @model_validator(mode="after")
    def _check_caption_segments(self) -> "CaptionPlan":
        if not self.caption_segments:
            return self
        previous: CaptionSegment | None = None
        for segment in self.caption_segments:
            if segment.end_ms < segment.start_ms:
                raise ValueError(f"Caption segment end_ms before start_ms: {segment!r}")
            
            # Line break and length validation
            lines = segment.text.split("\n")
            if len(lines) > 2:
                raise ValueError(f"Caption segment text must contain at most 2 lines: {segment.text!r}")
            for line in lines:
                if len(line) > 40:
                    raise ValueError(f"Caption segment line exceeds max length of 40 characters: {line!r}")
            
            if previous is not None:
                if segment.start_ms < previous.start_ms:
                    raise ValueError(f"Caption segments are not sorted chronologically: {previous!r} / {segment!r}")
                if segment.start_ms < previous.end_ms:
                    raise ValueError(f"Overlapping caption segments detected: {previous!r} / {segment!r}")
            previous = segment
        return self
