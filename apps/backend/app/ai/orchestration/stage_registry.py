"""Stage Registry. Source: Sprint 1.4 brief > Build (Stage Registry).

Maps PipelineStage -> StageDefinition and hands back stages in the fixed
pipeline order from the brief's Architecture diagram. The orchestration
engine sequences purely off this registry — it has no hardcoded stage chain
of its own (contrast with the pre-existing, fixed-chain
app.ai.pipeline.orchestrator.PipelineOrchestrator, which this supersedes
for new work without modifying it).
"""

from app.ai.orchestration.stage import StageDefinition
from app.ai.types import PipelineStage

ORDERED_STAGES: tuple[PipelineStage, ...] = (
    PipelineStage.SPEECH_RECOGNITION,
    PipelineStage.TRANSCRIPT_VALIDATION,
    PipelineStage.CREATIVE_ANALYSIS,
    PipelineStage.CREATIVE_VALIDATION,
    PipelineStage.CAPTION_PLANNING,
    PipelineStage.CAPTION_VALIDATION,
    PipelineStage.RENDER_PLANNING,
    PipelineStage.RENDER_VALIDATION,
)


class StageNotRegisteredError(KeyError):
    pass


class StageRegistry:
    def __init__(self) -> None:
        self._definitions: dict[PipelineStage, StageDefinition] = {}

    def register(self, definition: StageDefinition) -> None:
        self._definitions[definition.stage] = definition

    def get(self, stage: PipelineStage) -> StageDefinition:
        try:
            return self._definitions[stage]
        except KeyError as exc:
            raise StageNotRegisteredError(f"No stage registered for {stage.value}") from exc

    def ordered_stages(self) -> list[StageDefinition]:
        """Returns registered stages in pipeline order. A partially built
        registry (e.g. in tests) simply yields whichever of ORDERED_STAGES
        it has — callers needing the full pipeline should register all 8."""
        return [self._definitions[stage] for stage in ORDERED_STAGES if stage in self._definitions]
