/**
 * Per-caption-template configuration — the frontend-preview mirror of
 * apps/backend/app/render/templates/__init__.py.
 *
 * Every caption template ("word_by_word", "staggered_3line",
 * "sentence_highlight", "sentence_clean") has its own typography rules.
 * These used to be scattered as inline magic numbers across the live
 * preview AND the ASS export engine — two places that had to be kept in
 * sync by hand, and regularly weren't (e.g. the preview once used a 0.45x
 * side-line scale while export used 0.95x). Both sides should read the
 * same numbers from their respective single source of truth; this file is
 * that source for the frontend.
 */

export interface TemplateStyleConfig {
  id: string;
  name: string;
  desc: string;
  defaultFont: string;
  defaultHighlight: string;

  /** Multiplies the project's chosen base font size. */
  baseSizeScale: number;
  baseWeight: string;

  keywordSizeScale: number;
  keywordWeight: string;
  /** null = inherit the project's base font. */
  keywordFont: string | null;
  /** Templates whose signature look depends on a specific body typeface
   * (e.g. glow_stack's rounded white text) force it here; null = inherit
   * the project's chosen font. */
  baseFont?: string | null;
}

// "Anton" is a heavy, ultra-condensed display font — the standard choice
// for hero/impact words in commercial short-form caption tools (CapCut,
// Opus Clip, Submagic). Keeping the highlighted word in a visibly
// different, heavier typographic voice (not just a recolored copy of the
// body text) is what makes it actually read as "the important word."
export const DEFAULT_KEYWORD_FONT = "Anton";

export const TEMPLATE_STYLES: Record<string, TemplateStyleConfig> = {
  staggered_3line: {
    id: "staggered_3line",
    name: "Staggered 3-Line",
    desc: "Outfit font, staggered layouts with active highlights",
    defaultFont: "Outfit",
    defaultHighlight: "#00F5C4",
    baseSizeScale: 1.1,
    baseWeight: "700",
    keywordSizeScale: 1.5,
    keywordWeight: "900",
    keywordFont: DEFAULT_KEYWORD_FONT,
  },
  word_by_word: {
    id: "word_by_word",
    name: "Word by Word",
    desc: "Single bold uppercase word active at center",
    defaultFont: "Montserrat",
    defaultHighlight: "#00F5C4",
    baseSizeScale: 1.15,
    baseWeight: "900",
    keywordSizeScale: 1.15,
    keywordWeight: "900",
    keywordFont: null,
  },
  sentence_highlight: {
    id: "sentence_highlight",
    name: "Sentence Highlight",
    desc: "Display full segment, highlighting current word pop",
    defaultFont: "Inter",
    defaultHighlight: "#00F5C4",
    baseSizeScale: 1.15,
    baseWeight: "900",
    keywordSizeScale: 1.5,
    keywordWeight: "900",
    keywordFont: DEFAULT_KEYWORD_FONT,
  },
  sentence_clean: {
    id: "sentence_clean",
    name: "Sentence Clean",
    desc: "Elegant clean typography displaying full segment",
    defaultFont: "Cinzel",
    defaultHighlight: "#FFFFFF",
    baseSizeScale: 1.1,
    baseWeight: "800",
    // No hero word by design — "clean" means uniform, understated text.
    keywordSizeScale: 1.1,
    keywordWeight: "800",
    keywordFont: null,
  },
  // "3D glow stack" — rounded white body text (natural case) with dark
  // extrusion, gradient glowing hero word, soft dark backdrop blob.
  // Mirrors apps/backend/app/render/templates glow_stack.
  glow_stack: {
    id: "glow_stack",
    name: "Glow Stack",
    desc: "Rounded white text, flat deep-blue hero word, splash layout",
    defaultFont: "Baloo 2",
    defaultHighlight: "#4FA8FF",
    baseSizeScale: 1.2,
    baseWeight: "800",
    keywordSizeScale: 2.3,
    keywordWeight: "900",
    keywordFont: DEFAULT_KEYWORD_FONT,
    baseFont: "Baloo 2",
  },
  cartoon_stack: {
    id: "cartoon_stack",
    name: "Cartoon Stack",
    desc: "Playful Fredoka font with thick border and Caveat top text",
    defaultFont: "Fredoka",
    defaultHighlight: "#EDE0A6",
    baseSizeScale: 0.8,
    baseWeight: "700",
    keywordSizeScale: 1.6,
    keywordWeight: "700",
    keywordFont: "Fredoka",
    baseFont: "Caveat",
  },
  serif_pop: {
    id: "serif_pop",
    name: "Serif Pop",
    desc: "Bold brush-script hero word with a yellow pop dot",
    defaultFont: "Playfair Display",
    defaultHighlight: "#FFEE00",
    baseSizeScale: 1.0,
    baseWeight: "800",
    keywordSizeScale: 1.8,
    keywordWeight: "900",
    keywordFont: "Kaushan Script",
  },
  cinematic_emerald: {
    id: "cinematic_emerald",
    name: "Cinematic Emerald",
    desc: "Layered layout with Outfit base and a giant Playfair Display parrot-green glowy italic keyword",
    defaultFont: "Outfit",
    defaultHighlight: "#8CFF3E",
    baseSizeScale: 1.1,
    baseWeight: "600",
    keywordSizeScale: 2.2,
    keywordWeight: "800",
    keywordFont: "Playfair Display",
    baseFont: "Outfit",
  },
};

