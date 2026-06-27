from app.ai.providers.caption.groq_caption_provider import GroqCaptionProvider
from app.ai.providers.stage_provider_registry import caption_provider_registry
from app.core.config import Settings, get_settings

GROQ_PROVIDER_NAME = "groq"


def register_groq_caption_provider(settings: Settings | None = None) -> None:
    def _factory() -> GroqCaptionProvider:
        resolved_settings = settings or get_settings()
        return GroqCaptionProvider(settings=resolved_settings)

    caption_provider_registry.register(GROQ_PROVIDER_NAME, _factory)


__all__ = [
    "GROQ_PROVIDER_NAME",
    "GroqCaptionProvider",
    "register_groq_caption_provider",
]
