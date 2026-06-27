"""Transcript / CreativePlan / CaptionPlan Pydantic models. Source: contracts/json-schemas.md"""

import enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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


class CaptionSegment(StrictModel):
    id: str
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    # TODO(json-schemas.md): shape not specified beyond its name; assumed
    # word-index positions within `text`.
    emphasis: list[int]
    confidence: float = Field(ge=0, le=1)


class CaptionPlan(StrictModel):
    version: Literal["1.0"] = "1.0"
    caption_segments: list[CaptionSegment]
