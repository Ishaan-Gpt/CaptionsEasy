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
    baseSizeScale: 1.2,
    baseWeight: "900",
    keywordSizeScale: 1.9,
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
};

export const TEMPLATE_PRESETS_LIST = Object.values(TEMPLATE_STYLES);

export function getTemplateStyle(templateId: string | undefined | null): TemplateStyleConfig {
  return (templateId && TEMPLATE_STYLES[templateId]) || TEMPLATE_STYLES.word_by_word;
}
