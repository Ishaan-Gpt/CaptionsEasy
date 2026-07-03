"""Per-caption-template configuration.

Every caption template ("word_by_word", "staggered_3line",
"sentence_highlight", "sentence_clean") has its own word-grouping and
typography rules. Previously these were scattered as inline if/elif chains
and magic numbers across app.ai.providers.dummy.render_plan (which builds
the timeline) AND app.render.engine (which burns it into the exported
video's ASS subtitles) AND the frontend preview — three places that had to
be kept in sync by hand, and regularly weren't (e.g. the frontend once used
a 0.45x side-line scale while the exporter used 0.95x).

This module is the single source of truth for "what does template X look
like". render_plan.py resolves a TemplateStyleConfig once per render and
bakes the *resolved* per-word values (size, weight, font) directly into the
caption/highlight events it emits — so app.render.engine (and the frontend,
which reads the same JSON) never need their own copy of these constants,
they just render whatever the template config already decided.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TemplateStyleConfig:
    name: str

    # --- Word grouping (how many words share one on-screen caption card) ---
    word_limit: int
    max_chars: int

    # --- Casing ---
    # Every template renders in full caps for a punchy, consistent "impact
    # caption" look except "sentence_clean", an intentionally quieter,
    # non-shouty style.
    force_uppercase: bool

    # --- Non-highlighted ("base") word styling ---
    # Multiplies the preset's (emotion-adjusted) font size. Bumped up from
    # this template system's first draft, which left non-highlighted text
    # noticeably smaller/lighter than the rest of the card and hard to read.
    base_size_scale: float
    base_weight: str

    # --- Highlighted ("hero"/keyword) word styling ---
    keyword_size_scale: float
    keyword_weight: str
    # None = inherit the project's base font. A distinct, heavier display
    # font here (vs. just a color change) is what makes the highlighted
    # word actually read as "the important one" rather than merely
    # differently-colored body text.
    keyword_font: str | None

    # --- Layout ---
    # Vertical rhythm between stacked lines, as a multiple of font size.
    # Only consumed by the 3-line staggered layout.
    line_gap_scale: float = 1.1

    # None = inherit the project's base font. Templates whose signature
    # look depends on a specific body typeface (e.g. glow_stack's rounded
    # white text) set this to force it regardless of the project font.
    base_font: str | None = None


# "Anton" is a heavy, ultra-condensed display font — the standard choice
# for hero/impact words in commercial short-form caption tools (CapCut,
# Opus Clip, Submagic). Distinct from typical body fonts (Outfit, Inter,
# etc.) so the highlighted word visibly reads as a different, heavier
# typographic voice, not just a recolored copy of the body text.
DEFAULT_KEYWORD_FONT = "Anton"


TEMPLATE_STYLES: dict[str, TemplateStyleConfig] = {
    "word_by_word": TemplateStyleConfig(
        name="word_by_word",
        word_limit=1,
        max_chars=20,
        force_uppercase=True,
        # Every card is a single word acting as its own hero — no
        # separate "base" word exists, so base and keyword scale match.
        base_size_scale=1.15,
        base_weight="900",
        keyword_size_scale=1.15,
        keyword_weight="900",
        keyword_font=None,
    ),
    "staggered_3line": TemplateStyleConfig(
        name="staggered_3line",
        word_limit=5,
        max_chars=50,
        force_uppercase=True,
        # Non-highlighted text is deliberately less bold than the keyword
        # (700 vs 900) — that gap, plus the keyword's 1.5x size, is what
        # creates the contrast that makes the highlighted word actually
        # read as "the important one." app.render.engine additionally
        # hardcodes non-highlighted color to plain white for the same
        # reason: it must never match the keyword's own accent color.
        base_size_scale=1.1,
        base_weight="700",
        keyword_size_scale=1.5,
        keyword_weight="900",
        keyword_font=DEFAULT_KEYWORD_FONT,
        line_gap_scale=1.1,
    ),
    "sentence_highlight": TemplateStyleConfig(
        name="sentence_highlight",
        word_limit=8,
        max_chars=60,
        force_uppercase=True,
        base_size_scale=1.15,
        base_weight="900",
        keyword_size_scale=1.5,
        keyword_weight="900",
        keyword_font=DEFAULT_KEYWORD_FONT,
    ),
    "sentence_clean": TemplateStyleConfig(
        name="sentence_clean",
        word_limit=8,
        max_chars=60,
        force_uppercase=False,
        base_size_scale=1.1,
        base_weight="800",
        # No hero word by design — "clean" means uniform, understated text.
        keyword_size_scale=1.1,
        keyword_weight="800",
        keyword_font=None,
    ),
    # "3D glow stack" — replicates the popular Hindi-creator style: three
    # center-aligned lines; body text in a heavy ROUNDED sans (natural
    # lowercase, pure white, dark navy 3D extrusion + soft ambient shadow);
    # hero word in an ultra-condensed display font, ALL CAPS, ~1.7x size,
    # vertical light-to-deep gradient fill with a strong outer glow; and a
    # large soft dark blurred backdrop blob behind the whole block that
    # keeps white text readable over any footage.
    "glow_stack": TemplateStyleConfig(
        name="glow_stack",
        word_limit=5,
        max_chars=50,
        # Natural case for body lines is part of this style's signature —
        # only the hero word is uppercased (the renderers do that per-word).
        force_uppercase=False,
        base_size_scale=1.2,
        base_weight="800",
        keyword_size_scale=2.3,
        keyword_weight="900",
        keyword_font=DEFAULT_KEYWORD_FONT,
        line_gap_scale=1.15,
        base_font="Baloo 2",
    ),
    "cartoon_stack": TemplateStyleConfig(
        name="cartoon_stack",
        word_limit=5,
        max_chars=50,
        force_uppercase=False,
        base_size_scale=0.8,
        base_weight="700",
        keyword_size_scale=1.6,
        keyword_weight="700",
        keyword_font="Fredoka",
        line_gap_scale=0.8,
        base_font="Caveat",
    ),
    "serif_pop": TemplateStyleConfig(
        name="serif_pop",
        word_limit=5,
        max_chars=50,
        force_uppercase=False,
        base_size_scale=1.0,
        base_weight="800",
        keyword_size_scale=1.8,
        keyword_weight="900",
        # Reference design is a bold brush/cursive script, not a serif
        # italic — Playfair Display's italic reads as elegant-serif, not
        # handwritten, so it didn't match the "Are You Stuck." look.
        keyword_font="Kaushan Script",
        line_gap_scale=1.15,
    ),
    "cinematic_emerald": TemplateStyleConfig(
        name="cinematic_emerald",
        word_limit=5,
        max_chars=50,
        force_uppercase=False,
        base_size_scale=1.1,
        base_weight="600",
        keyword_size_scale=2.3,
        keyword_weight="900",
        keyword_font="Playfair Display",
        line_gap_scale=0.8,
        base_font="Outfit",
    ),
}

DEFAULT_TEMPLATE_NAME = "word_by_word"


def get_template_style(name: str | None) -> TemplateStyleConfig:
    return TEMPLATE_STYLES.get(name or DEFAULT_TEMPLATE_NAME, TEMPLATE_STYLES[DEFAULT_TEMPLATE_NAME])
