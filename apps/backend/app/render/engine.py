import os
import subprocess
import json
import time
import re
from pathlib import Path
from datetime import datetime, timezone
from packages.contracts.python import MotionScript, EventType, Layer

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "in", "on", "at",
    "it", "this", "that", "i", "you", "he", "she", "we", "they", "but", "or", "so",
    "be", "as", "for", "with", "my", "your", "do", "does", "did"
}

def map_font_family(name: str) -> str:
    # Google Webfonts Helper renames certain static TTF family tags in metadata:
    # - Fredoka -> Fredoka Light
    # - Outfit -> Outfit Thin
    mapping = {
        "Fredoka": "Fredoka Light",
        "Outfit": "Outfit Thin",
    }
    return mapping.get(name, name)

def ensure_font_downloaded_backend(font_name: str) -> None:
    # Dynamically download Google Font TTF files if they do not exist locally.
    if not font_name:
        return
    import urllib.request
    import urllib.error
    
    clean_name = font_name.replace(" Light", "").replace(" Thin", "")
    repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
    fonts_dir = repo_root / "fonts"
    
    # Check if there is already a TTF file for this font name
    has_font = False
    if fonts_dir.exists():
        for file in os.listdir(fonts_dir):
            if file.lower().startswith(clean_name.lower().replace(" ", "")) and file.lower().endswith(".ttf"):
                has_font = True
                break
                
    if not has_font:
        print(f"Font {font_name} not found locally. Downloading dynamically from Google Fonts API...")
        font_id = clean_name.lower().replace(" ", "-")
        url = f"https://gwfh.mranftl.com/api/fonts/{font_id}"
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        try:
            with urllib.request.urlopen(req) as response:
                metadata = json.loads(response.read().decode('utf-8'))
            
            # Download standard variants
            variants_to_download = ["regular", "italic", "700", "700italic", "900", "900italic"]
            for variant_info in metadata.get("variants", []):
                vid = variant_info.get("id")
                if vid in variants_to_download:
                    ttf_url = variant_info.get("ttf")
                    if ttf_url:
                        # Determine file name
                        style_suffix = "Regular"
                        if vid == "italic":
                            style_suffix = "Italic"
                        elif vid == "700":
                            style_suffix = "Bold"
                        elif vid == "700italic":
                            style_suffix = "BoldItalic"
                        elif vid == "900":
                            style_suffix = "Black"
                        elif vid == "900italic":
                            style_suffix = "BlackItalic"
                        
                        clean_family = clean_name.replace(" ", "")
                        filename = f"{clean_family}-{style_suffix}.ttf"
                        
                        dest = fonts_dir / filename
                        ttf_req = urllib.request.Request(
                            ttf_url,
                            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                        )
                        with urllib.request.urlopen(ttf_req) as ttf_res:
                            font_bytes = ttf_res.read()
                        
                        fonts_dir.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(font_bytes)
                        print(f"  Dynamically downloaded on-demand: {filename}")
        except Exception as e:
            print(f"  Failed to download font {font_name} on-demand: {e}")


def normalize_word(word: str) -> str:
    return re.sub(r'[^\w]', '', word).lower()

def is_capitalized(word: str) -> bool:
    clean = re.sub(r'[^\w]', '', word)
    return bool(clean and clean[0].isupper())

def is_number(word: str) -> bool:
    clean = re.sub(r'[^\w]', '', word)
    return bool(clean and clean.isdigit())

def pick_keyword_idx(words_text: list[str]) -> int:
    """Fallback only — the render-plan stage already picked the keyword word
    (honoring the caption-planning LLM's `emphasis` field when available) and
    recorded it as `is_keyword` on the caption's highlight events. This
    mechanical re-scoring only runs if that data is missing, so it can never
    disagree with what the render plan (and therefore the live preview)
    already decided."""
    best_idx = 0
    best_score = -1.0
    for i, w in enumerate(words_text):
        clean = re.sub(r'[^\w]', '', w)
        if not clean:
            continue
        score = float(len(clean))
        if normalize_word(w) in STOPWORDS:
            score -= 100.0
        if is_capitalized(w):
            score += 2.0
        if is_number(w):
            score += 1.0
        if score > best_score:
            best_score = score
            best_idx = i
    return best_idx

def resolve_box_margins(cap_payload, margin_l: int, margin_r: int, canvas_width: int) -> tuple[int, int]:
    """Per-caption-card box override (Phase C) takes priority over the
    project's global safe_area margins — falls back to the global margins
    when the card has no override, same as before this field existed."""
    box = getattr(cap_payload, "box", None)
    if box is not None:
        return int(box.left), canvas_width - int(box.right)
    return margin_l, canvas_width - margin_r


def estimate_text_width(text: str, font_size: float) -> float:
    width = 0.0
    for c in text:
        if c.isupper():
            width += font_size * 0.65
        elif c in "1ilI|!.,:;":
            width += font_size * 0.25
        elif c in "mwMW":
            width += font_size * 0.85
        elif c == " ":
            width += font_size * 0.3
        else:
            width += font_size * 0.52
    return width

