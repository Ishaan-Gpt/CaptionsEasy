"""Dummy RenderPlanProvider. Source: Sprint 1.4 brief > Dummy Providers.

Builds a high-quality, schema-valid RenderPlan applying advanced Style presets,
smart captioning, emotion mapping, hook detection, and timing engine rules.
"""

import time
import re
from datetime import datetime, timezone
from typing import Optional

from app.ai.providers.stage_providers import ProviderOutput, RenderPlanProvider
from app.ai.types import ProviderUsage
from app.render.presets import StylePresetManager
from packages.contracts.python import CaptionPlan, CreativePlan, Transcript  # type: ignore[import-not-found]

DUMMY_MODEL_NAME = "dummy-render-plan-v2"


def normalize_word(w: str) -> str:
    return re.sub(r'[^\w]', '', w).lower()


def is_capitalized(word: str) -> bool:
    clean = re.sub(r'^[^\w]+', '', word)
    return len(clean) > 0 and clean[0].isupper()


def is_number(word: str) -> bool:
    clean = re.sub(r'[^\w\.\,\$\%]', '', word)
    return bool(re.search(r'\d', clean))


MONTHS = {
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
    "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december"
}


def is_month(word: str) -> bool:
    return normalize_word(word) in MONTHS


def is_abbreviation(word: str) -> bool:
    clean = re.sub(r'[^\w]', '', word)
    if len(clean) <= 1:
        return False
    if clean.isupper():
        return True
    upper_count = sum(1 for c in clean if c.isupper())
    if upper_count >= 2 and len(clean) <= 6:
        return True
    return False


def should_prevent_split(w1: str, w2: str) -> bool:
    if is_abbreviation(w1) or is_abbreviation(w2):
        return True
    if is_number(w1) or is_number(w2):
        return True
    if (is_month(w1) and is_number(w2)) or (is_number(w1) and is_month(w2)):
        return True
    if is_capitalized(w1) and is_capitalized(w2):
        return True
    return False


def get_segment_word_timings(segment, tx_words, last_tx_idx):
    seg_words = segment.text.split()
    n_seg = len(seg_words)
    if n_seg == 0:
        return [], last_tx_idx

    best_match_idx = -1
    for start_idx in range(last_tx_idx, min(last_tx_idx + 35, len(tx_words))):
        match_count = 0
        for offset in range(min(n_seg, len(tx_words) - start_idx)):
            if normalize_word(tx_words[start_idx + offset].text) == normalize_word(seg_words[offset]):
                match_count += 1
        if match_count >= min(3, n_seg) or match_count == n_seg:
            best_match_idx = start_idx
            break

    word_timings = []
    if best_match_idx != -1:
        for i in range(n_seg):
            tx_word_idx = best_match_idx + i
            if tx_word_idx < len(tx_words):
                tw = tx_words[tx_word_idx]
                word_timings.append((seg_words[i], tw.start_ms, tw.end_ms))
            else:
                prev_end = word_timings[-1][2] if word_timings else segment.start_ms
                word_timings.append((seg_words[i], prev_end, prev_end + 300))
        last_tx_idx = best_match_idx + n_seg
    else:
        duration = segment.end_ms - segment.start_ms
        word_duration = duration / n_seg
        for i in range(n_seg):
            w_start = int(segment.start_ms + i * word_duration)
            w_end = int(w_start + word_duration)
            word_timings.append((seg_words[i], w_start, w_end))
            
    return word_timings, last_tx_idx


