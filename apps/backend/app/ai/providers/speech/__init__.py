"""Real (non-dummy) speech provider implementations. Source: Sprint 1.5/1.6 brief.

Importing this subpackage registers the Groq speech provider under the
name "groq" in `speech_provider_registry` (idempotent). Registration is
lazy — no network/ffmpeg calls happen until a provider built here is
actually invoked.
"""

from app.ai.providers.speech.groq_speech_provider import GroqSpeechProvider
from app.ai.providers.stage_provider_registry import speech_provider_registry
from app.core.config import Settings, get_settings
from app.storage.dependencies import get_storage_client

GROQ_PROVIDER_NAME = "groq"


def register_groq_speech_provider(settings: Settings | None = None) -> None:
    def _factory() -> GroqSpeechProvider:
        resolved_settings = settings or get_settings()
        return GroqSpeechProvider(
            settings=resolved_settings,
            storage_client=get_storage_client(resolved_settings),
        )

    speech_provider_registry.register(GROQ_PROVIDER_NAME, _factory)


__all__ = [
    "GROQ_PROVIDER_NAME",
    "GroqSpeechProvider",
    "register_groq_speech_provider",
]
