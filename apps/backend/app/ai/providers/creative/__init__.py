from app.ai.providers.creative.groq_creative_provider import GroqCreativeProvider
from app.ai.providers.stage_provider_registry import creative_provider_registry
from app.core.config import Settings, get_settings

GROQ_PROVIDER_NAME = "groq"


def register_groq_creative_provider(settings: Settings | None = None) -> None:
    def _factory() -> GroqCreativeProvider:
        resolved_settings = settings or get_settings()
        return GroqCreativeProvider(settings=resolved_settings)

    creative_provider_registry.register(GROQ_PROVIDER_NAME, _factory)


__all__ = [
    "GROQ_PROVIDER_NAME",
    "GroqCreativeProvider",
    "register_groq_creative_provider",
]