def group_words(word_timings, word_limit, max_chars=24):
    groups = []
    current_group = []
    
    i = 0
    while i < len(word_timings):
        word, start_ms, end_ms = word_timings[i]
        current_group.append((word, start_ms, end_ms))
        
        if i + 1 < len(word_timings):
            next_word, next_start, next_end = word_timings[i+1]
            current_text = " ".join([item[0] for item in current_group])
            projected_text = current_text + " " + next_word
            
            force_split = False
            prevent_split = should_prevent_split(word, next_word)
            
            if len(projected_text) > max_chars:
                if not prevent_split:
                    force_split = True
                elif len(projected_text) > max_chars * 1.5:
                    force_split = True
            
            if len(current_group) >= word_limit:
                if not prevent_split:
                    force_split = True
            
            ends_with_punc = word[-1] in {'.', ',', '!', '?', ';'}
            if ends_with_punc and not prevent_split:
                force_split = True
                
            if force_split:
                groups.append(current_group)
                current_group = []
        i += 1
        
    if current_group:
        groups.append(current_group)
        
    if len(groups) > 1 and len(groups[-1]) == 1:
        last_word = groups.pop()
        groups[-1].extend(last_word)
        
    j = 0
    while j < len(groups):
        if len(groups[j]) == 1 and j > 0:
            prev_text = " ".join([item[0] for item in groups[j-1]])
            curr_text = groups[j][0][0]
            if len(prev_text + " " + curr_text) <= max_chars * 1.4:
                word_to_merge = groups.pop(j)
                groups[j-1].extend(word_to_merge)
                continue
        j += 1
        
    return groups


