"""Real (non-dummy) speech provider implementations. Source: Sprint 1.5 brief.

Importing this subpackage registers the Fireworks speech provider under the
name "fireworks" in `speech_provider_registry` (idempotent). Registration is
lazy — no network/ffmpeg calls happen until a provider built here is
actually invoked.
"""

from app.ai.providers.speech.fireworks_speech_provider import FireworksSpeechProvider
from app.ai.providers.stage_provider_registry import speech_provider_registry
from app.core.config import Settings, get_settings
from app.storage.dependencies import get_storage_client

FIREWORKS_PROVIDER_NAME = "fireworks"


def register_fireworks_speech_provider(settings: Settings | None = None) -> None:
    def _factory() -> FireworksSpeechProvider:
        resolved_settings = settings or get_settings()
        return FireworksSpeechProvider(
            settings=resolved_settings,
            storage_client=get_storage_client(resolved_settings),
        )

    speech_provider_registry.register(FIREWORKS_PROVIDER_NAME, _factory)


__all__ = [
    "FIREWORKS_PROVIDER_NAME",
    "FireworksSpeechProvider",
    "register_fireworks_speech_provider",
]
