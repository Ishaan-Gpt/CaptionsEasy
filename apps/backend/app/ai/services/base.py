"""AI service interfaces, one per pipeline stage. Source: contracts/ai.md

Each interface only declares input/output and responsibilities from the
contract. No prompt text. No provider SDK usage. Implementations live
elsewhere and are injected via app.ai.container.
"""

from abc import ABC, abstractmethod

from app.ai.types import PipelineContext, StageResult

# NOTE: Transcript / CreativePlan / CaptionPlan / RenderPlan models come from
# packages/contracts/python — the single source of truth for these shapes.
# TODO: wire up the actual import path once the contracts package is
# published/installed into apps/backend's environment (e.g. as a local
# workspace dependency); using a relative placeholder import here.
from packages.contracts.python import (  # type: ignore[import-not-found]
    CaptionPlan,
    CreativePlan,
    RenderPlan,
    Transcript,
)


class SpeechRecognitionService(ABC):
    """Stage 1 — contracts/ai.md > Stage 1.

    Input: Video. Output: Transcript.
    Responsibilities: extract speech, preserve timestamps, preserve
    confidence, detect language. No styling.
    """

    @abstractmethod
    async def recognize(
        self, ctx: PipelineContext, *, video_storage_path: str
    ) -> StageResult[Transcript]:
        raise NotImplementedError


class TranscriptValidationService(ABC):
    """Stage 2 — contracts/ai.md > Stage 2.

    Responsibilities: remove empty words, merge duplicate timestamps,
    validate chronology, reject invalid transcript. Never modify wording.
    """

    @abstractmethod
    async def validate(
        self, ctx: PipelineContext, *, transcript: Transcript
    ) -> StageResult[Transcript]:
        raise NotImplementedError


class CreativeAnalysisService(ABC):
    """Stage 3 — contracts/ai.md > Stage 3.

    Input: Transcript. Output: CreativePlan.
    Responsibilities: determine energy, pacing, emotion, speaking style,
    emphasis, audience. No caption generation.
    """

    @abstractmethod
    async def analyze(
        self, ctx: PipelineContext, *, transcript: Transcript
    ) -> StageResult[CreativePlan]:
        raise NotImplementedError


class CaptionPlanningService(ABC):
    """Stage 4 — contracts/ai.md > Stage 4.

    Input: CreativePlan, Transcript. Output: CaptionPlan.
    Responsibilities: split captions, preserve timing, mark emphasis,
    preserve readability. No typography. No animation.
    """

    @abstractmethod
    async def plan(
        self,
        ctx: PipelineContext,
        *,
        transcript: Transcript,
        creative_plan: CreativePlan,
    ) -> StageResult[CaptionPlan]:
        raise NotImplementedError


class RenderPlanningService(ABC):
    """Stage 5 — contracts/ai.md > Stage 5.

    Input: Transcript, CreativePlan, CaptionPlan. Output: RenderPlan.
    Responsibilities: choose typography, colors, animations, layers,
    timeline. No rendering.
    """

    @abstractmethod
    async def plan(
        self,
        ctx: PipelineContext,
        *,
        transcript: Transcript,
        creative_plan: CreativePlan,
        caption_plan: CaptionPlan,
    ) -> StageResult[RenderPlan]:
        raise NotImplementedError
