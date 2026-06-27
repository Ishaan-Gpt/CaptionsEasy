"""Provider registry. Source: contracts/ai.md > Providers

Resolves a configured provider name (e.g. from env/config) to an `AIProvider`
instance without any pipeline or service code hardcoding a vendor.
"""

from collections.abc import Callable

from app.ai.providers.base import AIProvider


class ProviderNotRegisteredError(KeyError):
    pass


class ProviderRegistry:
    """Maps provider name -> factory. Adapters register themselves here at
    application startup; nothing in this module knows about specific vendors.
    """

    def __init__(self) -> None:
        self._factories: dict[str, Callable[[], AIProvider]] = {}

    def register(self, name: str, factory: Callable[[], AIProvider]) -> None:
        self._factories[name] = factory

    def create(self, name: str) -> AIProvider:
        try:
            factory = self._factories[name]
        except KeyError as exc:
            raise ProviderNotRegisteredError(
                f"No provider registered under name '{name}'"
            ) from exc
        return factory()

    def available(self) -> list[str]:
        return sorted(self._factories.keys())


# Process-wide registry. Adapters call `registry.register(...)` from their
# own module at import/startup time — this module stays vendor-agnostic.
registry = ProviderRegistry()
