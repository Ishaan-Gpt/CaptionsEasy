"""Provider abstraction. Source: contracts/ai.md > Providers

"Provider must be configurable. Never hardcode Gemini / Claude / OpenAI /
Fireworks. Future providers supported."

This module defines the interface only. No prompt text. No provider SDK
calls live here.
"""

from abc import ABC, abstractmethod
from typing import Any, Protocol

from app.ai.types import ProviderUsage


class AICompletionResult(Protocol):
    """What every provider call must return, regardless of vendor."""

    text: str
    usage: ProviderUsage


class AIProvider(ABC):
    """Vendor-agnostic interface every AI provider adapter must implement.

    Concrete adapters (Gemini, Fireworks, etc.) live outside this module and
    are registered via `app.ai.providers.registry`, never imported directly
    by pipeline/service code.
    """

    name: str
    model: str

    @abstractmethod
    async def complete(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, Any] | None = None,
    ) -> AICompletionResult:
        """Run a single completion call. Prompts are passed in by the caller —
        providers never construct or own prompt text."""
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        """Cheap liveness check used by the registry/DI container at startup."""
        raise NotImplementedError
