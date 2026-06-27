"""Dependency injection container for the AI pipeline.

Wires concrete service implementations (not defined here — they live
wherever the actual provider-backed logic is implemented) into a
PipelineOrchestrator. Nothing in this module contains prompt text,
provider SDK calls, or rendering logic; it only assembles dependencies.
"""

from dataclasses import dataclass

from app.ai.pipeline.orchestrator import PipelineOrchestrator
from app.ai.providers.registry import ProviderRegistry, registry
from app.ai.services.base import (
    CaptionPlanningService,
    CreativeAnalysisService,
    RenderPlanningService,
    SpeechRecognitionService,
    TranscriptValidationService,
)


@dataclass
class AIPipelineContainer:
    """Holds the concrete service instances the orchestrator needs.

    Construct this once at application/worker startup (e.g. in a FastAPI
    lifespan handler or Celery worker init) and reuse it across jobs.
    """

    provider_registry: ProviderRegistry
    speech_recognition: SpeechRecognitionService
    transcript_validation: TranscriptValidationService
    creative_analysis: CreativeAnalysisService
    caption_planning: CaptionPlanningService
    render_planning: RenderPlanningService

    def build_orchestrator(self) -> PipelineOrchestrator:
        return PipelineOrchestrator(
            speech_recognition=self.speech_recognition,
            transcript_validation=self.transcript_validation,
            creative_analysis=self.creative_analysis,
            caption_planning=self.caption_planning,
            render_planning=self.render_planning,
        )


def build_container(
    *,
    speech_recognition: SpeechRecognitionService,
    transcript_validation: TranscriptValidationService,
    creative_analysis: CreativeAnalysisService,
    caption_planning: CaptionPlanningService,
    render_planning: RenderPlanningService,
    provider_registry: ProviderRegistry = registry,
) -> AIPipelineContainer:
    """Factory used by application startup code. Callers are responsible for
    constructing the concrete `*Service` implementations (e.g. resolving an
    `AIProvider` from `provider_registry` via configuration) before calling
    this — this module never picks a provider itself.
    """
    return AIPipelineContainer(
        provider_registry=provider_registry,
        speech_recognition=speech_recognition,
        transcript_validation=transcript_validation,
        creative_analysis=creative_analysis,
        caption_planning=caption_planning,
        render_planning=render_planning,
    )
