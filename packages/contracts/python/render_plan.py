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
    quality_evaluation: dict | None = None


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
    # The caption template actually used to build this timeline (e.g.
    # "staggered_3line"). Renderers must read this instead of re-deriving a
    # template from the style preset's own default — a project can override
    # its caption_template away from the preset default, and re-deriving
    # from the preset alone would silently render the wrong layout.
    caption_template: str | None = None
    # Layout variant for staggered_3line only: "splash" (line 1 left-aligned,
    # line 3 right-aligned, offset around the keyword) or "centre" (all
    # three lines center-aligned).
    staggered_layout: str | None = None


class CaptionPayload(StrictModel):
    text: str
    font: str
    size: float = Field(gt=0)
    weight: str
    color: str
    alignment: str
    animation: Animation
    # Promoted onto the payload itself (rather than only living in the style
    # preset) so every renderer — ASS and Remotion alike — reads the same
    # resolved values the same way it already reads font/size/color, instead
    # of each renderer needing its own path back to the preset. Previously
    # shadow/outline only reached the ASS exporter via `preset.typography`
    # and Remotion never saw them at all; text_transform/underline/spacing/
    # color_mode/color2/x_position_percent/background_style didn't reach
    # either renderer — they were live-preview-only CSS with no persistence.
    text_transform: str = "none"  # "none" | "uppercase" | "lowercase" | "capitalize"
    underline: bool = False
    letter_spacing: float = 0.0
    word_spacing: float = 0.0
    line_spacing: float = 1.0
    color_mode: str = "solid"  # "solid" | "gradient"
    color2: str | None = None
    x_position_percent: float | None = None
    shadow: float = 0.0
    outline: float = 0.0
    background_style: str = "none"  # "none" | "pill" | "shadow-box"
    # Motion + effect controls rendered by the shared CaptionEngine (both
    # the studio preview and the Remotion export read these).
    entrance_anim: str = "rise"  # "none" | "rise" | "pop" | "fade"
    highlight_anim: str = "pop"  # "pop" | "flash" | "underline" | "glow"
    outline_color: str = "#000000"
    shadow_color: str = "#000000"
    # Per-caption-card bounding-box override (pixel margins from each canvas
    # edge, same convention as GlobalSettings.safe_area — the box's own
    # width/height are derived by subtracting these from canvas dims, not
    # stored directly). None means "use the project's global safe_area" —
    # the existing fallback behavior every renderer already had before this
    # field existed. Resolved once by the merge step in
    # app.api.v1.projects (generate_motion_script/export_project) from the
    # project's fragment_overrides_json, keyed by this card's start_ms —
    # not by the caller of DummyRenderPlanProvider.plan().
    box: SafeArea | None = None


class HighlightPayload(StrictModel):
    indices: list[int]
    color: str
    animation: Animation
    is_keyword: bool = False
    # Optional per-template hero-word styling (contracts/renderplan.md >
    # Templates): lets the highlighted word render in a visibly different
    # font/weight/size than the rest of the caption, not just a color swap.
    # None means "inherit the caption's own font/weight/size" — old motion
    # scripts without these fields keep working unchanged.
    font: str | None = None
    weight: str | None = None
    size_scale: float | None = None


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
