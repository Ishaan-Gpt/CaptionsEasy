"""RenderPlan Pydantic models. Source: contracts/renderplan.md

Defines the contract between the AI Pipeline and the Rendering Engine.
No rendering logic or FFmpeg commands here — schema only.
"""

import enum
from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field


class Layer(str, enum.Enum):
    BACKGROUND = "background"
    VIDEO = "video"
    GRAPHICS = "graphics"
    CAPTIONS = "captions"
    HIGHLIGHTS = "highlights"
    OVERLAYS = "overlays"
    DEBUG = "debug"


class EventType(str, enum.Enum):
    CAPTION = "caption"
    HIGHLIGHT = "highlight"
    EMOJI = "emoji"
    SHAPE = "shape"
    CAMERA = "camera"
    TRANSITION = "transition"
    AUDIO_EFFECT = "audio_effect"  # Future only, per renderplan.md.


class Animation(str, enum.Enum):
    FADE = "fade"
    POP = "pop"
    SLIDE = "slide"
    BOUNCE = "bounce"
    SCALE = "scale"
    ROTATE = "rotate"
    BLUR = "blur"
    ELASTIC = "elastic"
    TYPEWRITER = "typewriter"


class ShapeKind(str, enum.Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    UNDERLINE = "underline"
    ARROW = "arrow"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RenderPlanMetadata(StrictModel):
    version: Literal["1.0"] = "1.0"
    project_id: str
    video_id: str
    generated_at: datetime
    generator_version: str


class RenderPlanAsset(StrictModel):
    id: str
    # TODO(renderplan.md): only examples given (font, image, emoji, audio, icon, brand_asset).
    type: str
    source: str
    preload: bool


class Canvas(StrictModel):
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class SafeArea(StrictModel):
    top: float = Field(ge=0)
    bottom: float = Field(ge=0)
    left: float = Field(ge=0)
    right: float = Field(ge=0)


class GlobalSettings(StrictModel):
    canvas: Canvas
    frame_rate: float = Field(gt=0)
    resolution: str
    aspect_ratio: str
    safe_area: SafeArea
    theme: str
    default_font: str
    default_colors: list[str]
    motion_preset: str


class CaptionPayload(StrictModel):
    text: str
    font: str
    size: float = Field(gt=0)
    weight: str
    color: str
    alignment: str
    animation: Animation


class HighlightPayload(StrictModel):
    indices: list[int]
    color: str
    animation: Animation


class EmojiPosition(StrictModel):
    x: float
    y: float


class EmojiPayload(StrictModel):
    emoji: str
    animation: Animation
    position: EmojiPosition
    scale: float = Field(gt=0)


class ShapePayload(StrictModel):
    shape: ShapeKind


class CameraPayload(StrictModel):
    zoom: float | None = None
    pan: dict | None = None
    shake: float | None = None
    blur: float | None = None


class TransitionPayload(StrictModel):
    type: str
    duration: float = Field(gt=0)
    easing: str


class AudioEffectPayload(StrictModel):
    """Future only, per renderplan.md."""

    effect: str
    volume: float = Field(ge=0)
    fade: float = Field(ge=0)


TimelineEventPayload = Union[
    CaptionPayload,
    HighlightPayload,
    EmojiPayload,
    ShapePayload,
    CameraPayload,
    TransitionPayload,
    AudioEffectPayload,
]


class TimelineEvent(StrictModel):
    id: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    layer: Layer
    type: EventType
    payload: dict

    def parsed_payload(self) -> TimelineEventPayload:
        """Parse `payload` into the concrete model matching `type`."""
        mapping: dict[EventType, type[BaseModel]] = {
            EventType.CAPTION: CaptionPayload,
            EventType.HIGHLIGHT: HighlightPayload,
            EventType.EMOJI: EmojiPayload,
            EventType.SHAPE: ShapePayload,
            EventType.CAMERA: CameraPayload,
            EventType.TRANSITION: TransitionPayload,
            EventType.AUDIO_EFFECT: AudioEffectPayload,
        }
        return mapping[self.type].model_validate(self.payload)


class ExportSettings(StrictModel):
    resolution: str
    frame_rate: float = Field(gt=0)
    codec: str
    bitrate: str
    audio: str
    container: str
    quality: str


class RenderPlan(StrictModel):
    metadata: RenderPlanMetadata
    assets: list[RenderPlanAsset]
    global_settings: GlobalSettings
    timeline: list[TimelineEvent]
    export_settings: ExportSettings | None = None
