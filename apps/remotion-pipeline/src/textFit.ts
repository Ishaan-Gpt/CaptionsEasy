// Remotion-side mirror of apps/frontend/src/config/captionTemplates.ts's
// bounding-box helpers. Three independent copies now exist (Python ASS
// exporter, frontend live preview, this Remotion renderer) — kept in sync by
// hand because each side only has access to its own text-measurement
// primitives. All three must agree on what counts as "overflow" so the
// preview, the ASS export, and the Remotion export never disagree about
// what fits.

/** Rough glyph-width estimate in CSS pixels — same per-character-class
 * heuristic as the Python estimate_text_width and the frontend copy. */
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

/** Blends a hex color toward white (amount 0..1). */
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