class RenderEngine:
    def __init__(self, ffmpeg_binary: str = "ffmpeg", ffprobe_binary: str = "ffprobe") -> None:
        self.ffmpeg_binary = ffmpeg_binary
        self.ffprobe_binary = ffprobe_binary

    def ms_to_ass_time(self, ms: int) -> str:
        """Converts milliseconds to ASS timestamp format (H:MM:SS.cs)."""
        cs = (ms // 10) % 100
        sec = (ms // 1000) % 60
        min_ = (ms // 60000) % 60
        hr = ms // 3600000
        return f"{hr}:{min_:02d}:{sec:02d}.{cs:02d}"

    def hex_to_ass_abgr(self, hex_color: str, alpha_percent: float = 100.0) -> str:
        """Converts hex color (e.g. #FFFFFF or #FF0000) to ASS format (&HAAABBGR)."""
        clean = hex_color.lstrip("#")
        if len(clean) == 3:
            clean = "".join(c * 2 for c in clean)
        r = clean[0:2]
        g = clean[2:4]
        b = clean[4:6]
        
        # ASS Alpha: 00 is opaque, FF is transparent
        alpha_val = int((1.0 - (alpha_percent / 100.0)) * 255)
        a = f"{alpha_val:02d}"
        
        return f"&H{a}{b}{g}{r}"

    @staticmethod
    def _lighten(hex_color: str, amount: float) -> str:
        """Blends a hex color toward white by `amount` (0..1)."""
        clean = hex_color.lstrip("#")
        if len(clean) == 3:
            clean = "".join(c * 2 for c in clean)
        r, g, b = (int(clean[i:i+2], 16) for i in (0, 2, 4))
        r, g, b = (int(c + (255 - c) * amount) for c in (r, g, b))
        return f"#{r:02X}{g:02X}{b:02X}"

    @staticmethod
    def _darken(hex_color: str, amount: float) -> str:
        """Blends a hex color toward black by `amount` (0..1)."""
        clean = hex_color.lstrip("#")
        if len(clean) == 3:
            clean = "".join(c * 2 for c in clean)
        r, g, b = (int(clean[i:i+2], 16) for i in (0, 2, 4))
        r, g, b = (int(c * (1.0 - amount)) for c in (r, g, b))
        return f"#{r:02X}{g:02X}{b:02X}"

    def generate_ass(self, motion_script: MotionScript) -> str:
        """Generates ASS subtitles from MotionScript."""
        width = motion_script.global_settings.canvas.width
        height = motion_script.global_settings.canvas.height
        
        # 1. Script Info Section
        ass_lines = [
            "[Script Info]",
            "; Script generated by MotionAI RenderEngine",
            "ScriptType: v4.00+",
            f"PlayResX: {width}",
            f"PlayResY: {height}",
            "ScaledBorderAndShadow: yes",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"
        ]

        # Load style preset settings
        from app.render.presets import StylePresetManager
        preset_name = getattr(motion_script.global_settings, "theme", None) or motion_script.global_settings.motion_preset
        preset = StylePresetManager.get_preset(preset_name)

        font_family = map_font_family(preset.typography.font)
        font_size = preset.typography.size
        base_color = self.hex_to_ass_abgr(preset.typography.color)
        outline = preset.typography.outline
        shadow = preset.typography.shadow
        margin_l = int(preset.safe_area.left)
        margin_r = int(preset.safe_area.right)
        margin_v = int(preset.safe_area.bottom)

        bold_str = str(preset.typography.weight)
        if bold_str.isdigit():
            bold_val = int(bold_str)
        elif bold_str.lower() in {"bold", "true"}:
            bold_val = -1
        else:
            bold_val = 0

        alignment = preset.typography.alignment
        alignment_code = 2
        if alignment == "left":
            alignment_code = 1
        elif alignment == "right":
            alignment_code = 3

        # Allow caption event payloads to override defaults (retains backward compatibility)
        caption_events = [e for e in motion_script.timeline if e.type == EventType.CAPTION]
        underline_val = 0
        spacing_val = 0.0
        text_transform = "none"
        background_style = "none"
        if caption_events:
            first_payload = caption_events[0].parsed_payload()
            font_family = map_font_family(getattr(first_payload, "font", font_family))
            font_size = getattr(first_payload, "size", font_size)

            color_hex = getattr(first_payload, "color", None)
            if color_hex:
                base_color = self.hex_to_ass_abgr(color_hex)

            alignment = getattr(first_payload, "alignment", alignment)
            if alignment == "left":
                alignment_code = 1
            elif alignment == "right":
                alignment_code = 3

            # Previously these three Style-line fields (Underline, Spacing)
            # were hardcoded to 0/0 regardless of what the user set in the
            # Text tab — underline and letter-spacing looked correct in the
            # live preview but silently never reached the ASS export.
            underline_val = -1 if getattr(first_payload, "underline", False) else 0
            spacing_val = getattr(first_payload, "letter_spacing", 0.0) or 0.0
            text_transform = getattr(first_payload, "text_transform", "none") or "none"
            background_style = getattr(first_payload, "background_style", "none") or "none"

        # Style definition line
        ass_lines.append(
            f"Style: Default,{font_family},{font_size},{base_color},&H000000FF,&H00000000,&H80000000,{bold_val},0,{underline_val},0,100,100,{spacing_val},0,1,{outline},{shadow},{alignment_code},{margin_l},{margin_r},{margin_v},1"
        )
        ass_lines.append("")
        ass_lines.append("[Events]")
        ass_lines.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text")


        # Compile timeline events
        highlight_events = [e for e in motion_script.timeline if e.type == EventType.HIGHLIGHT]

        for cap in caption_events:
            cap_payload = cap.parsed_payload()
            text = cap_payload.text
            cap_text_transform = getattr(cap_payload, "text_transform", "none") or "none"
            if cap_text_transform == "uppercase":
                text = text.upper()
            elif cap_text_transform == "lowercase":
                text = text.lower()
            elif cap_text_transform == "capitalize":
                text = text.title()
            words = text.split()
            
            # Find active highlights for this caption
            cap_highlights = [
                h for h in highlight_events 
                if h.start_ms < cap.end_ms and h.end_ms > cap.start_ms
            ]

            # Generate segment splits for dynamic word coloring and animations
            splits = {cap.start_ms, cap.end_ms}
            for h in cap_highlights:
                splits.add(max(h.start_ms, cap.start_ms))
                splits.add(min(h.end_ms, cap.end_ms))
            
            sorted_splits = sorted(list(splits))
            
            for t_start, t_end in zip(sorted_splits, sorted_splits[1:]):
                if t_start >= t_end:
                    continue

                # Which template built this timeline — read from the motion
                # script itself (set by the render-plan stage), not
                # re-derived from the style preset's own default. A project
                # can override its caption_template away from the preset
                # default, and re-deriving from the preset alone used to
                # silently render the wrong layout for those projects.
                used_template = getattr(motion_script.global_settings, "caption_template", None) or getattr(
                    preset.timing, "caption_template", "word_by_word"
                )
                is_staggered = used_template == "staggered_3line"
                is_glow_stack = used_template == "glow_stack"
                is_cartoon_stack = used_template == "cartoon_stack"
                is_serif_pop = used_template == "serif_pop"
                is_cinematic_emerald = used_template == "cinematic_emerald"
                staggered_layout = getattr(motion_script.global_settings, "staggered_layout", None) or getattr(
                    preset.timing, "staggered_layout", "splash"
                )

                if is_glow_stack:
                    # "3D glow stack" template — centered 3-line block:
                    # body lines in a rounded heavy sans, natural case,
                    # pure white with dark navy 3D extrusion; hero word in
                    # a condensed display font, ALL CAPS, gradient-blue
                    # fill approximated in ASS (no native gradients) as a
                    # light fill + deep border + a separate blurred glow
                    # layer beneath; plus a soft dark blurred backdrop
                    # blob (an ASS \p1 rectangle drawing) behind the whole
                    # block for readability over any footage.
                    k = None
                    keyword_payload = None
                    for h in cap_highlights:
                        h_payload = h.parsed_payload()
                        if getattr(h_payload, "is_keyword", False) and h_payload.indices:
                            k = h_payload.indices[0]
                            keyword_payload = h_payload
                            break
                    if k is None:
                        k = pick_keyword_idx(words)

                    line1_words = words[:k]
                    line2_text = words[k]
                    line3_words = words[k+1:]

                    active_idx = None
                    active_color_hex = None
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            if highlight_payload.indices:
                                active_idx = highlight_payload.indices[0]
                            color_hex = getattr(highlight_payload, "color", None)
                            if color_hex:
                                active_color_hex = color_hex

                    revealed_max = active_idx if active_idx is not None else 0
                    visible_l1 = [w for idx, w in enumerate(line1_words) if idx <= revealed_max]
                    has_l2 = (k <= revealed_max)
                    visible_l3 = [w for idx, w in enumerate(line3_words) if (k + 1 + idx) <= revealed_max]

                    size_normal = getattr(cap_payload, "size", font_size)
                    body_font = getattr(cap_payload, "font", None) or "Baloo 2"
                    keyword_size_scale = getattr(keyword_payload, "size_scale", None) or 1.7
                    size_large = size_normal * keyword_size_scale
                    keyword_font = getattr(keyword_payload, "font", None) or "Anton"

                    box_left, box_right = resolve_box_margins(cap_payload, margin_l, margin_r, width)
                    box_width = box_right - box_left

                    # Bounding box: shrink (never overflow) each line to fit.
                    def fit(sz: float, text: str) -> float:
                        if not text:
                            return sz
                        w_est = estimate_text_width(text, sz)
                        return sz * (box_width / w_est) if w_est > box_width else sz

                    size_l1 = fit(size_normal, " ".join(line1_words))
                    size_l3 = fit(size_normal, " ".join(line3_words))
                    size_large = fit(size_large, line2_text.upper())

                    y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                    base_y = int(height * y_pct / 100.0)
                    # Gap scales off the resolved (template-scaled) body
                    # size, not the raw preset size, so the rhythm stays
                    # proportional when the template bumps the base text up.
                    line_gap = size_normal * 1.15
                    Y_l1 = base_y - line_gap
                    Y_l2 = base_y
                    Y_l3 = base_y + line_gap

                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)

                    # The hero word's gradient is derived from the project's
                    # highlight color: light fill (the gradient's bright top
                    # reads as the overall tone in motion), deep border for
                    # the gradient's dark bottom edge, same hue glow.
                    hl_hex = active_color_hex or (preset.highlight.colors[0] if preset.highlight.colors else "#4FA8FF")
                    fill_abgr = self.hex_to_ass_abgr(self._lighten(hl_hex, 0.35))
                    border_abgr = self.hex_to_ass_abgr(self._darken(hl_hex, 0.45))
                    glow_abgr = self.hex_to_ass_abgr(hl_hex)

                    # Backdrop blob (layer 0): soft dark blurred rectangle
                    # behind the whole block. Drawn once per sub-interval so
                    # it fades with the same anim timing as the text.
                    blob_half_w = int(min(box_width, max(
                        estimate_text_width(" ".join(line1_words), size_l1),
                        estimate_text_width(line2_text.upper(), size_large),
                        estimate_text_width(" ".join(line3_words), size_l3),
                    ) * 0.75 + 60) / 2)
                    blob_half_h = int(line_gap * 1.9)
                    # Drawn with \an7 (top-left) and all-positive coordinates
                    # — libass places drawings with negative coordinates
                    # inconsistently across alignment modes, which shifted a
                    # center-anchored (-w..+w) rectangle visibly off-center.
                    blob_x = 540 - blob_half_w
                    blob_y = Y_l2 - blob_half_h
                    blob_tags = f"{{\\pos({blob_x},{int(blob_y)})\\an7\\1c&H201408&\\1a&H8C&\\bord0\\shad0\\blur30\\p1}}"
                    blob_draw = f"m 0 0 l {blob_half_w * 2} 0 {blob_half_w * 2} {blob_half_h * 2} 0 {blob_half_h * 2}{{\\p0}}"
                    ass_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{blob_tags}{blob_draw}")

                    # Body lines: white fill, dark navy border (the 3D
                    # extrusion tone), offset shadow for depth.
                    body_style = f"\\1c&HFFFFFF&\\3c&H4E2216&\\bord2\\shad4\\4c&H2E1A10&\\4a&H40&\\blur0.6"
                    if visible_l1:
                        l1_tags = f"{{\\pos(540,{int(Y_l1)})\\an5\\fn{body_font}\\fs{int(size_l1)}{body_style}\\b1}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l1_tags}{' '.join(visible_l1)}")

                    if has_l2:
                        # Glow halo (layer 1): same glyphs, transparent fill,
                        # thick blurred border in the highlight hue.
                        glow_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\1a&HFF&\\3c{glow_abgr}\\bord9\\blur14\\shad0}}"
                        ass_lines.append(f"Dialogue: 1,{start_str},{end_str},Default,,0,0,0,,{glow_tags}{line2_text.upper()}")
                        # Main hero word (layer 2).
                        hero_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\1c{fill_abgr}\\3c{border_abgr}\\bord3\\shad4\\4c&H101020&\\4a&H50&\\b1}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{hero_tags}{line2_text.upper()}")

                elif is_cartoon_stack:
                    k = None
                    keyword_payload = None
                    for h in cap_highlights:
                        h_payload = h.parsed_payload()
                        if getattr(h_payload, "is_keyword", False) and h_payload.indices:
                            k = h_payload.indices[0]
                            keyword_payload = h_payload
                            break
                    if k is None:
                        k = pick_keyword_idx(words)

                    line1_words = words[:k]
                    line2_text = words[k]
                    line3_words = words[k+1:]

                    active_idx = None
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            if highlight_payload.indices:
                                active_idx = highlight_payload.indices[0]

                    revealed_max = active_idx if active_idx is not None else 0
                    visible_l1 = [w for idx, w in enumerate(line1_words) if idx <= revealed_max]
                    has_l2 = (k <= revealed_max)
                    visible_l3 = [w for idx, w in enumerate(line3_words) if (k + 1 + idx) <= revealed_max]

                    size_normal = getattr(cap_payload, "size", font_size)
                    body_font = map_font_family("Caveat")
                    keyword_font = map_font_family("Fredoka")

                    size_normal = size_normal * 0.8
                    size_large = getattr(cap_payload, "size", font_size) * 1.6

                    box_left, box_right = resolve_box_margins(cap_payload, margin_l, margin_r, width)
                    box_width = box_right - box_left

                    def fit(sz: float, text: str) -> float:
                        if not text:
                            return sz
                        w_est = estimate_text_width(text, sz)
                        return sz * (box_width / w_est) if w_est > box_width else sz

                    size_l1 = fit(size_normal, " ".join(line1_words))
                    size_l3 = fit(size_normal, " ".join(line3_words))
                    size_large = fit(size_large, line2_text)

                    y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                    base_y = int(height * y_pct / 100.0)
                    line_gap = getattr(cap_payload, "size", font_size) * 0.8
                    Y_l1 = base_y - line_gap
                    Y_l2 = base_y
                    Y_l3 = base_y + line_gap

                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)

                    if visible_l1:
                        l1_tags = f"{{\\pos(540,{int(Y_l1)})\\an5\\fn{body_font}\\fs{int(size_l1)}\\c&HFFFFFF&\\bord0\\shad0\\b700}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l1_tags}{' '.join(visible_l1)}")

                    if has_l2:
                        l2_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\c&H00A6E0ED&\\3c&H001F2D4E&\\bord8\\shad5\\4c&H000000&\\4a&H70&\\blur0.8\\b700}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l2_tags}{line2_text}")

                    if visible_l3:
                        l3_tags = f"{{\\pos(540,{int(Y_l3)})\\an5\\fn{body_font}\\fs{int(size_l3)}\\c&HFFFFFF&\\bord0\\shad0\\b700}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l3_tags}{' '.join(visible_l3)}")

                elif is_serif_pop:
                    k = None
                    keyword_payload = None
                    for h in cap_highlights:
                        h_payload = h.parsed_payload()
                        if getattr(h_payload, "is_keyword", False) and h_payload.indices:
                            k = h_payload.indices[0]
                            keyword_payload = h_payload
                            break
                    if k is None:
                        k = pick_keyword_idx(words)

                    line1_words = words[:k]
                    line2_text = words[k]
                    line3_words = words[k+1:]

                    active_idx = None
                    active_color_abgr = None
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            if highlight_payload.indices:
                                active_idx = highlight_payload.indices[0]
                            color_hex = getattr(highlight_payload, "color", None)
                            if color_hex:
                                active_color_abgr = self.hex_to_ass_abgr(color_hex)

                    revealed_max = active_idx if active_idx is not None else 0
                    visible_l1 = [w for idx, w in enumerate(line1_words) if idx <= revealed_max]
                    has_l2 = (k <= revealed_max)
                    visible_l3 = [w for idx, w in enumerate(line3_words) if (k + 1 + idx) <= revealed_max]

                    size_normal = getattr(cap_payload, "size", font_size)
                    body_font = font_family
                    keyword_font = "Playfair Display"

                    size_l1 = size_normal
                    size_l3 = size_normal
                    size_large = size_normal * 1.8

                    box_left, box_right = resolve_box_margins(cap_payload, margin_l, margin_r, width)
                    box_width = box_right - box_left

                    def fit(sz: float, text: str) -> float:
                        if not text:
                            return sz
                        w_est = estimate_text_width(text, sz)
                        return sz * (box_width / w_est) if w_est > box_width else sz

                    size_l1 = fit(size_l1, " ".join(line1_words))
                    size_l3 = fit(size_l3, " ".join(line3_words))
                    size_large = fit(size_large, line2_text)

                    y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                    base_y = int(height * y_pct / 100.0)
                    line_gap = size_normal * 1.15
                    Y_l1 = base_y - line_gap
                    Y_l2 = base_y
                    Y_l3 = base_y + line_gap

                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)

                    hl_color = active_color_abgr or self.hex_to_ass_abgr("#FFEE00")
                    drop_shadow_tag = "\\bord0\\shad5\\4c&H000000&\\4a&H50&\\blur0.8"

                    if visible_l1:
                        l1_parts = []
                        for idx, w in enumerate(line1_words):
                            if idx <= revealed_max:
                                if idx == active_idx:
                                    l1_parts.append(f"{{\\c{hl_color}}}{w}{{\\c&HFFFFFF&}}")
                                else:
                                    l1_parts.append(w)
                        l1_str = " ".join(l1_parts)
                        l1_tags = f"{{\\pos(540,{int(Y_l1)})\\an5\\fn{body_font}\\fs{int(size_l1)}\\c&HFFFFFF&{drop_shadow_tag}\\b900}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l1_tags}{l1_str}")

                    if has_l2:
                        l2_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\c&HFFFFFF&{drop_shadow_tag}\\b900\\i1}}"
                        l2_str = f"{line2_text}{{\\c{hl_color}}}."
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l2_tags}{l2_str}")

                    if visible_l3:
                        l3_parts = []
                        for idx, w in enumerate(line3_words):
                            abs_idx = k + 1 + idx
                            if abs_idx <= revealed_max:
                                if abs_idx == active_idx:
                                    l3_parts.append(f"{{\\c{hl_color}}}{w}{{\\c&HFFFFFF&}}")
                                else:
                                    l3_parts.append(w)
                        l3_str = " ".join(l3_parts)
                        l3_tags = f"{{\\pos(540,{int(Y_l3)})\\an5\\fn{body_font}\\fs{int(size_l3)}\\c&HFFFFFF&{drop_shadow_tag}\\b900}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l3_tags}{l3_str}")

                elif is_cinematic_emerald:
                    k = None
                    keyword_payload = None
                    for h in cap_highlights:
                        h_payload = h.parsed_payload()
                        if getattr(h_payload, "is_keyword", False) and h_payload.indices:
                            k = h_payload.indices[0]
                            keyword_payload = h_payload
                            break
                    if k is None:
                        k = pick_keyword_idx(words)

                    line1_words = words[:k]
                    line2_text = words[k]
                    line3_words = words[k+1:]

                    active_idx = None
                    active_color_abgr = None
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            if highlight_payload.indices:
                                active_idx = highlight_payload.indices[0]
                            color_hex = getattr(highlight_payload, "color", None)
                            if color_hex:
                                active_color_abgr = self.hex_to_ass_abgr(color_hex)

                    revealed_max = active_idx if active_idx is not None else 0
                    visible_l1 = [w for idx, w in enumerate(line1_words) if idx <= revealed_max]
                    has_l2 = (k <= revealed_max)
                    visible_l3 = [w for idx, w in enumerate(line3_words) if (k + 1 + idx) <= revealed_max]

                    size_normal = getattr(cap_payload, "size", font_size)
                    body_font = font_family
                    keyword_font = "Playfair Display"

                    size_l1 = size_normal * 1.1
                    size_l3 = size_normal * 1.1
                    size_large = size_normal * 2.3

                    box_left, box_right = resolve_box_margins(cap_payload, margin_l, margin_r, width)
                    box_width = box_right - box_left

                    def fit(sz: float, text: str) -> float:
                        if not text:
                            return sz
                        w_est = estimate_text_width(text, sz)
                        return sz * (box_width / w_est) if w_est > box_width else sz

                    size_l1 = fit(size_l1, " ".join(line1_words))
                    size_l3 = fit(size_l3, " ".join(line3_words))
                    size_large = fit(size_large, line2_text)

                    y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                    base_y = int(height * y_pct / 100.0)
                    line_gap = size_normal * 0.8
                    Y_l1 = base_y - line_gap
                    Y_l2 = base_y
                    Y_l3 = base_y + line_gap

                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)

                    hl_color = active_color_abgr or self.hex_to_ass_abgr("#8CFF3E")
                    drop_shadow_tag = "\\bord0\\shad5\\4c&H000000&\\4a&H50&\\blur0.8"

                    if visible_l1:
                        l1_str = " ".join(visible_l1)
                        l1_tags = f"{{\\pos(540,{int(Y_l1)})\\an5\\fn{body_font}\\fs{int(size_l1)}\\c&HFFFFFF&{drop_shadow_tag}\\b600}}"
                        ass_lines.append(f"Dialogue: 1,{start_str},{end_str},Default,,0,0,0,,{l1_tags}{l1_str}")

                    if has_l2:
                        l2_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\c{hl_color}{drop_shadow_tag}\\b900\\i1}}"
                        ass_lines.append(f"Dialogue: 2,{start_str},{end_str},Default,,0,0,0,,{l2_tags}{line2_text}")

                    if visible_l3:
                        l3_str = " ".join(visible_l3)
                        l3_tags = f"{{\\pos(540,{int(Y_l3)})\\an5\\fn{body_font}\\fs{int(size_l3)}\\c&HFFFFFF&{drop_shadow_tag}\\b600}}"
                        ass_lines.append(f"Dialogue: 1,{start_str},{end_str},Default,,0,0,0,,{l3_tags}{l3_str}")

                elif is_staggered:
                    # 1. Staggered 3-line template generation
                    # Determine the keyword index k for the words in this caption segment.
                    # Prefer the render plan's own choice (recorded per-word on the
                    # highlight events via `is_keyword`, which itself honors the
                    # caption-planning LLM's `emphasis` field) so export never
                    # picks a different hero word than the live preview did.
                    # Also carry forward the render plan's resolved
                    # keyword font/weight/size — the template's opinion on
                    # how the hero word should look, baked in once upstream
                    # rather than re-guessed here.
                    k = None
                    keyword_payload = None
                    for h in cap_highlights:
                        h_payload = h.parsed_payload()
                        if getattr(h_payload, "is_keyword", False) and h_payload.indices:
                            k = h_payload.indices[0]
                            keyword_payload = h_payload
                            break
                    if k is None:
                        k = pick_keyword_idx(words)
                    
                    # Split words into 3 lines
                    line1_words = words[:k]
                    line2_text = words[k]
                    line3_words = words[k+1:]
                    
                    # Identify active highlighted index and color for this sub-interval
                    active_idx = None
                    active_color = None
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            if highlight_payload.indices:
                                active_idx = highlight_payload.indices[0]
                            color_hex = getattr(highlight_payload, "color", None)
                            if color_hex:
                                active_color = self.hex_to_ass_abgr(color_hex)

                    # Map indices:
                    # Words in Line 1 are from 0 to k-1
                    # Word in Line 2 is k
                    # Words in Line 3 are from k+1 onwards
                    
                    revealed_max = active_idx if active_idx is not None else 0
                    
                    # Construct lines showing words revealed up to revealed_max
                    visible_l1 = [w for idx, w in enumerate(line1_words) if idx <= revealed_max]
                    has_l2 = (k <= revealed_max)
                    visible_l3 = [w for idx, w in enumerate(line3_words) if (k + 1 + idx) <= revealed_max]
                    
                    # Determine sizes, weights, colors and dimensions.
                    # Line 1/3 ("non-highlighted") are ALWAYS plain white at a
                    # moderate weight, regardless of the project's chosen
                    # base color/weight — the highlighted word gets a
                    # distinct "shiny" color and much heavier weight, and the
                    # contrast between the two is the whole point. Letting
                    # line 1/3 inherit an arbitrary preset color risked it
                    # matching (or clashing with) the highlight color with no
                    # contrast at all.
                    size_normal = getattr(cap_payload, "size", font_size)
                    line13_color = self.hex_to_ass_abgr("#FFFFFF")
                    line13_weight = "700"

                    # Keyword ("hero word") is 1.5x the base size — see
                    # app.render.templates for the canonical ratio — heavier
                    # weight, and its own distinct font.
                    keyword_size_scale = getattr(keyword_payload, "size_scale", None) or 1.5
                    size_large = size_normal * keyword_size_scale
                    keyword_font = getattr(keyword_payload, "font", None) or font_family
                    keyword_weight_str = str(getattr(keyword_payload, "weight", None) or "900")
                    bold_large = keyword_weight_str if keyword_weight_str.isdigit() else "900"

                    # Width estimation of Line 2
                    W2 = estimate_text_width(line2_text.upper(), size_large)

                    # Bounding box: captions must never render past a decent
                    # margin from the screen edges. margin_l/margin_r come
                    # from the style's safe_area, same as the rest of the
                    # export. Line 1/3 sizes are shrunk (never repositioned
                    # off their keyword-synced anchor — see below) just
                    # enough to keep their full (not just currently-revealed)
                    # text inside this box.
                    box_left, box_right = resolve_box_margins(cap_payload, margin_l, margin_r, width)

                    # Vertical position calculations: ensure they appear at the chosen y-axis height
                    y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                    base_y = int(height * y_pct / 100.0)
                    # Tighter vertical rhythm — 1.45x line height left more
                    # empty space between lines than text on screen,
                    # especially once cards regularly hold their full
                    # word_limit instead of 1-2 stray words.
                    line_gap = font_size * 1.1
                    
                    has_any_l1 = len(line1_words) > 0
                    has_any_l3 = len(line3_words) > 0
                    
                    # Balance calculations
                    if not has_any_l1:
                        Y_l2 = base_y - line_gap / 2
                        Y_l3 = base_y + line_gap / 2
                        Y_l1 = Y_l2 - line_gap
                    elif not has_any_l3:
                        Y_l1 = base_y - line_gap / 2
                        Y_l2 = base_y + line_gap / 2
                        Y_l3 = Y_l2 + line_gap
                    else:
                        Y_l1 = base_y - line_gap
                        Y_l2 = base_y
                        Y_l3 = base_y + line_gap

                    # Animation presets
                    anim_preset = getattr(cap_payload, "animation", "fade")
                    if hasattr(anim_preset, "value"):
                        anim_preset = anim_preset.value
                    else:
                        anim_preset = str(anim_preset)

                    anim_tags = ""
                    is_first_seg = (t_start == cap.start_ms)
                    is_last_seg = (t_end == cap.end_ms)

                    if anim_preset == "fade":
                        fade_in = 150 if is_first_seg else 0
                        fade_out = 150 if is_last_seg else 0
                        if fade_in > 0 or fade_out > 0:
                            anim_tags = f"\\fad({fade_in},{fade_out})"
                    elif is_first_seg:
                        if anim_preset == "pop":
                            anim_tags = "\\fscx110\\fscy110\\t(0,100,\\fscx100\\fscy100)"
                        elif anim_preset == "scale":
                            anim_tags = "\\fscx0\\fscy0\\t(0,150,\\fscx100\\fscy100)"
                        elif anim_preset == "bounce":
                            anim_tags = "\\t(0,100,\\fscy115\\fscx105)\\t(100,200,\\fscy100\\fscx100)"
                        elif anim_preset == "rotate":
                            anim_tags = "\\frz-5\\t(0,150,\\frz0)"
                        elif anim_preset == "elastic":
                            anim_tags = "\\fscx0\\fscy0\\t(0,100,\\fscx120\\fscy120)\\t(100,180,\\fscx95\\fscy95)\\t(180,250,\\fscx100\\fscy100)"

                    if anim_tags:
                        anim_tags = "{" + anim_tags + "}"

                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)
                    base_outline_tag = f"\\bord{outline}\\shad{shadow}"

                    is_centre = staggered_layout == "centre"

                    # Line 1/3 sizes start at size_normal and only ever
                    # shrink (never reposition off their keyword-synced
                    # anchor) just enough to keep the FULL final text inside
                    # the bounding box.
                    size_l1 = size_normal
                    size_l3 = size_normal

                    if is_centre:
                        X_l1, an_l1 = 540, 5
                        X_l3, an_l3 = 540, 5
                    else:
                        # "splash": line 1's FIRST letter syncs with the
                        # keyword's FIRST letter — anchor at the LEFT edge
                        # (an4) positioned at the keyword's own left edge.
                        X_l1, an_l1 = int(540 - W2 / 2), 4
                        if X_l1 < box_left:
                            X_l1 = box_left
                        full_l1_text = " ".join(line1_words)
                        if full_l1_text:
                            full_l1_width = estimate_text_width(full_l1_text, size_l1)
                            available_l1 = box_right - X_l1
                            if 0 < available_l1 < full_l1_width:
                                size_l1 = size_normal * (available_l1 / full_l1_width)

                        # Line 3's LAST letter syncs with the keyword's LAST
                        # letter — anchor at the RIGHT edge (an6) positioned
                        # at the keyword's own right edge. As more of line 3
                        # reveals, it grows backward (leftward) from this
                        # fixed point, which is exactly what keeps its last
                        # word permanently aligned with the keyword's edge.
                        X_l3, an_l3 = int(540 + W2 / 2), 6
                        if X_l3 > box_right:
                            X_l3 = box_right
                        full_l3_text = " ".join(line3_words)
                        if full_l3_text:
                            full_l3_width = estimate_text_width(full_l3_text, size_l3)
                            available_l3 = X_l3 - box_left
                            if 0 < available_l3 < full_l3_width:
                                size_l3 = size_normal * (available_l3 / full_l3_width)

                    # Output Line 1 Dialogue event
                    if has_any_l1 and visible_l1:
                        l1_str = " ".join(visible_l1)
                        l1_tags = f"{{\\pos({X_l1},{int(Y_l1)})\\an{an_l1}\\fn{font_family}\\fs{int(size_l1)}\\c{line13_color}{base_outline_tag}\\b{line13_weight}}}{anim_tags}"
                        ass_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{l1_tags}{l1_str}")

                    # Output Line 2 Dialogue event (centered, capitalized, highlighted, hero-styled)
                    if has_l2:
                        highlight_color_abgr = active_color or self.hex_to_ass_abgr(preset.highlight.colors[0] if preset.highlight.colors else "#C5FF00")
                        l2_tags = f"{{\\pos(540,{int(Y_l2)})\\an5\\fn{keyword_font}\\fs{int(size_large)}\\c{highlight_color_abgr}{base_outline_tag}\\b{bold_large}}}{anim_tags}"
                        ass_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{l2_tags}{line2_text.upper()}")

                    # Output Line 3 Dialogue event
                    if has_any_l3 and visible_l3:
                        l3_str = " ".join(visible_l3)
                        l3_tags = f"{{\\pos({X_l3},{int(Y_l3)})\\an{an_l3}\\fn{font_family}\\fs{int(size_l3)}\\c{line13_color}{base_outline_tag}\\b{line13_weight}}}{anim_tags}"
                        ass_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{l3_tags}{l3_str}")

                else:
                    # 2. Standard baseline subtitle generation (karaoke highlighting)
                    # Identify which words should be highlighted in this sub-interval
                    active_color = None
                    highlighted_indices = set()
                    for h in cap_highlights:
                        if h.start_ms <= t_start and h.end_ms >= t_end:
                            highlight_payload = h.parsed_payload()
                            highlighted_indices.update(highlight_payload.indices)
                            active_color = self.hex_to_ass_abgr(highlight_payload.color)

                    # Format the text with ASS tags
                    formatted_words = []
                    for idx, w in enumerate(words):
                        if idx in highlighted_indices and active_color:
                            # Determine highlight color with rotating support
                            if len(preset.highlight.colors) > 1:
                                color_idx = idx % len(preset.highlight.colors)
                                word_color = self.hex_to_ass_abgr(preset.highlight.colors[color_idx])
                            else:
                                word_color = active_color
                            
                            # Apply subtle scale-up for active word pop animation (e.g. Hormozi captions style)
                            if preset.animation.motion_preset in {"dynamic", "smooth"}:
                                formatted_words.append(f"{{\\1c{word_color}\\fscx115\\fscy115}}{w}{{\\1c{base_color}\\fscx100\\fscy100}}")
                            else:
                                formatted_words.append(f"{{\\1c{word_color}}}{w}{{\\1c{base_color}}}")
                        else:
                            formatted_words.append(w)
                    
                    segment_text = " ".join(formatted_words)
                    
                    # Apply Animation Preset tags
                    anim_preset = getattr(cap_payload, "animation", "fade")
                    if hasattr(anim_preset, "value"):
                        anim_preset = anim_preset.value
                    else:
                        anim_preset = str(anim_preset)

                    anim_tags = ""
                    is_first_seg = (t_start == cap.start_ms)
                    is_last_seg = (t_end == cap.end_ms)

                    if anim_preset == "fade":
                        fade_in = 150 if is_first_seg else 0
                        fade_out = 150 if is_last_seg else 0
                        if fade_in > 0 or fade_out > 0:
                            anim_tags = f"{{\\fad({fade_in},{fade_out})}}"
                    elif is_first_seg:
                        if anim_preset == "pop":
                            anim_tags = "{\\fscx110\\fscy110}{\\t(0,100,\\fscx100\\fscy100)}"
                        elif anim_preset == "scale":
                            anim_tags = "{\\fscx0\\fscy0}{\\t(0,150,\\fscx100\\fscy100)}"
                        elif anim_preset == "slide":
                            anim_tags = "{\\an2}{\\move(540,1000,540,960,0,200)}"
                        elif anim_preset == "bounce":
                            anim_tags = "{\\t(0,100,\\fscy115\\fscx105)}{\\t(100,200,\\fscy100\\fscx100)}"
                        elif anim_preset == "rotate":
                            anim_tags = "{\\frz-5}{\\t(0,150,\\frz0)}"
                        elif anim_preset == "elastic":
                            anim_tags = "{\\fscx0\\fscy0}{\\t(0,100,\\fscx120\\fscy120)}{\\t(100,180,\\fscx95\\fscy95)}{\\t(180,250,\\fscx100\\fscy100)}"
                    
                    start_str = self.ms_to_ass_time(t_start)
                    end_str = self.ms_to_ass_time(t_end)

                    # Background Box: previously a fully-wired Text-tab
                    # toggle (Pill / Shadow Box) that rendered nothing at
                    # all in either exporter. Approximated here as a
                    # semi-transparent rounded \p1 rectangle drawn behind
                    # the text, sized to the estimated text width — needs
                    # an explicit \pos to anchor the box, so this branch's
                    # text line now carries the same \pos rather than
                    # relying on the Style line's implicit margin-based
                    # position (equivalent visual result, just explicit).
                    if background_style != "none":
                        y_pct = getattr(preset.typography, "y_position_percent", 71.4) or 71.4
                        box_y = int(height * y_pct / 100.0)
                        box_text_w = estimate_text_width(text, font_size)
                        pad_x, pad_y = 28, 18
                        box_half_w = int(box_text_w / 2) + pad_x
                        box_half_h = int(font_size / 2) + pad_y
                        box_x = width // 2
                        corner = 24 if background_style == "pill" else 8
                        fill_alpha = "&H40&" if background_style == "pill" else "&H60&"
                        box_left_px = box_x - box_half_w
                        box_top_px = box_y - box_half_h
                        box_tags = f"{{\\pos({box_left_px},{box_top_px})\\an7\\1c&H1A1A1A&\\1a{fill_alpha}\\bord0\\shad0}}"
                        box_draw = (
                            f"m {corner} 0 l {box_half_w * 2 - corner} 0 "
                            f"b {box_half_w * 2} 0 {box_half_w * 2} 0 {box_half_w * 2} {corner} "
                            f"l {box_half_w * 2} {box_half_h * 2 - corner} "
                            f"b {box_half_w * 2} {box_half_h * 2} {box_half_w * 2} {box_half_h * 2} {box_half_w * 2 - corner} {box_half_h * 2} "
                            f"l {corner} {box_half_h * 2} "
                            f"b 0 {box_half_h * 2} 0 {box_half_h * 2} 0 {box_half_h * 2 - corner} "
                            f"l 0 {corner} "
                            f"b 0 0 0 0 {corner} 0{{\\p0}}"
                        )
                        ass_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{box_tags}{{\\p1}}{box_draw}")
                        text_pos_tag = f"{{\\pos({box_x},{box_y})}}"
                    else:
                        text_pos_tag = ""

                    full_text = f"{text_pos_tag}{anim_tags}{segment_text}"
                    # No \pos here (unlike the background-box path above),
                    # so libass wraps this line using the Dialogue's own
                    # MarginL/MarginR — a per-caption box override (Phase C)
                    # narrows/widens that wrap width by overriding them
                    # in-line instead of falling through to the Style
                    # line's global margins (the "0,0" default below).
                    cap_box = getattr(cap_payload, "box", None)
                    dialogue_margin_l = int(cap_box.left) if cap_box is not None else margin_l
                    dialogue_margin_r = int(cap_box.right) if cap_box is not None else margin_r
                    ass_lines.append(
                        f"Dialogue: 0,{start_str},{end_str},Default,,{dialogue_margin_l},{dialogue_margin_r},0,,{full_text}"
                    )

        return "\n".join(ass_lines)

    def probe_metadata(self, filepath: str) -> dict:
        """Uses ffprobe to extract video metadata."""
        cmd = [
            self.ffprobe_binary,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,codec_name,duration",
            "-show_entries", "format=size,duration",
            "-of", "json",
            filepath
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            data = json.loads(res.stdout)
            stream = data.get("streams", [{}])[0]
            fmt = data.get("format", {})
            # format=duration wasn't actually requested before, so this always
            # fell back to 0.0 regardless of the real video length — for
            # render_remotion() that meant duration_frames rounded to 0/1,
            # so the Remotion overlay only ever rendered a single blank
            # frame and every caption silently vanished from the export.
            # format.duration is the reliable one (stream.duration can be
            # missing depending on container/muxer); fall back to the
            # stream value if format ever lacks it.
            duration_s = fmt.get("duration", stream.get("duration", 0.0))
            return {
                "width": stream.get("width"),
                "height": stream.get("height"),
                "codec": stream.get("codec_name"),
                "duration_s": float(duration_s or 0.0),
                "size_bytes": int(fmt.get("size", 0)),
            }
        except Exception as exc:
            # Safe fallbacks if ffprobe fails or is missing locally
            return {
                "width": 1080,
                "height": 1920,
                "codec": "h264",
                "duration_s": 0.0,
                "size_bytes": 0,
            }

    def render(
        self,
        motion_script: MotionScript,
        video_path: str,
        output_path: str,
        progress_callback=None
    ) -> dict:
        """Executes the pipeline stages to render a video with subtitles."""
        from app.core.config import get_settings
        settings = get_settings()

        # Remotion is now the primary rendering engine for every template
        # that has a real per-template layout (the "advanced" family below)
        # — these used to render through the ASS/libass path, which can't
        # express gradients, blurred glows, or CSS-quality typography and
        # forced every effect to be approximated with ASS tag hacks. The
        # ASS path remains as the renderer for the plain word_by_word /
        # sentence_highlight / sentence_clean templates, which have no
        # layered look worth the extra Remotion render cost.
        used_template = getattr(motion_script.global_settings, "caption_template", None)
        is_advanced_template = used_template in {
            "cinematic_emerald",
            "staggered_3line",
            "glow_stack",
            "cartoon_stack",
            "serif_pop",
        }

        if settings.use_remotion_render and is_advanced_template:
            return self.render_remotion(motion_script, video_path, output_path, progress_callback)
        else:
            return self.render_ass(motion_script, video_path, output_path, progress_callback)

    def render_remotion(
        self,
        motion_script: MotionScript,
        video_path: str,
        output_path: str,
        progress_callback=None
    ) -> dict:
        if progress_callback:
            progress_callback("Preparing Remotion Render", 5)

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Input video not found: {video_path}")

        meta = self.probe_metadata(video_path)
        duration_s = meta.get("duration_s", 10.0)
        # Default to 30 fps
        fps = 30
        duration_frames = max(1, int(duration_s * fps))

        # Write temp input props JSON
        temp_json = Path(output_path).with_suffix(".json")
        motion_script_dict = motion_script.model_dump(mode="json")
        # Root.tsx's calculateMetadata reads these to size the composition —
        # without them it falls back to the hardcoded 150-frame (5s) default
        # and Remotion rejects any --frames range beyond that.
        motion_script_dict["duration_frames"] = duration_frames
        motion_script_dict["fps"] = fps
        with open(temp_json, "w", encoding="utf-8") as f:
            json.dump(motion_script_dict, f)

        # Generate transparent overlay (ProRes 4444, not WebM/VP9)
        if progress_callback:
            progress_callback("Rendering transparent overlay in Remotion", 20)

        temp_overlay = Path(output_path).with_name(f"temp_overlay_{int(time.time())}.mov")
        repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        remotion_dir = repo_root / "apps" / "remotion-pipeline"

        remotion_cmd = [
            "npx", "remotion", "render",
            "Subtitles",
            str(temp_overlay.resolve()),
            f"--props={str(temp_json.resolve())}",
            # codec=vp9 + pixel-format=yuva420p is the documented way to get
            # a transparent WebM, but empirically this Remotion/ffmpeg build
            # silently ignores --pixel-format for vp9's "pre-encoded" fast
            # path and always emits an opaque yuv420p WebM — every frame of
            # the "transparent" overlay was actually a solid rectangle, so
            # the FFmpeg `overlay` merge below painted over the entire
            # source video and produced a black screen. ProRes 4444 with
            # yuva444p10le reliably keeps its alpha channel end to end
            # (verified via ffprobe), so we use that as the overlay
            # intermediate instead — same visual result, no format-specific
            # alpha bug.
            "--codec=prores",
            "--prores-profile=4444",
            "--image-format=png",
            "--pixel-format=yuva444p10le",
            f"--width={meta.get('width', 1080)}",
            f"--height={meta.get('height', 1920)}",
            # durationInFrames is exclusive of the end index (valid frames
            # are 0..duration_frames-1) — requesting duration_frames itself
            # is one past the end and Remotion rejects the whole range.
            f"--frames=0-{duration_frames - 1}"
        ]

        start_time = time.monotonic()
        try:
            # Run remotion CLI
            # shell=True + a list argv only round-trips correctly on Windows
            # (subprocess uses list2cmdline() to rebuild a command line, and
            # npx needs shell resolution there to find its .cmd shim). On
            # POSIX, shell=True with a sequence arg silently only passes
            # remotion_cmd[0] ("npx") to sh -c and turns everything else
            # into positional shell parameters ($0, $1, ...) instead of
            # actual npx arguments — every Remotion render would silently
            # run bare `npx` with no args on Linux (i.e. prod). PATH-based
            # lookup of `npx` works fine under shell=False on POSIX, so
            # only enable the shell on Windows where it's actually needed.
            subprocess.run(
                remotion_cmd,
                cwd=str(remotion_dir.resolve()),
                shell=(os.name == "nt"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True
            )
        except subprocess.CalledProcessError as err:
            if temp_json.exists():
                temp_json.unlink()
            if temp_overlay.exists():
                temp_overlay.unlink()
            raise RuntimeError(f"Remotion render failure: {err.stderr.decode(errors='replace')}") from err

        # Merge original video and transparent overlay using FFmpeg
        if progress_callback:
            progress_callback("Merging layers with FFmpeg", 65)

        ffmpeg_cmd = [
            self.ffmpeg_binary,
            "-y",
            "-i", video_path,
            "-i", str(temp_overlay.resolve()),
            "-filter_complex", "[0:v][1:v]overlay[outv]",
            "-map", "[outv]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            output_path
        ]

        try:
            subprocess.run(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True
            )
        except subprocess.CalledProcessError as err:
            raise RuntimeError(f"FFmpeg layer merge failure: {err.stderr.decode(errors='replace')}") from err
        finally:
            # Clean up temp files
            if temp_json.exists():
                temp_json.unlink()
            if temp_overlay.exists():
                temp_overlay.unlink()

        render_duration_ms = int((time.monotonic() - start_time) * 1000)

        # Probe final output details
        out_meta = self.probe_metadata(output_path)
        out_meta["render_duration_ms"] = render_duration_ms

        return out_meta

    def render_ass(
        self,
        motion_script: MotionScript,
        video_path: str,
        output_path: str,
        progress_callback=None
    ) -> dict:
        if progress_callback:
            progress_callback("Preparing ASS Render", 5)

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Input video not found: {video_path}")

        # Stage 5: Generate ASS Subtitles
        if progress_callback:
            progress_callback("Generating ASS", 15)
        ass_content = self.generate_ass(motion_script)
        
        # Save temporary ASS file
        temp_ass = Path(output_path).with_suffix(".ass")
        temp_ass.write_text(ass_content, encoding="utf-8")
        
        # Stage 6: Prepare FFmpeg filter graph
        if progress_callback:
            progress_callback("Rendering", 30)

        width = motion_script.global_settings.canvas.width
        height = motion_script.global_settings.canvas.height
        
        # Escape path for FFmpeg subtitles filter
        ass_filter_path = str(temp_ass.resolve()).replace("\\", "/").replace(":", "\\:")
        repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        fonts_dir = str(repo_root / "fonts").replace("\\", "/")
        fonts_dir_escaped = fonts_dir.replace(":", "\\:")
        filter_graph = (
            f"scale=w={width}:h={height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
            f"subtitles='{ass_filter_path}':fontsdir='{fonts_dir_escaped}'"
        )

        # Stage 7-12: Execute rendering and encoding
        cmd = [
            self.ffmpeg_binary,
            "-y",
            "-i", video_path,
            "-vf", filter_graph,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            output_path
        ]

        if progress_callback:
            progress_callback("Encoding", 60)

        start_time = time.monotonic()
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as err:
            if temp_ass.exists():
                temp_ass.unlink()
            raise RuntimeError(f"FFmpeg render failure: {err.stderr.decode(errors='replace')}") from err

        render_duration_ms = int((time.monotonic() - start_time) * 1000)

        # Clean up temporary ASS file
        if temp_ass.exists():
            temp_ass.unlink()

        # Probe output details
        meta = self.probe_metadata(output_path)
        meta["render_duration_ms"] = render_duration_ms

        return meta
