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
from app.render.templates import get_template_style
from packages.contracts.python import CaptionPlan, CreativePlan, Transcript  # type: ignore[import-not-found]

DUMMY_MODEL_NAME = "dummy-render-plan-v2"


def _max_weight(a: str, b: str) -> str:
    """Picks the heavier of two CSS-style font weights (numeric strings
    like "400"/"700"/"900", or keywords "bold"/"normal"). Used so a
    template's minimum weight (e.g. staggered_3line wants base text at
    least 800) never makes an already-heavier style preset *lighter*."""
    def to_int(w: str) -> int:
        if w.isdigit():
            return int(w)
        return 700 if w.lower() == "bold" else 400
    return a if to_int(a) >= to_int(b) else b


# Same per-character-class glyph-width heuristic as app.render.engine's
# estimate_text_width() and the frontend/Remotion estimateTextWidthPx()
# copies (packages/contracts has no shared runtime between Python and TS,
# so this is a 4th hand-kept copy by existing convention — keep all four in
# sync if the formula ever changes).
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


def normalize_word(w: str) -> str:
    return re.sub(r'[^\w]', '', w).lower()


def _clean_transcript_word(w: str) -> str:
    """Strips trailing commas/semicolons (breath-pause artifacts, not
    meaningful punctuation) from a raw Groq transcript word, mirroring
    prompts/caption_planning.txt rule 8's intent — but applied deterministically
    to the real transcript word instead of trusting the caption-planning LLM's
    own retyped copy of it (see get_segment_word_timings)."""
    return re.sub(r'[,;]+$', '', w)


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


STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "in", "on",
    "at", "it", "this", "that", "i", "you", "he", "she", "we", "they", "but",
    "or", "so", "be", "as", "for", "with", "my", "your", "do", "does", "did",
}


def _score_word(w: str) -> float:
    clean = re.sub(r'[^\w]', '', w)
    if not clean:
        return -1.0
    score = float(len(clean))
    if normalize_word(w) in STOPWORDS:
        score -= 100.0
    if is_capitalized(w):
        score += 2.0
    if is_number(w):
        score += 1.0
    return score


def pick_keyword_idx(words_text: list[str]) -> int:
    """Picks the single most salient word in a caption group for emphasis
    styling: purely mechanical length/capitalization/digit scoring
    (approximating how cinematic caption tools like CapCut/Opus auto-pick a
    "hero" word). The caption-planning LLM's own `emphasis` field used to
    take priority here, but its picks were consistently worse than this
    plain heuristic — a weak, often-arbitrary "flag word 0" habit rather
    than genuine judgment — so this function no longer looks at it at all.
    """
    best_idx = 0
    best_score = -1.0
    for i, w in enumerate(words_text):
        if not re.sub(r'[^\w]', '', w):
            continue
        score = _score_word(w)
        if score > best_score:
            best_score = score
            best_idx = i
    return best_idx


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
    """Returns [(word, start_ms, end_ms, seg_word_idx), ...] — `seg_word_idx` is
    the word's position in `segment.text.split()`, preserved through grouping so
    `segment.emphasis` (LLM-flagged word indices) can still be located after
    words get regrouped into on-screen lines."""
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
                # Use the real Groq transcript word, not the caption-planning
                # LLM's own retyped `seg_words[i]` — the LLM is free to
                # rephrase/hallucinate wording (only the timing match above
                # is trusted), so what actually renders on screen must come
                # from the transcript, the one place fidelity to what was
                # actually said is guaranteed.
                word_timings.append((_clean_transcript_word(tw.text), tw.start_ms, tw.end_ms, i))
            else:
                prev_end = word_timings[-1][2] if word_timings else segment.start_ms
                word_timings.append((seg_words[i], prev_end, prev_end + 300, i))
        last_tx_idx = best_match_idx + n_seg
    else:
        duration = segment.end_ms - segment.start_ms
        word_duration = duration / n_seg
        for i in range(n_seg):
            w_start = int(segment.start_ms + i * word_duration)
            w_end = int(w_start + word_duration)
            word_timings.append((seg_words[i], w_start, w_end, i))

    return word_timings, last_tx_idx