export interface PresetConfig {
  id: string;
  name: string;
  desc: string;
  caption_template: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  highlight_color: string;
  outline: number;
  shadow: number;
  background_style: string;
  y_position_percent: number;
  staggered_layout?: "splash" | "centre";
  accent_period_enabled?: boolean;
  word_limit?: number;
  caption_spacing_ms?: number;
  word_pacing?: string;
  pause_handling?: string;
}

export const PRESETS_LIST: PresetConfig[] = [
  {
    id: "minimal",
    name: "Minimal",
    desc: "Clean uniform text highlighting active word in dark theme",
    caption_template: "sentence_highlight",
    font: "Inter",
    size: 48,
    weight: "400",
    color: "#FFFFFF",
    highlight_color: "#E0E0E0",
    outline: 1.0,
    shadow: 0.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 3,
    caption_spacing_ms: 100,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Outfit font with medium border and active word pop",
    caption_template: "sentence_highlight",
    font: "Outfit",
    size: 52,
    weight: "700",
    color: "#FFFFFF",
    highlight_color: "#FFFF00",
    outline: 2.0,
    shadow: 1.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 2,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "podcast",
    name: "Podcast",
    desc: "Bold left-aligned single active word with drop shadow",
    caption_template: "word_by_word",
    font: "Inter",
    size: 46,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#00FF00",
    outline: 2.5,
    shadow: 2.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 1,
    caption_spacing_ms: 30,
    word_pacing: "dynamic",
    pause_handling: "clear",
  },
  {
    id: "documentary",
    name: "Documentary",
    desc: "Cinzel serif font for elegant subtle subtitle display",
    caption_template: "sentence_clean",
    font: "Cinzel",
    size: 42,
    weight: "400",
    color: "#F5F5DC",
    highlight_color: "#FFFFFF",
    outline: 0.5,
    shadow: 0.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 4,
    caption_spacing_ms: 150,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "viral shorts",
    name: "Viral Shorts",
    desc: "Massive uppercase yellow active words with thick outline",
    caption_template: "word_by_word",
    font: "Outfit",
    size: 60,
    weight: "900",
    color: "#FFFFFF",
    highlight_color: "#FFEA00",
    outline: 4.0,
    shadow: 3.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 1,
    caption_spacing_ms: 20,
    word_pacing: "dynamic",
    pause_handling: "clear",
  },
  {
    id: "educational",
    name: "Educational",
    desc: "Clean Outfit font with hot pink highlights",
    caption_template: "sentence_highlight",
    font: "Outfit",
    size: 48,
    weight: "600",
    color: "#E0F7FA",
    highlight_color: "#FF4081",
    outline: 2.0,
    shadow: 1.5,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 2,
    caption_spacing_ms: 80,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "luxury",
    name: "Luxury",
    desc: "Classic Cinzel serif font with premium gold highlights",
    caption_template: "sentence_highlight",
    font: "Cinzel",
    size: 40,
    weight: "500",
    color: "#FFFFFF",
    highlight_color: "#D4AF37",
    outline: 1.5,
    shadow: 1.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 3,
    caption_spacing_ms: 120,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "formal",
    name: "Formal",
    desc: "Georgia serif font with gold highlight accents",
    caption_template: "sentence_highlight",
    font: "Georgia",
    size: 46,
    weight: "700",
    color: "#FFFFFF",
    highlight_color: "#D4B96A",
    outline: 1.5,
    shadow: 1.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 8,
    caption_spacing_ms: 120,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "sarcastic",
    name: "Sarcastic",
    desc: "Heavy Impact font with energetic orange highlighting",
    caption_template: "sentence_highlight",
    font: "Impact",
    size: 54,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#FF5E3A",
    outline: 3.0,
    shadow: 2.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 8,
    caption_spacing_ms: 60,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "humorous_tech",
    name: "Humorous Tech",
    desc: "Consolas monospace font with green terminal theme style",
    caption_template: "sentence_highlight",
    font: "Consolas",
    size: 54,
    weight: "700",
    color: "#E8FFFB",
    highlight_color: "#39FF8C",
    outline: 3.0,
    shadow: 3.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 8,
    caption_spacing_ms: 40,
    word_pacing: "dynamic",
    pause_handling: "clear",
  },
  {
    id: "humorous_non_tech",
    name: "Humorous Non-Tech",
    desc: "Playful Comic Sans font with warm orange highlighting",
    caption_template: "sentence_highlight",
    font: "Comic Sans MS",
    size: 50,
    weight: "700",
    color: "#FFFDD0",
    highlight_color: "#FFB200",
    outline: 2.5,
    shadow: 1.5,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 8,
    caption_spacing_ms: 80,
    word_pacing: "even",
    pause_handling: "hold",
  },
  {
    id: "kalakar",
    name: "Kalakar",
    desc: "Outfit font with staggered layout and yellow-green keyword highlight",
    caption_template: "staggered_3line",
    font: "Outfit",
    size: 48,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#C5FF00",
    outline: 2.0,
    shadow: 0.0,
    background_style: "none",
    y_position_percent: 71.4,
    staggered_layout: "splash",
    accent_period_enabled: true,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "kalakar_shadow",
    name: "Kalakar Shadow",
    desc: "Staggered 3-line layout with drop shadows for depth",
    caption_template: "staggered_3line",
    font: "Outfit",
    size: 48,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#C5FF00",
    outline: 2.0,
    shadow: 2.5,
    background_style: "none",
    y_position_percent: 71.4,
    staggered_layout: "splash",
    accent_period_enabled: true,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "glow_stack",
    name: "Glow Stack",
    desc: "Heavy rounded Baloo 2 font, vertical gradient glowing hero word",
    caption_template: "glow_stack",
    font: "Baloo 2",
    size: 48,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#4FA8FF",
    outline: 2.0,
    shadow: 4.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "cartoon_stack",
    name: "Cartoon Stack",
    desc: "Playful Fredoka font with thick border and Caveat top text",
    caption_template: "cartoon_stack",
    font: "Caveat",
    size: 48,
    weight: "700",
    color: "#FFFFFF",
    highlight_color: "#EDE0A6",
    outline: 8.0,
    shadow: 5.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "serif_pop",
    name: "Serif Pop",
    desc: "Elegant Playfair Display italic body with yellow pop dot",
    caption_template: "serif_pop",
    font: "Playfair Display",
    size: 48,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#FFEE00",
    outline: 0.0,
    shadow: 5.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  },
  {
    id: "cinematic_emerald",
    name: "Cinematic Emerald",
    desc: "Layered layout with Outfit base and a giant Playfair Display parrot-green glowy italic keyword",
    caption_template: "cinematic_emerald",
    font: "Outfit",
    size: 48,
    weight: "600",
    color: "#FFFFFF",
    highlight_color: "#8CFF3E",
    outline: 0.0,
    shadow: 5.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
  }
];

