"""Deterministic dummy providers. Source: Sprint 1.4 brief > Dummy Providers.

"For now implement deterministic dummy providers that return valid data
matching the schemas. No external AI API calls yet."

Importing this subpackage registers all four dummy providers under the name
"dummy" in their respective typed registries (idempotent — re-importing or
re-registering just overwrites the same factory).
"""

from app.ai.providers.dummy.caption import DummyCaptionProvider
from app.ai.providers.dummy.creative import DummyCreativeProvider
from app.ai.providers.dummy.render_plan import DummyRenderPlanProvider
from app.ai.providers.dummy.speech import DummySpeechProvider
from app.ai.providers.stage_provider_registry import (
    caption_provider_registry,
    creative_provider_registry,
    render_plan_provider_registry,
    speech_provider_registry,
)

DUMMY_PROVIDER_NAME = "dummy"


def register_dummy_providers() -> None:
    speech_provider_registry.register(DUMMY_PROVIDER_NAME, DummySpeechProvider)
    creative_provider_registry.register(DUMMY_PROVIDER_NAME, DummyCreativeProvider)
    caption_provider_registry.register(DUMMY_PROVIDER_NAME, DummyCaptionProvider)
    render_plan_provider_registry.register(DUMMY_PROVIDER_NAME, DummyRenderPlanProvider)


__all__ = [
    "DUMMY_PROVIDER_NAME",
    "DummyCaptionProvider",
    "DummyCreativeProvider",
    "DummyRenderPlanProvider",
    "DummySpeechProvider",
    "register_dummy_providers",
]
