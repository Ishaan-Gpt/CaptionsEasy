"""Stage definitions. Source: Sprint 1.4 brief > Build (Stage Registry,
Stage Executor); Architecture ("Each stage is independent.").

A StageDefinition is either a provider stage (calls a stage provider, then
the JSON Validation Layer applies) or a validator stage (deterministic
business-rule check, no provider call) — never both, never neither.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from app.ai.providers.stage_providers import ProviderOutput
from app.ai.types import PipelineContext, PipelineStage

ProviderCall = Callable[[PipelineContext], Awaitable[ProviderOutput]]
ValidatorCall = Callable[[Any], Any]


@dataclass(frozen=True)
class StageDefinition:
    stage: PipelineStage
    output_model: type[BaseModel]
    provider_call: ProviderCall | None = None
    validator_call: ValidatorCall | None = None

    def __post_init__(self) -> None:
        has_provider = self.provider_call is not None
        has_validator = self.validator_call is not None
        if has_provider == has_validator:
            raise ValueError(
                f"StageDefinition for {self.stage.value} must set exactly one of "
                "provider_call/validator_call"
            )

    @property
    def is_provider_stage(self) -> bool:
        return self.provider_call is not None