export const TEMPLATE_PRESETS_LIST = PRESETS_LIST;

export function getTemplateStyle(templateId: string | undefined | null): TemplateStyleConfig {
  return (templateId && TEMPLATE_STYLES[templateId]) || TEMPLATE_STYLES.word_by_word;
}

// --- Bounding box: every template must keep its text inside a fixed-width
// safe area, shrinking font size rather than letting text overflow. This
// mirrors apps/backend/app/render/engine.py's estimate_text_width/fit
// helpers so the preview and the export never disagree about what fits. ---

/** Rough glyph-width estimate in CSS pixels — same per-character-class
 * heuristic as the Python estimate_text_width, so a "does this overflow"
 * decision made here matches the one the ASS exporter makes. */
export function estimateTextWidthPx(text: string, fontSizePx: number): number {
  let width = 0;
  for (const c of text) {
    if (/[A-Z]/.test(c)) width += fontSizePx * 0.65;
    else if ("1ilI|!.,:;".includes(c)) width += fontSizePx * 0.25;
    else if ("mwMW".includes(c)) width += fontSizePx * 0.85;
    else if (c === " ") width += fontSizePx * 0.3;
    else width += fontSizePx * 0.52;
  }
  return width;
}

/** Shrinks (never grows) fontSizePx so `text` fits within `maxWidthPx`. */
export function fitFontSizePx(fontSizePx: number, text: string, maxWidthPx: number): number {
  if (!text) return fontSizePx;
  const estimated = estimateTextWidthPx(text, fontSizePx);
  if (estimated > maxWidthPx && estimated > 0) {
    return fontSizePx * (maxWidthPx / estimated);
  }
  return fontSizePx;
}

/** Blends a hex color toward white (amount 0..1) — avoids relying on
 * CSS color-mix(), which isn't reliably supported across embedded/older
 * Chromium builds some creators' export/preview surfaces run on. */
export function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/** Blends a hex color toward black (amount 0..1). */
export function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.round(((num >> 16) & 255) * (1 - amount));
  const g = Math.round(((num >> 8) & 255) * (1 - amount));
  const b = Math.round((num & 255) * (1 - amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}
