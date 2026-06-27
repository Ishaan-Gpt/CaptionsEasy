"""Typed provider registries. Source: Sprint 1.4 brief > Build (Provider Registry).

One registry per provider kind (Speech/Creative/Caption/RenderPlan) so that
`registry.create("dummy")` is statically known to return e.g. a
`SpeechProvider`, not a generic `AIProvider`. Mirrors the vendor-agnostic
design of `app.ai.providers.registry.ProviderRegistry` (name -> factory,
nothing here ever hardcodes a vendor), just specialized per stage so type
checkers (and tests) catch a SpeechProvider being registered where a
CaptionProvider was expected.
"""

from collections.abc import Callable
from typing import Generic, TypeVar

from app.ai.providers.stage_providers import (
    CaptionProvider,
    CreativeProvider,
    RenderPlanProvider,
    SpeechProvider,
)

P = TypeVar("P")


class ProviderNotRegisteredError(KeyError):
    pass


class TypedProviderRegistry(Generic[P]):
    def __init__(self) -> None:
        self._factories: dict[str, Callable[[], P]] = {}

    def register(self, name: str, factory: Callable[[], P]) -> None:
        self._factories[name] = factory

    def create(self, name: str) -> P:
        try:
            factory = self._factories[name]
        except KeyError as exc:
            raise ProviderNotRegisteredError(
                f"No provider registered under name '{name}'"
            ) from exc
        return factory()

    def available(self) -> list[str]:
        return sorted(self._factories.keys())


# Process-wide, one per stage kind. Concrete providers (dummy or real)
# register themselves here; orchestration code only ever resolves by name.
speech_provider_registry: TypedProviderRegistry[SpeechProvider] = TypedProviderRegistry()
creative_provider_registry: TypedProviderRegistry[CreativeProvider] = TypedProviderRegistry()
caption_provider_registry: TypedProviderRegistry[CaptionProvider] = TypedProviderRegistry()
render_plan_provider_registry: TypedProviderRegistry[RenderPlanProvider] = TypedProviderRegistry()
