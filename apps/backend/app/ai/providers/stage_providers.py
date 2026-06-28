"""Stage-level provider interfaces. Source: Sprint 1.4 brief > Providers.

"Create provider abstractions only. Examples: SpeechProvider, CreativeProvider,
CaptionProvider, RenderPlanProvider. No provider should know which AI model
is being used. Provider selection must come from configuration."

These sit one layer above `app.ai.providers.base.AIProvider` (the raw
vendor-completion abstraction already in this codebase): a SpeechProvider,
for example, knows how to turn a video into transcript-shaped JSON, and a
*real* implementation would internally use an AIProvider to do so — but
that's an implementation detail these interfaces never expose. Dummy
implementations (app.ai.providers.dummy) don't use an AIProvider at all.

Providers return raw `dict` data, not validated Pydantic models — "every
provider output must validate against the existing JSON Schemas" (Sprint 1.4
brief > Validation) is enforced by app.ai.orchestration.stage_executor, one
layer up, never inside the provider itself. No business logic, no prompts,
no provider-to-provider calls live here.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from app.ai.types import ProviderUsage

# NOTE: see app/ai/services/base.py for the same TODO — packages/contracts
# is imported by path pending real workspace packaging.
from packages.contracts.python import CaptionPlan, CreativePlan, Transcript  # type: ignore[import-not-found]


@dataclass(frozen=True)
class ProviderOutput:
    """What every stage provider call returns: unvalidated raw JSON plus the
    usage facts needed for cost/token/latency tracking."""

    data: dict[str, Any]
    usage: ProviderUsage


class SpeechProvider(ABC):
    """Produces transcript-shaped JSON from a video. contracts/ai.md > Stage 1."""

    @abstractmethod
    async def transcribe(self, *, video_storage_path: str) -> ProviderOutput:
        raise NotImplementedError


class CreativeProvider(ABC):
    """Produces creative-plan-shaped JSON from a transcript. contracts/ai.md > Stage 3."""

    @abstractmethod
    async def analyze(self, *, transcript: Transcript) -> ProviderOutput:
        raise NotImplementedError


class CaptionProvider(ABC):
    """Produces caption-plan-shaped JSON. contracts/ai.md > Stage 4."""

    @abstractmethod
    async def plan(self, *, transcript: Transcript, creative_plan: CreativePlan) -> ProviderOutput:
        raise NotImplementedError


class RenderPlanProvider(ABC):
    """Produces render-plan-shaped JSON. contracts/ai.md > Stage 5."""

    @abstractmethod
    async def plan(
        self,
        *,
        transcript: Transcript,
        creative_plan: CreativePlan,
        caption_plan: CaptionPlan,
        project_id: str,
        video_id: str,
        style: str | None = None,
        caption_template: str | None = None,
    ) -> ProviderOutput:
        """`project_id`/`video_id` are plain strings (not ORM objects) so the
        provider stays free of database coupling — they're only needed to
        populate RenderPlanMetadata (contracts/renderplan.md)."""
        raise NotImplementedError