def group_words(word_timings, word_limit, max_chars=24, max_width_px=None, font_size=None):
    """Splits word_timings into on-screen caption groups.

    When max_width_px/font_size are given, the group's estimated rendered
    width (via estimate_text_width) drives splitting instead of raw word
    count — a group keeps taking words as long as it still fits the box,
    so five short words ("go for it now go") and two long ones behave
    differently instead of both being capped at the same word_limit.
    word_limit becomes a sanity-cap ceiling (2x) that only kicks in if
    width estimation would otherwise let a card grow unreasonably long
    (e.g. a run of very narrow words) — it no longer forces a split just
    because a "normal" card was reached.
    """
    groups = []
    current_group = []
    width_driven = bool(max_width_px and font_size)
    ceiling = word_limit * 2 if width_driven else word_limit

    i = 0
    while i < len(word_timings):
        word, start_ms, end_ms, seg_word_idx = word_timings[i]
        current_group.append((word, start_ms, end_ms, seg_word_idx))

        if i + 1 < len(word_timings):
            next_word, next_start, next_end, _next_seg_idx = word_timings[i+1]
            current_text = " ".join([item[0] for item in current_group])
            projected_text = current_text + " " + next_word

            force_split = False
            prevent_split = should_prevent_split(word, next_word)

            if len(projected_text) > max_chars:
                if not prevent_split:
                    force_split = True
                elif len(projected_text) > max_chars * 1.5:
                    force_split = True

            if width_driven:
                projected_width = estimate_text_width(projected_text, font_size)
                if projected_width > max_width_px and not prevent_split:
                    force_split = True

            if len(current_group) >= ceiling:
                if not prevent_split:
                    force_split = True

            # Strong sentence-enders always break a card. Weak punctuation
            # (commas, semicolons) only breaks one once it already holds a
            # reasonable number of words — otherwise almost every clause
            # boundary fragments cards down to 1-2 words, which is far
            # fewer than word_limit intends and leaves cards looking mostly
            # empty relative to their container.
            if word[-1] in {'.', '!', '?'} and not prevent_split:
                force_split = True
            elif word[-1] in {',', ';'} and not prevent_split and len(current_group) >= max(2, word_limit // 2):
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

        # The actual StylePresetManager dict key this style resolved to — NOT
        # preset.name (a human display string like "Custom My Project") which
        # doesn't round-trip through StylePresetManager.get_preset() and would
        # silently fall back to "minimal" wherever this theme key is looked up
        # again later (e.g. the ASS export engine).
        resolved_style_key = (style or "minimal").strip().lower()
        preset = StylePresetManager.get_preset(resolved_style_key)

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
            # Tone the emphasis down (calmer "fade" animation, no size boost)
            # rather than setting highlight_color to the exact same value as
            # the base text color — that erased all contrast and made the
            # "highlighted" keyword completely indistinguishable from
            # surrounding text for any video the creative-analysis LLM
            # judged as serious/sad/slow, i.e. illegible by construction.

        timeline = []
        event_counter = 1
        last_tx_idx = 0
        elapsed_time_ms = 0
        # Tracks which highlight events belong to which caption, in lockstep
        # with construction (one entry per caption, appended right after its
        # caption event). This is later used instead of re-deriving
        # ownership from timestamps, because the timing-floor pass below can
        # stretch a caption's boundaries into a neighboring caption's
        # original time window — a timestamp-range re-match would then
        # attach a highlight to the wrong (spatially overlapping) caption.
        per_caption_highlights: list[list[dict]] = []
        
        # Evaluation tracking
        single_word_lines_count = 0
        name_splits_count = 0
        flashing_captions_count = 0

        # Group-sizing and typography rules per template — see
        # app.render.templates, the single source of truth every template
        # (and app.render.engine's ASS export, via the resolved values baked
        # into this timeline below) reads from. max_chars is a safety valve
        # against absurdly long lines, not the primary driver.
        #
        # Card word count is now driven by estimated rendered width against
        # the caption box (canvas width minus the style's safe-area
        # margins), not a fixed word_limit — a card keeps taking words
        # while they still fit, so short words fill a card fuller than long
        # ones do. word_limit is demoted to a sanity-cap ceiling (see
        # group_words). word_by_word is exempt: its whole identity is
        # exactly one word per card, so it keeps the old fixed-count path.
        template_style = get_template_style(template)
        word_limit_to_use = template_style.word_limit
        max_chars = template_style.max_chars
        # Matches the canvas dims baked into global_settings below.
        canvas_width_px = 1080
        box_width_px = canvas_width_px - preset.safe_area.left - preset.safe_area.right
        grouping_font_size = font_size * template_style.base_size_scale

        # Phase D: independent hero/keyword-word styling. A user-set
        # keyword_* value on the preset (CustomStyleRequest, saved via
        # POST /custom-style) takes priority over the template's own fixed
        # default — falls back to the template default when the user
        # hasn't overridden it, same as every other per-template constant.
        resolved_keyword_font = getattr(preset.typography, "keyword_font", None) or template_style.keyword_font
        resolved_keyword_weight = getattr(preset.typography, "keyword_weight", None) or template_style.keyword_weight
        resolved_keyword_size_scale = getattr(preset.typography, "keyword_size_scale", None) or template_style.keyword_size_scale

        # Process each caption-planning segment as-is. Segments come
        # straight from the LLM (prompts/caption_planning.txt now targets
        # 3-5 words per segment directly), so grouping only ever needs to
        # subdivide *within* a segment via word_limit/max_chars below — no
        # cross-segment merging. An earlier version of this code merged
        # short, adjacent LLM segments together to hit a template's word
        # count; that fixed the number but produced cards that glued two
        # unrelated sentences/clauses together with no real seam, which
        # read as more broken than the sparse cards it replaced. Getting
        # the segmentation right at the source (the prompt) instead keeps
        # every card's text a genuine, coherent phrase.
        for segment_idx, segment in enumerate(caption_plan.caption_segments):
            is_first = (segment_idx == 0)

            # Align with transcript timestamps
            word_timings, last_tx_idx = get_segment_word_timings(
                segment, transcript.words, last_tx_idx
            )

            if template == "word_by_word":
                groups = group_words(word_timings, word_limit_to_use, max_chars)
            else:
                groups = group_words(
                    word_timings, word_limit_to_use, max_chars,
                    max_width_px=box_width_px, font_size=grouping_font_size,
                )

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

                # Case consistency: hook/CTA/surprise cards used to force
                # ALL-CAPS while a "regular" card in the same video kept
                # natural mixed case (with only the ASS/frontend renderer
                # separately forcing the keyword word to caps) — so a video
                # would flip between fully-shouty cards and mixed-case cards
                # with one stray all-caps word, looking like two different
                # style systems rather than one consistent design. Every
                # template's own force_uppercase setting now applies
                # consistently to every card.
                curr_text = group_text.upper() if template_style.force_uppercase else group_text
                # Non-highlighted text used to render at whatever the style
                # preset's own (often modest) size/weight was, distinct from
                # nothing — there was no "give the body text real presence"
                # step. base_size_scale/base_weight are the template's
                # opinion on how big/bold non-highlighted words should be.
                curr_size = font_size * template_style.base_size_scale
                curr_weight = _max_weight(preset.typography.weight, template_style.base_weight)
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
                        "font": template_style.base_font or preset.typography.font,
                        "size": curr_size,
                        "weight": curr_weight,
                        "color": curr_color,
                        "alignment": preset.typography.alignment,
                        "animation": curr_anim,
                        # Baked in from the style preset the same way
                        # font/size/color already are — see CaptionPayload
                        # (packages/contracts/python/render_plan.py) for why
                        # these live on the payload itself now.
                        "text_transform": preset.typography.text_transform or "none",
                        "underline": bool(preset.typography.underline),
                        "letter_spacing": preset.typography.letter_spacing or 0.0,
                        "word_spacing": preset.typography.word_spacing or 0.0,
                        "line_spacing": preset.typography.line_spacing or 1.0,
                        "color_mode": preset.typography.color_mode or "solid",
                        "color2": preset.typography.color2,
                        "x_position_percent": preset.typography.x_position_percent,
                        "shadow": preset.typography.shadow,
                        "outline": preset.typography.outline,
                        "background_style": preset.typography.background_style or "none",
                        "entrance_anim": preset.typography.entrance_anim or "rise",
                        "highlight_anim": preset.typography.highlight_anim or "pop",
                        "outline_color": preset.typography.outline_color or "#000000",
                        "shadow_color": preset.typography.shadow_color or "#000000",
                    },
                })
                event_counter += 1
                per_caption_highlights.append([])

                # Generate highlight events for each word in the group. These double as
                # both the "most important word" emphasis marker and the reveal-timing
                # split points the render engine uses to build up the line word by word.
                if template in {"sentence_highlight", "staggered_3line", "glow_stack", "cartoon_stack", "serif_pop", "cinematic_emerald"}:
                    keyword_idx = pick_keyword_idx(group_words_text)
                    for w_idx, (w_text, w_start, w_end, _seg_word_idx) in enumerate(group):
                        # Ensure word highlights fit within the clamped caption boundaries
                        h_start = max(w_start, g_start)
                        h_end = min(w_end, g_end)
                        # For the last word, align its highlight end with the end of the caption event
                        if w_idx == len(group) - 1:
                            h_end = g_end

                        if h_start < h_end:
                            is_kw = w_idx == keyword_idx
                            highlight_evt = {
                                "id": f"evt-{event_counter}",
                                "start_ms": h_start,
                                "end_ms": h_end,
                                "layer": "highlights",
                                "type": "highlight",
                                "payload": {
                                    "indices": [w_idx],
                                    "color": highlight_color,
                                    "animation": "pop",
                                    "is_keyword": is_kw,
                                    # Only the hero word gets the template's
                                    # distinct font/weight/size treatment —
                                    # the other per-word highlight events
                                    # here are just reveal-timing markers.
                                    "font": resolved_keyword_font if is_kw else None,
                                    "weight": resolved_keyword_weight if is_kw else None,
                                    "size_scale": resolved_keyword_size_scale if is_kw else None,
                                }
                            }
                            timeline.append(highlight_evt)
                            per_caption_highlights[-1].append(highlight_evt)
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
            if gap > 0 and preset.timing.pause_handling == "hold":
                # Extend end time to cover silence up to 1.2s
                hold_extension = min(gap - preset.timing.caption_spacing_ms, 1200)
                if hold_extension > 0:
                    curr_evt["end_ms"] += hold_extension

        # Timing Engine floor: guarantee every caption card stays on screen
        # long enough to actually be read. The old overlap-clamp here used to
        # shrink a card to as little as 1ms whenever timing estimates ran
        # tight (segment boundaries, fast speech, slightly-overlapping LLM
        # caption-plan segments) — effectively making words disappear before
        # a viewer could ever see them. A forward monotonic pass instead
        # pushes each card's start to the previous card's end (never
        # overlapping) and stretches its end to a minimum readable duration.
        MIN_CAPTION_DURATION_MS = 350
        for idx in range(len(captions)):
            if idx > 0:
                prev_end = captions[idx - 1]["end_ms"]
                if captions[idx]["start_ms"] < prev_end:
                    captions[idx]["start_ms"] = prev_end
            min_end = captions[idx]["start_ms"] + MIN_CAPTION_DURATION_MS
            if captions[idx]["end_ms"] < min_end:
                captions[idx]["end_ms"] = min_end

        # For each caption, ensure its highlights fit within its (potentially
        # adjusted) boundaries. Ownership comes from per_caption_highlights
        # (recorded at construction time, in the same order as `captions`)
        # rather than re-matching by timestamp — the timing-floor pass above
        # can stretch a caption's box into a neighboring caption's original
        # time window, and a timestamp-range re-match would then attach a
        # highlight word to the wrong, now-overlapping caption card.
        for cap, cap_highlights in zip(captions, per_caption_highlights):
            if not cap_highlights:
                continue

            cap_span = cap["end_ms"] - cap["start_ms"]
            n = len(cap_highlights)
            natural_span = (
                max(h["end_ms"] for h in cap_highlights) - min(h["start_ms"] for h in cap_highlights)
            )

            # Real word-level timestamps (from Whisper-style ASR, or after
            # the timing floor above stretched a too-tight caption) are
            # sometimes bunched together into a near-zero span — clamping
            # those to the caption's box would leave every word's highlight
            # overlapping at the same instant (a hard validation failure,
            # and even when it validates, it visually reveals every word at
            # once and then does nothing for the rest of the card's
            # duration). When the natural timing can't sensibly carry a
            # one-word-at-a-time reveal, redistribute the words evenly
            # across the caption's actual on-screen duration instead.
            if n > 0 and (natural_span <= 0 or natural_span < 50 * n):
                slot = cap_span / n
                for i, h in enumerate(cap_highlights):
                    h["start_ms"] = int(cap["start_ms"] + i * slot)
                    h["end_ms"] = cap["end_ms"] if i == n - 1 else int(cap["start_ms"] + (i + 1) * slot)
            else:
                for h in cap_highlights:
                    h["start_ms"] = max(h["start_ms"], cap["start_ms"])
                    h["end_ms"] = min(h["end_ms"], cap["end_ms"])
                    if h["start_ms"] >= h["end_ms"]:
                        h["end_ms"] = h["start_ms"] + 1
                # Clamping alone doesn't guarantee order — natural
                # timestamps that were merely out-of-order (rather than
                # degenerate) could still cross after clamping. Enforce
                # monotonic, non-overlapping boundaries as a final safety net.
                for i in range(1, len(cap_highlights)):
                    if cap_highlights[i]["start_ms"] < cap_highlights[i - 1]["end_ms"]:
                        cap_highlights[i]["start_ms"] = cap_highlights[i - 1]["end_ms"]
                        if cap_highlights[i]["end_ms"] <= cap_highlights[i]["start_ms"]:
                            cap_highlights[i]["end_ms"] = cap_highlights[i]["start_ms"] + 1

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
                "theme": resolved_style_key,
                "default_font": preset.typography.font,
                "default_colors": preset.highlight.colors,
                "motion_preset": preset.animation.motion_preset,
                # The template actually used to build this timeline — export
                # (app.render.engine) must read this instead of re-deriving
                # a template from the style preset's own default, which
                # silently used the wrong layout whenever a project
                # overrode its caption_template away from the preset default.
                "caption_template": template,
                # Layout variant for staggered_3line: "splash" (original
                # left/right-offset look) or "centre" (all lines centered).
                "staggered_layout": getattr(preset.timing, "staggered_layout", "splash"),
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
