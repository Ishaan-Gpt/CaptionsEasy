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
