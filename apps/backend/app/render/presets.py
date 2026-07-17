import os
import json
from typing import Any, Optional
from pydantic import BaseModel

class TypographyPreset(BaseModel):
    font: str
    size: float
    weight: str
    color: str
    alignment: str
    shadow: float
    outline: float
    background_style: Optional[str] = "none"
    y_position_percent: Optional[float] = 71.4
    # Previously only existed in the frontend's local CSS state — never
    # reached this preset model, so they were silently dropped the moment
    # presets.json was re-parsed even if the API layer wrote them.
    text_transform: Optional[str] = "none"
    underline: Optional[bool] = False
    letter_spacing: Optional[float] = 0.0
    word_spacing: Optional[float] = 0.0
    line_spacing: Optional[float] = 1.0
    color_mode: Optional[str] = "solid"
    color2: Optional[str] = None
    x_position_percent: Optional[float] = None
    # Independent hero/keyword-word styling (Phase D) — None means "inherit
    # the template's own keyword_font/keyword_weight/keyword_size_scale
    # default" (app.render.templates.TemplateStyleConfig), same fallback
    # every template already had before these fields existed.
    keyword_font: Optional[str] = None
    keyword_weight: Optional[str] = None
    keyword_size_scale: Optional[float] = None
    # Motion + effect controls rendered by the shared CaptionEngine.
    entrance_anim: Optional[str] = "rise"
    highlight_anim: Optional[str] = "pop"
    outline_color: Optional[str] = "#000000"
    shadow_color: Optional[str] = "#000000"

class AnimationPreset(BaseModel):
    caption_animation: str
    motion_preset: str
    intensity: str

class HighlightPreset(BaseModel):
    colors: list[str]

class SafeAreaPreset(BaseModel):
    top: float
    bottom: float
    left: float
    right: float

class EmojiPreset(BaseModel):
    behavior: str

class TimingPreset(BaseModel):
    word_limit: int
    caption_spacing_ms: int
    word_pacing: str
    pause_handling: str
    sentence_segmentation: str
    reading_speed_limit_cps: int
    caption_template: str = "word_by_word"
    # Layout variant for the staggered_3line template only: "splash" (line 1
    # left-aligned, line 3 right-aligned, offset around the keyword word —
    # the original look) or "centre" (all three lines center-aligned).
    staggered_layout: str = "splash"
    accent_period_enabled: bool = True

class StylePreset(BaseModel):
    name: str
    typography: TypographyPreset
    animation: AnimationPreset
    highlight: HighlightPreset
    safe_area: SafeAreaPreset
    emoji: EmojiPreset
    timing: TimingPreset
    transitions: str

class StylePresetManager:
    _presets: dict[str, StylePreset] = {}

    @classmethod
    def load_presets(cls) -> None:
        if cls._presets:
            return
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(current_dir, "presets.json")
        
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"Style presets file not found: {json_path}")
            
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        cls._presets = {
            k.lower(): StylePreset(**v)
            for k, v in data.items()
        }

    @classmethod
    def get_preset(cls, name: Optional[str]) -> StylePreset:
        cls.load_presets()
        clean_name = (name or "minimal").strip().lower()
        # Fallback to minimal if key not found
        return cls._presets.get(clean_name) or cls._presets["minimal"]

    @classmethod
    def list_presets(cls) -> list[StylePreset]:
        cls.load_presets()
        return list(cls._presets.values())
