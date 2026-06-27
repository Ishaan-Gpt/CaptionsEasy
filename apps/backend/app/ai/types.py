"""Shared types for the AI pipeline. Source: contracts/ai.md

No prompt text, no provider-specific code, no rendering logic.
"""

import enum
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar


class PipelineStage(str, enum.Enum):
    """contracts/ai.md > Pipeline"""

    SPEECH_RECOGNITION = "speech_recognition"
    TRANSCRIPT_VALIDATION = "transcript_validation"
    CREATIVE_ANALYSIS = "creative_analysis"
    CAPTION_PLANNING = "caption_planning"
    RENDER_PLANNING = "render_planning"


T = TypeVar("T")


@dataclass(frozen=True)
class ProviderUsage:
    """contracts/ai.md > Logging — per-call usage facts a provider must report."""

    provider: str
    model: str
    latency_ms: float
    tokens: int | None = None
    estimated_cost_usd: float | None = None


@dataclass(frozen=True)
class StageResult(Generic[T]):
    """Result of running a single pipeline stage."""

    stage: PipelineStage
    data: T
    usage: ProviderUsage
    repaired: bool = False
    attempt: int = 1


class StageFailure(Exception):
    """Raised when a stage exhausts retries/repair and the job must be marked failed."""

    def __init__(self, stage: PipelineStage, reason: str, *, cause: Exception | None = None):
        self.stage = stage
        self.reason = reason
        self.cause = cause
        super().__init__(f"[{stage.value}] {reason}")


@dataclass
class PipelineContext:
    """Carries state across stages. Populated incrementally as stages run."""

    project_id: str
    video_id: str
    job_id: str
    extra: dict[str, Any] = field(default_factory=dict)
