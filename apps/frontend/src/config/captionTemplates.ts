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

  /** What the sidebar can actually honor for this template — drives real
   * conditional show/hide instead of static hint prose. Mirrors the render
   * logic in @motion-ai/caption-engine's CaptionCardView dispatch:
   *   - no hero word           → sentence_clean only (ThreeLineStack /
   *                               WordByWordCard both require one)
   *   - alignment               → SentenceCard reads style.alignment;
   *                               ThreeLineStack only does when its skin
   *                               isn't in splash mode (cartoon_stack /
   *                               serif_pop / cinematic_emerald, or
   *                               staggered_3line / glow_stack switched to
   *                               "centre"); WordByWordCard always centers
   *                               a single word regardless.
   *   - splash/centre stagger   → only the two skins with `splash: true`
   *                               (staggered_3line, glow_stack) branch on it.
   *   - accent period dot       → only serif_pop's heroSuffix reads it.
   */
  capabilities: {
    hero: boolean;
    alignment: boolean;
    stagger: boolean;
    accentPeriod: boolean;
  };
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
    capabilities: { hero: true, alignment: false, stagger: true, accentPeriod: false },
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
    capabilities: { hero: true, alignment: false, stagger: false, accentPeriod: false },
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
    capabilities: { hero: true, alignment: true, stagger: false, accentPeriod: false },
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
    capabilities: { hero: false, alignment: true, stagger: false, accentPeriod: false },
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
    capabilities: { hero: true, alignment: false, stagger: true, accentPeriod: false },
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
    capabilities: { hero: true, alignment: true, stagger: false, accentPeriod: false },
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
    capabilities: { hero: true, alignment: true, stagger: false, accentPeriod: true },
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
    capabilities: { hero: true, alignment: true, stagger: false, accentPeriod: false },
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
  /** Default caption safe-area box for this template, mirroring each
   * preset's `safe_area` in apps/backend/app/render/presets.json. Template
   * switches must reset the box to these values — otherwise a box left
   * over from a previous template (or a manual drag) silently carries over
   * and can look misplaced against the new template's own layout. */
  box_top: number;
  box_bottom: number;
  box_left: number;
  box_right: number;
}

export const PRESETS_LIST: PresetConfig[] = [
  {
    id: "hormozi_viral",
    name: "Hormozi Viral",
    desc: "Bold Anton font, electric yellow active word with thick black outline",
    caption_template: "sentence_highlight",
    font: "Anton",
    size: 54,
    weight: "900",
    color: "#FFFFFF",
    highlight_color: "#FFE600",
    outline: 3.5,
    shadow: 2.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 2,
    caption_spacing_ms: 40,
    word_pacing: "dynamic",
    pause_handling: "hold",
    box_top: 80, box_bottom: 120, box_left: 50, box_right: 50,
  },
  {
    id: "mrbeast_punch",
    name: "MrBeast Punch",
    desc: "Lilita One font, neon cyan highlight with strong 3D drop shadow",
    caption_template: "word_by_word",
    font: "Lilita One",
    size: 58,
    weight: "900",
    color: "#FFFFFF",
    highlight_color: "#00F5FF",
    outline: 4.0,
    shadow: 4.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 1,
    caption_spacing_ms: 30,
    word_pacing: "dynamic",
    pause_handling: "clear",
    box_top: 60, box_bottom: 150, box_left: 40, box_right: 40,
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    desc: "Monospace font with electrifying magenta and cyan neon glow",
    caption_template: "glow_stack",
    font: "Space Mono",
    size: 50,
    weight: "700",
    color: "#E0F7FA",
    highlight_color: "#FF007F",
    outline: 2.0,
    shadow: 4.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 4,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
    box_top: 80, box_bottom: 120, box_left: 50, box_right: 50,
  },
  {
    id: "tiktok_pop",
    name: "TikTok Pop",
    desc: "Fredoka font with soft pill background highlight and lime accent",
    caption_template: "sentence_highlight",
    font: "Fredoka",
    size: 52,
    weight: "700",
    color: "#FFFFFF",
    highlight_color: "#76FF03",
    outline: 2.0,
    shadow: 1.5,
    background_style: "pill",
    y_position_percent: 71.4,
    word_limit: 3,
    caption_spacing_ms: 60,
    word_pacing: "even",
    pause_handling: "hold",
    box_top: 80, box_bottom: 110, box_left: 50, box_right: 50,
  },
  {
    id: "minimal_luxe",
    name: "Minimal Luxe",
    desc: "Cinzel serif typography with champagne gold highlight accents",
    caption_template: "sentence_clean",
    font: "Cinzel",
    size: 44,
    weight: "600",
    color: "#F8F5EE",
    highlight_color: "#E5C158",
    outline: 0.5,
    shadow: 1.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 4,
    caption_spacing_ms: 120,
    word_pacing: "even",
    pause_handling: "hold",
    box_top: 100, box_bottom: 100, box_left: 80, box_right: 80,
  },
  {
    id: "vintage_cinematic",
    name: "Vintage Cinematic",
    desc: "Playfair Display font with vibrant emerald green hero word",
    caption_template: "cinematic_emerald",
    font: "Playfair Display",
    size: 48,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#8CFF3E",
    outline: 0.0,
    shadow: 3.0,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
    box_top: 80, box_bottom: 120, box_left: 65, box_right: 65,
  },
  {
    id: "bold_impact",
    name: "Bold Impact",
    desc: "Heavy Montserrat font with blazing neon orange pop highlight",
    caption_template: "sentence_highlight",
    font: "Montserrat",
    size: 54,
    weight: "900",
    color: "#FFFFFF",
    highlight_color: "#FF5722",
    outline: 3.0,
    shadow: 2.5,
    background_style: "none",
    y_position_percent: 71.4,
    word_limit: 3,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
    box_top: 80, box_bottom: 120, box_left: 50, box_right: 50,
  },
  {
    id: "staggered_splash",
    name: "Staggered Splash",
    desc: "Outfit font with multi-line staggered layout & neon green active word",
    caption_template: "staggered_3line",
    font: "Outfit",
    size: 50,
    weight: "800",
    color: "#FFFFFF",
    highlight_color: "#C5FF00",
    outline: 2.5,
    shadow: 2.0,
    background_style: "none",
    y_position_percent: 71.4,
    staggered_layout: "splash",
    accent_period_enabled: true,
    word_limit: 5,
    caption_spacing_ms: 50,
    word_pacing: "dynamic",
    pause_handling: "hold",
    box_top: 80, box_bottom: 120, box_left: 65, box_right: 65,
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
