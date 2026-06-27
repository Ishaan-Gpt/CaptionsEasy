"""Shared types for the AI pipeline. Source: contracts/ai.md

No prompt text, no provider-specific code, no rendering logic.
"""

import enum
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar


class PipelineStage(str, enum.Enum):
    """contracts/ai.md > Pipeline

    Sprint 1.4 (AI Orchestration Engine) extends the pipeline diagram with an
    explicit validation stage after every provider stage, not just after
    speech recognition — CREATIVE_VALIDATION/CAPTION_VALIDATION/
    RENDER_VALIDATION are additive members alongside the original five.
    """

    SPEECH_RECOGNITION = "speech_recognition"
    TRANSCRIPT_VALIDATION = "transcript_validation"
    CREATIVE_ANALYSIS = "creative_analysis"
    CREATIVE_VALIDATION = "creative_validation"
    CAPTION_PLANNING = "caption_planning"
    CAPTION_VALIDATION = "caption_validation"
    RENDER_PLANNING = "render_planning"
    RENDER_VALIDATION = "render_validation"


T = TypeVar("T")


@dataclass(frozen=True)
class ProviderUsage:
    """contracts/ai.md > Logging — per-call usage facts a provider must report.

    `input_tokens`/`output_tokens`/`retries` are additive (Sprint 1.4
    Observability: input_tokens, output_tokens, retries). `tokens` is kept
    for backward compatibility with existing callers that report a single
    aggregate figure.
    """

    provider: str
    model: str
    latency_ms: float
    tokens: int | None = None
    estimated_cost_usd: float | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    retries: int = 0


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
    """Carries state across stages. Populated incrementally as stages run.

    Sprint 1.4 (Pipeline Context) requires each stage to receive Job,
    Project, Video, the previous stage's output, and Configuration. These
    are additive, optional fields — `job`/`project`/`video` are left as
    `Any` rather than importing the SQLAlchemy models here, since this
    module must stay free of DB/ORM concerns; callers (e.g. the worker)
    pass in whatever objects they have. `previous_output` is set by the
    orchestration engine between stages, never by the caller.

    `stage_outputs` additionally keeps every prior stage's output, keyed by
    stage — some stages (e.g. caption planning needs both the transcript
    *and* the creative plan) depend on more than just the immediately
    preceding stage, so "previous output" alone isn't enough to wire the
    Architecture diagram's branching inputs.
    """

    project_id: str
    video_id: str
    job_id: str
    job: Any | None = None
    project: Any | None = None
    video: Any | None = None
    config: dict[str, Any] = field(default_factory=dict)
    previous_output: Any | None = None
    stage_outputs: dict[PipelineStage, Any] = field(default_factory=dict)
    extra: dict[str, Any] = field(default_factory=dict)