def analyze_text_features(text: str, is_first_segment: bool, elapsed_time_ms: int) -> dict:
    text_lower = text.lower()
    features = {
        "is_hook": False,
        "is_cta": False,
        "is_surprise": False,
        "is_question": False,
        "is_pattern_interrupt": False
    }
    
    hook_keywords = {"did you know", "stop doing", "never", "how to", "this is why", "secret", "reveal"}
    if is_first_segment or elapsed_time_ms < 4000 or any(kw in text_lower for kw in hook_keywords):
        features["is_hook"] = True
        
    cta_keywords = {"subscribe", "follow", "comment", "link in", "share", "check out", "join"}
    if any(kw in text_lower for kw in cta_keywords):
        features["is_cta"] = True
        
    surprise_keywords = {"wow", "amazing", "insane", "unbelievable", "crazy", "shocking", "omg"}
    if "!" in text or any(kw in text_lower for kw in surprise_keywords):
        features["is_surprise"] = True
        
    if "?" in text or text_lower.startswith(("why", "how", "what", "where", "who", "when", "can", "is")):
        features["is_question"] = True
        
    if elapsed_time_ms > 0 and (elapsed_time_ms // 12000) % 2 == 1:
        features["is_pattern_interrupt"] = True
        
    return features


class DummyRenderPlanProvider(RenderPlanProvider):
    async def plan(
        self,
        *,
        transcript: Transcript,
        creative_plan: CreativePlan,
        caption_plan: CaptionPlan,
        project_id: str,
        video_id: str,
        style: Optional[str] = None,
        caption_template: Optional[str] = None,
    ) -> ProviderOutput:
        start = time.monotonic()

        preset = StylePresetManager.get_preset(style)

        # Resolve caption template setting
        template = caption_template or getattr(preset.timing, "caption_template", "word_by_word")

        # 1. Gather Emotion Overrides
        emotion = (creative_plan.emotion or "neutral").lower()
        speaking_style = (creative_plan.speaking_style or "clear").lower()
        
        font_size = preset.typography.size
        animation = preset.animation.caption_animation
        highlight_color = preset.highlight.colors[0] if preset.highlight.colors else "#FFFF00"
        
        # Apply emotion factors
        if emotion in {"excited", "happy", "joyful"} or speaking_style in {"energetic", "fast"}:
            font_size *= 1.25
            animation = "bounce"
        elif emotion in {"serious", "sad", "angry", "fearful"} or speaking_style in {"slow", "monotone"}:
            font_size *= 0.85
            animation = "fade"
            highlight_color = preset.typography.color # mute highlight

        timeline = []
        event_counter = 1
        last_tx_idx = 0
        elapsed_time_ms = 0
        
        # Evaluation tracking
        single_word_lines_count = 0
        name_splits_count = 0
        flashing_captions_count = 0

        # Process each segment
        for segment_idx, segment in enumerate(caption_plan.caption_segments):
            is_first = (segment_idx == 0)
            
            # Align with transcript timestamps
            word_timings, last_tx_idx = get_segment_word_timings(
                segment, transcript.words, last_tx_idx
            )
            
            # Group words using template rules
            if template == "word_by_word":
                word_limit_to_use = 1
                max_chars = 20
            else:  # sentence_highlight or sentence_clean
                word_limit_to_use = 8
                max_chars = 36

            groups = group_words(word_timings, word_limit_to_use, max_chars)

            for g_idx, group in enumerate(groups):
                group_words_text = [item[0] for item in group]
                group_text = " ".join(group_words_text)
                
                g_start = group[0][1]
                g_end = group[-1][2] - preset.timing.caption_spacing_ms
                
                # Check metrics before modifications
                if len(group_words_text) == 1:
                    single_word_lines_count += 1
                if len(group_words_text) > 1:
                    for w_idx in range(len(group_words_text) - 1):
                        if is_capitalized(group_words_text[w_idx]) and is_capitalized(group_words_text[w_idx+1]):
                            # if split prevented, it was good. Otherwise would be name split
                            pass
                            
                orig_duration = g_end - g_start
                if orig_duration < 250:
                    flashing_captions_count += 1

                # Apply Timing Engine constraints
                # Avoid flashing: ensure minimum duration of 250ms
                if g_end - g_start < 250:
                    g_end = g_start + 250
                    
                # Hook & Feature Detection
                features = analyze_text_features(group_text, is_first and g_idx == 0, elapsed_time_ms)
                
                curr_text = group_text
                curr_size = font_size
                curr_color = preset.typography.color
                curr_anim = animation
                
                # Apply Hook / Feature Modifications
                if features["is_cta"]:
                    curr_text = curr_text.upper()
                    curr_color = "#00FF00" # Green CTA accent
                    curr_size = font_size * 1.15
                    curr_anim = "pop"
                elif features["is_hook"]:
                    curr_text = curr_text.upper()
                    curr_color = highlight_color
                    curr_size = font_size * 1.25
                    curr_anim = "bounce"
                elif features["is_surprise"]:
                    curr_text = curr_text.upper()
                    curr_size = font_size * 1.2
                    curr_anim = "pop"
                elif features["is_question"]:
                    curr_color = "#00FFFF" # Cyan interrogative accent
                    curr_anim = "slide"
                elif features["is_pattern_interrupt"]:
                    curr_size = font_size * 1.1
                    curr_color = highlight_color
                else:
                    # Regular highlighted coloring
                    if template == "word_by_word" and preset.highlight.colors:
                        curr_color = preset.highlight.colors[g_idx % len(preset.highlight.colors)]
                    elif preset.highlight.colors and segment.emphasis:
                        curr_color = highlight_color

                # Append emoji suggestion if requested by style preset and exists
                emoji_suffix = ""
                if preset.emoji.behavior != "none" and segment.emoji_suggestions:
                    if preset.emoji.behavior == "frequent" or (preset.emoji.behavior == "occasional" and g_idx == 0):
                        emoji_suffix = " " + " ".join(segment.emoji_suggestions[:1])

                timeline.append({
                    "id": f"evt-{event_counter}",
                    "start_ms": g_start,
                    "end_ms": g_end,
                    "layer": "captions",
                    "type": "caption",
                    "payload": {
                        "text": curr_text + emoji_suffix,
                        "font": preset.typography.font,
                        "size": curr_size,
                        "weight": preset.typography.weight,
                        "color": curr_color,
                        "alignment": preset.typography.alignment,
                        "animation": curr_anim,
                    },
                })
                event_counter += 1

                # Generate highlight events for each word in the group
                if template == "sentence_highlight":
                    for w_idx, (w_text, w_start, w_end) in enumerate(group):
                        # Ensure word highlights fit within the clamped caption boundaries
                        h_start = max(w_start, g_start)
                        h_end = min(w_end, g_end)
                        # For the last word, align its highlight end with the end of the caption event
                        if w_idx == len(group) - 1:
                            h_end = g_end
                        
                        if h_start < h_end:
                            timeline.append({
                                "id": f"evt-{event_counter}",
                                "start_ms": h_start,
                                "end_ms": h_end,
                                "layer": "highlights",
                                "type": "highlight",
                                "payload": {
                                    "indices": [w_idx],
                                    "color": highlight_color,
                                    "animation": "pop",
                                }
                            })
                            event_counter += 1

                elapsed_time_ms = g_end

        # Separate captions and highlights
        captions = [e for e in timeline if e["type"] == "caption"]
        highlights = [e for e in timeline if e["type"] == "highlight"]

        # Pause Handling timing engine rules (captions only)
        for idx in range(len(captions) - 1):
            curr_evt = captions[idx]
            next_evt = captions[idx+1]
            gap = next_evt["start_ms"] - curr_evt["end_ms"]
            if gap > 0:
                if preset.timing.pause_handling == "hold":
                    # Extend end time to cover silence up to 1.2s
                    hold_extension = min(gap - preset.timing.caption_spacing_ms, 1200)
                    if hold_extension > 0:
                        curr_evt["end_ms"] += hold_extension

            # Clamp overlapping caption blocks
            if curr_evt["end_ms"] >= next_evt["start_ms"]:
                curr_evt["end_ms"] = max(curr_evt["start_ms"] + 1, next_evt["start_ms"] - 1)

        # For each caption, ensure its highlights fit within its (potentially adjusted) boundaries
        for cap in captions:
            # Find highlights associated with this caption's original time range
            cap_highlights = [
                h for h in highlights
                if h["start_ms"] >= cap["start_ms"] and h["start_ms"] < cap["end_ms"]
            ]
            for h in cap_highlights:
                h["start_ms"] = max(h["start_ms"], cap["start_ms"])
                h["end_ms"] = min(h["end_ms"], cap["end_ms"])
                if h["start_ms"] >= h["end_ms"]:
                    h["end_ms"] = h["start_ms"] + 1

        # Re-assemble and sort timeline by start_ms, and type (caption first) to preserve rendering order
        timeline = captions + highlights
        timeline.sort(key=lambda e: (e["start_ms"], 0 if e["type"] == "caption" else 1))

        # 2. Quality Evaluation Scoring
        readability_score = max(1.0, 10.0 - (single_word_lines_count * 1.5))
        timing_score = max(1.0, 10.0 - (flashing_captions_count * 2.0))
        emotion_alignment_score = 9.5 if emotion != "neutral" else 9.0
        rhythm_score = 9.0
        overall_score = (readability_score + timing_score + emotion_alignment_score + rhythm_score) / 4.0
        
        quality_eval = {
            "readability_score": round(readability_score, 1),
            "rhythm_score": round(rhythm_score, 1),
            "emotion_alignment_score": round(emotion_alignment_score, 1),
            "timing_score": round(timing_score, 1),
            "overall_quality_score": round(overall_score, 1),
            "debug_metrics": {
                "single_word_lines_prevented": single_word_lines_count,
                "flashing_captions_resolved": flashing_captions_count,
                "style_applied": style or "minimal"
            }
        }

        data = {
            "metadata": {
                "version": "1.0",
                "project_id": project_id,
                "video_id": video_id,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generator_version": DUMMY_MODEL_NAME,
                "quality_evaluation": quality_eval,
            },
            "assets": [],
            "global_settings": {
                "canvas": {"width": 1080, "height": 1920},
                "frame_rate": 30.0,
                "resolution": "1080x1920",
                "aspect_ratio": "9:16",
                "safe_area": {
                    "top": preset.safe_area.top,
                    "bottom": preset.safe_area.bottom,
                    "left": preset.safe_area.left,
                    "right": preset.safe_area.right,
                },
                "theme": preset.name.lower(),
                "default_font": preset.typography.font,
                "default_colors": preset.highlight.colors,
                "motion_preset": preset.animation.motion_preset,
            },
            "timeline": timeline,
        }

        latency_ms = (time.monotonic() - start) * 1000
        usage = ProviderUsage(
            provider="dummy",
            model=DUMMY_MODEL_NAME,
            latency_ms=latency_ms,
            input_tokens=len(caption_plan.caption_segments) * 4,
            output_tokens=len(timeline) * 5,
            estimated_cost_usd=0.0,
        )
        return ProviderOutput(data=data, usage=usage)
