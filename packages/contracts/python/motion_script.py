from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from .render_plan import (
    RenderPlanMetadata,
    RenderPlanAsset,
    GlobalSettings,
    TimelineEvent,
    ExportSettings,
)

class MotionScript(BaseModel):
    """MotionScript schema definition for Sprint 3.
    
    MotionScript is the single, deterministic description of the entire edit,
    serving as the only input for the video renderer.
    """
    model_config = ConfigDict(extra="forbid")

    version: Literal["1.0"] = "1.0"
    metadata: RenderPlanMetadata
    assets: list[RenderPlanAsset] = Field(default_factory=list)
    global_settings: GlobalSettings
    timeline: list[TimelineEvent]
    export_settings: ExportSettings | None = None
