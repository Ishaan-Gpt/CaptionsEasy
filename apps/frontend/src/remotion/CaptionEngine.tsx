/**
 * CaptionEngine — the single source of truth for how captions look and move.
 *
 * Used by BOTH surfaces:
 *   - apps/frontend .................. live preview (60fps rAF clock feeds timeMs)
 *   - apps/remotion-pipeline ......... export render (useCurrentFrame feeds timeMs)
 *
 * ⚠ This file is physically mirrored at:
 *      apps/frontend/src/remotion/CaptionEngine.tsx
 *      apps/remotion-pipeline/src/CaptionEngine.tsx
 *   Keep the two copies byte-identical — that equality IS the WYSIWYG guarantee.
 *
 * Design rules:
 *   - Everything is a pure function of `timeMs`. No CSS transitions, no
 *     state — spring()/interpolate() from the remotion package are pure
 *     math and run identically in the browser and the render pipeline.
 *   - Caption cards are pre-computed with CLAMPED windows (a card always
 *     ends at or before the next card starts) so two cards can never be
 *     on screen at once.
 *   - Every template renders inside the user's bounding box.
 */

import React from "react";
import { interpolate, spring, Easing } from "remotion";

/* ————————————————————————— Types ————————————————————————— */

export interface EngineWord {
  text: string;
  startMs: number;
  endMs: number;
  highlighted?: boolean;
}

export interface BoxMarginsPx {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CaptionCard {
  id: string;
  startMs: number;
  /** Clamped: never overlaps the next card. */
  endMs: number;
  words: EngineWord[];
  heroIndex: number;
  /** Per-card box override (from fragment overrides); null = use style.box. */
  box: BoxMarginsPx | null;
}

export type EntranceAnim = "none" | "rise" | "pop" | "fade";
export type HighlightAnim = "pop" | "flash" | "underline" | "glow";

export interface CaptionStyle {
  template: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  highlightColor: string;
  color2?: string | null;
  colorMode: "solid" | "gradient";
  alignment: "left" | "center" | "right";
  casing: "none" | "uppercase" | "lowercase" | "capitalize";
  underline: boolean;
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  /** 0 disables. */
  shadow: number;
  shadowColor: string;
  /** 0 disables. */
  outline: number;
  outlineColor: string;
  backgroundStyle: "none" | "pill" | "shadow-box";
  xPercent: number | null;
  yPercent: number;
  staggeredLayout: "splash" | "centre";
  heroFont?: string | null;
  heroWeight?: string | null;
  heroSizeScale?: number | null;
  entranceAnim: EntranceAnim;
  highlightAnim: HighlightAnim;
  box: BoxMarginsPx | null;
  accentPeriod?: boolean;
}

export const DEFAULT_BOX: BoxMarginsPx = { top: 80, bottom: 120, left: 50, right: 50 };
const FPS = 30;
const msToFrames = (ms: number) => (ms / 1000) * FPS;

/* ————————————————————— Text measurement ————————————————————— */

/** Cheap width estimate (avg glyph ≈ 0.56em for bold display faces). Both
 * surfaces use the same estimate so they shrink text at the same moment. */
export function estimateTextWidthPx(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * 0.56;
}

export function fitFontSizePx(desired: number, text: string, maxWidthPx: number): number {
  if (!text) return desired;
  const w = estimateTextWidthPx(text, desired);
  return w > maxWidthPx ? Math.max(10, desired * (maxWidthPx / w)) : desired;
}

export function lightenHex(hex: string, amt: number): string {
  return shiftHex(hex, amt, 255);
}
export function darkenHex(hex: string, amt: number): string {
  return shiftHex(hex, amt, 0);
}
function shiftHex(hex: string, amt: number, target: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const ch = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    const nv = Math.round(v + (target - v) * amt);
    return Math.max(0, Math.min(255, nv)).toString(16).padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/* ————————————————————— Card building ————————————————————— */

interface TimelineEventLike {
  start_ms: number;
  end_ms: number;
  type: string;
  payload: any;
}

/** Build exclusive caption cards from a MotionScript timeline. Card windows
 * are clamped to the next card's start: overlap is impossible by
 * construction. Per-word timing comes (in priority order) from the card's
 * own per-word highlight events, then from transcript words inside the
 * window, then from an even split — so the export pipeline (which has no
 * transcript, only the timeline) resolves identical timings to the preview. */
export function buildCardsFromTimeline(
  timeline: TimelineEventLike[],
  transcriptWords: EngineWord[] = [],
): CaptionCard[] {
  const captions = timeline
    .filter((e) => e.type === "caption" && e.payload?.text)
    .sort((a, b) => a.start_ms - b.start_ms);

  return captions.map((cap, i) => {
    const next = captions[i + 1];
    const endMs = next ? Math.min(cap.end_ms, next.start_ms) : cap.end_ms;
    const tokens = String(cap.payload.text).split(/\s+/).filter(Boolean);

    // Per-word timing authored by the planner as highlight events.
    const cardHighlights = timeline.filter(
      (e) =>
        e.type === "highlight" &&
        e.start_ms >= cap.start_ms - 1 &&
        e.start_ms < cap.end_ms &&
        Array.isArray(e.payload?.indices),
    );
    const timingByIdx = new Map<number, { start: number; end: number }>();
    for (const h of cardHighlights) {
      const idx = h.payload.indices[0];
      const existing = timingByIdx.get(idx);
      // Keyword events can duplicate a word's window; keep the earliest.
      if (existing === undefined || h.start_ms < existing.start) {
        timingByIdx.set(idx, { start: h.start_ms, end: h.end_ms });
      }
    }

    const inWindow = transcriptWords.filter(
      (w) => w.startMs >= cap.start_ms - 1 && w.endMs <= cap.end_ms + 1,
    );
    const span = Math.max(1, endMs - cap.start_ms);

    const cardWords: EngineWord[] = tokens.map((t, j) => {
      const fromHighlight = timingByIdx.get(j);
      if (fromHighlight) {
        return { text: t, startMs: fromHighlight.start, endMs: fromHighlight.end, highlighted: inWindow[j]?.highlighted };
      }
      if (inWindow[j]) {
        return { text: t, startMs: inWindow[j].startMs, endMs: inWindow[j].endMs, highlighted: inWindow[j].highlighted };
      }
      return {
        text: t,
        startMs: cap.start_ms + (span * j) / tokens.length,
        endMs: cap.start_ms + (span * (j + 1)) / tokens.length,
      };
    });

    const hero = cardHighlights.find((e) => e.payload?.is_keyword);
    const heroIndex = hero?.payload?.indices?.[0] ?? pickKeywordIndex(cardWords);

    return {
      id: `${cap.start_ms}-${i}`,
      startMs: cap.start_ms,
      endMs,
      words: cardWords,
      heroIndex: Math.min(heroIndex, cardWords.length - 1),
      box: cap.payload?.box ?? null,
    };
  });
}

/** Fallback segmentation for projects without a motion script yet — same
 * pause/sentence heuristics the backend planner uses, and it respects the
 * user's word-limit control instead of a hardcoded constant. */
export function buildCardsFromWords(words: EngineWord[], wordLimit = 5): CaptionCard[] {
  const endsSentence = (t: string) => /[.!?]$/.test((t || "").trim());
  const PAUSE_GAP_MS = 400;
  const max = Math.max(1, wordLimit);

  const cards: CaptionCard[] = [];
  let current: EngineWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    cards.push({
      id: `${current[0].startMs}-${cards.length}`,
      startMs: current[0].startMs,
      endMs: current[current.length - 1].endMs,
      words: current,
      heroIndex: pickKeywordIndex(current),
      box: null,
    });
    current = [];
  };

  for (const w of words) {
    if (current.length > 0) {
      const prev = current[current.length - 1];
      if (endsSentence(prev.text) || w.startMs - prev.endMs > PAUSE_GAP_MS || current.length >= max) {
        flush();
      }
    }
    current.push(w);
  }
  flush();

  // Clamp windows against each other + extend each card to the next card's
  // start so captions hold on screen through pauses instead of blinking out.
  for (let i = 0; i < cards.length; i++) {
    const next = cards[i + 1];
    if (next) {
      cards[i].endMs = Math.min(Math.max(cards[i].endMs, next.startMs), next.startMs);
    }
  }
  return cards;
}

export function pickKeywordIndex(wordsList: { text: string; highlighted?: boolean }[]): number {
  // A word the user explicitly highlighted in the timeline wins outright.
  const manual = wordsList.findIndex((w) => w.highlighted);
  if (manual !== -1) return manual;

  const stopwords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "in", "on",
    "at", "it", "this", "that", "i", "you", "he", "she", "we", "they", "but",
    "or", "so", "be", "as", "for", "with", "my", "your", "do", "does", "did",
  ]);
  let bestIdx = 0;
  let bestScore = -1;
  wordsList.forEach((w, idx) => {
    const clean = (w.text || "").replace(/[^\w]/g, "");
    if (!clean) return;
    let score = clean.length;
    if (stopwords.has(clean.toLowerCase())) score -= 100;
    if (clean[0] === clean[0].toUpperCase()) score += 2;
    if (/\d/.test(clean)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

/* ————————————————————— Animation primitives ————————————————————— */

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Card-level entrance progress: 0→1 across the first 160ms. */
function cardEnterProgress(tLocalMs: number): number {
  return interpolate(tLocalMs, [0, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
}

/** Per-word reveal progress: each word animates in over 130ms at its own start. */
function wordEnterProgress(timeMs: number, word: EngineWord): number {
  return interpolate(timeMs - word.startMs, [0, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
}

/** One-shot spring pop keyed to an absolute start time. */
function popSpring(timeMs: number, startMs: number, damping = 14, stiffness = 220): number {
  const f = Math.max(0, msToFrames(timeMs - startMs));
  return spring({ frame: f, fps: FPS, config: { damping, stiffness, mass: 0.5 } });
}

function entranceStyle(anim: EntranceAnim, p: number, timeMs: number, cardStartMs: number): React.CSSProperties {
  switch (anim) {
    case "none":
      return {};
    case "fade":
      return { opacity: p };
    case "pop": {
      const s = popSpring(timeMs, cardStartMs, 13, 240);
      return { opacity: Math.min(1, p * 2), transform: `scale(${0.92 + s * 0.08})` };
    }
    case "rise":
    default:
      return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
  }
}

/* ————————————————————— Layout helpers ————————————————————— */

interface CanvasSpec {
  width: number;
  height: number;
}

/** Proportional default: a generous safe area scaled to THIS canvas —
 * 6% side margins, 8% top, 10% bottom — instead of fixed pixels designed
 * for one specific 1080x1920 frame. */
export function defaultBoxPx(canvas: CanvasSpec): BoxMarginsPx {
  return {
    top: Math.round(canvas.height * 0.08),
    bottom: Math.round(canvas.height * 0.1),
    left: Math.round(canvas.width * 0.06),
    right: Math.round(canvas.width * 0.06),
  };
}

/** Boxes are persisted as pixel margins, historically against whatever
 * canvas shape the project had at save time — so a stored box can be
 * nonsense for the video now on screen. Sanitize instead of trusting:
 * negative margins clip to 0, and if the remaining region is thinner than
 * 15% of the width / shorter than 8% of the height (or fully outside the
 * frame), fall back to the proportional default. Captions can never
 * escape the video frame, no matter what was saved. */
export function sanitizeBoxPx(box: BoxMarginsPx | null | undefined, canvas: CanvasSpec): BoxMarginsPx {
  if (!box) return defaultBoxPx(canvas);
  const top = Math.max(0, box.top);
  const bottom = Math.max(0, box.bottom);
  const left = Math.max(0, box.left);
  const right = Math.max(0, box.right);
  const w = canvas.width - left - right;
  const h = canvas.height - top - bottom;
  if (w < canvas.width * 0.15 || h < canvas.height * 0.08) {
    return defaultBoxPx(canvas);
  }
  return { top, bottom, left, right };
}

function resolveBox(card: CaptionCard, style: CaptionStyle, canvas: CanvasSpec): BoxMarginsPx {
  return sanitizeBoxPx(card.box ?? style.box, canvas);
}

/** The positioned container every template renders into: horizontally the
 * box's span, vertically centered on yPercent but clamped inside the box. */
function boxContainerStyle(
  card: CaptionCard,
  style: CaptionStyle,
  canvas: CanvasSpec,
): { container: React.CSSProperties; maxWidthPx: number } {
  const box = resolveBox(card, style, canvas);
  const left = Math.max(0, box.left);
  const right = Math.max(0, box.right);
  const maxWidthPx = Math.max(80, canvas.width - left - right);

  const yPx = (canvas.height * (style.yPercent || 71.4)) / 100;
  const clampedY = Math.min(Math.max(yPx, box.top), canvas.height - box.bottom);

  let leftPx = left;
  let translateX = "0";
  if (style.xPercent != null && Math.abs(style.xPercent - 50) > 0.5) {
    leftPx = (canvas.width * style.xPercent) / 100;
    translateX = "-50%";
  }

  return {
    container: {
      position: "absolute",
      left: `${leftPx}px`,
      width: style.xPercent != null && Math.abs(style.xPercent - 50) > 0.5 ? undefined : `${maxWidthPx}px`,
      top: `${clampedY}px`,
      transform: `translate(${translateX}, -50%)`,
      display: "flex",
      flexDirection: "column",
      alignItems:
        style.alignment === "left" ? "flex-start" : style.alignment === "right" ? "flex-end" : "center",
      justifyContent: "center",
      textAlign: style.alignment,
    },
    maxWidthPx,
  };
}

function applyCasing(text: string, casing: CaptionStyle["casing"]): string {
  switch (casing) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

function sharedTextStyle(style: CaptionStyle): React.CSSProperties {
  const css: React.CSSProperties = {
    letterSpacing: `${style.letterSpacing}px`,
    wordSpacing: `${style.wordSpacing}px`,
    textDecoration: style.underline ? "underline" : "none",
  };
  if (style.shadow > 0) {
    css.textShadow = `0px ${style.shadow}px ${Math.max(2, style.shadow * 1.4)}px ${style.shadowColor || "rgba(0,0,0,0.6)"}`;
  }
  if (style.outline > 0) {
    (css as any).WebkitTextStroke = `${style.outline}px ${style.outlineColor || "#000000"}`;
    (css as any).paintOrder = "stroke fill";
  }
  return css;
}

function backgroundWrapStyle(style: CaptionStyle): React.CSSProperties {
  if (style.backgroundStyle === "pill") {
    return {
      padding: "10px 24px",
      backgroundColor: "rgba(12,10,6,0.82)",
      borderRadius: 9999,
    };
  }
  if (style.backgroundStyle === "shadow-box") {
    return {
      padding: "14px 20px",
      backgroundColor: "rgba(12,10,6,0.92)",
      borderRadius: 10,
      boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
    };
  }
  return {};
}

/* ————————————————————— Word renderers ————————————————————— */

/** A body word: reveals with motion at its own timestamp, and (optionally)
 * carries the active-word highlight animation while it is being spoken. */
function BodyWord({
  word,
  display,
  timeMs,
  style,
  baseColor,
  animateHighlight,
  gradientCss,
  trailingSpace,
  settled,
}: {
  word: EngineWord;
  display: string;
  timeMs: number;
  style: CaptionStyle;
  baseColor: string;
  animateHighlight: boolean;
  gradientCss?: string;
  trailingSpace: boolean;
  settled?: boolean;
}) {
  const p = settled && timeMs >= word.startMs ? 1 : wordEnterProgress(timeMs, word);
  const isActive = timeMs >= word.startMs && timeMs < word.endMs;

  const css: React.CSSProperties = {
    display: "inline-block",
    whiteSpace: "pre",
    opacity: p,
    transform: `translateY(${(1 - p) * 0.28}em) scale(${0.94 + p * 0.06})`,
    color: baseColor,
    position: "relative",
  };

  if (gradientCss && !(animateHighlight && isActive)) {
    css.backgroundImage = gradientCss;
    (css as any).WebkitBackgroundClip = "text";
    (css as any).backgroundClip = "text";
    css.color = "transparent";
  }

  let underlineSweep: React.ReactNode = null;
  if (animateHighlight && isActive) {
    const hp = settled ? 1 : popSpring(timeMs, word.startMs);
    switch (style.highlightAnim) {
      case "flash":
        css.color = style.highlightColor;
        break;
      case "glow":
        css.color = style.highlightColor;
        css.textShadow = `0 0 ${12 + hp * 10}px ${style.highlightColor}`;
        break;
      case "underline": {
        const w = settled ? 100 : interpolate(timeMs - word.startMs, [0, 180], [0, 100], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE_OUT,
        });
        underlineSweep = (
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: "-0.08em",
              height: "0.09em",
              width: `${w}%`,
              backgroundColor: style.highlightColor,
              borderRadius: 4,
            }}
          />
        );
        break;
      }
      case "pop":
      default:
        css.color = style.highlightColor;
        css.transform = `scale(${1 + (hp - 1) * 0.0 + hp * 0.12})`;
        break;
    }
  }

  return (
    <span style={css}>
      {display}
      {underlineSweep}
      {trailingSpace ? " " : ""}
    </span>
  );
}

/* ————————————————————— Template layouts ————————————————————— */

interface CardViewProps {
  card: CaptionCard;
  timeMs: number;
  style: CaptionStyle;
  canvas: CanvasSpec;
  /** True while the preview is paused/scrubbing: entrances render settled
   * so a static frame shows the final layout instead of mid-animation. */
  settled?: boolean;
}

/** Three-line stack shared by staggered_3line / glow_stack / cartoon_stack /
 * serif_pop / cinematic_emerald. Each template supplies its skin. */
interface StackSkin {
  bodyFont: (style: CaptionStyle) => string;
  bodyWeight: string | ((style: CaptionStyle) => string);
  bodyColor: (style: CaptionStyle) => string;
  bodyCss?: (style: CaptionStyle) => React.CSSProperties;
  bodySizeScale: number;
  heroFont: (style: CaptionStyle) => string;
  heroWeight: (style: CaptionStyle) => string;
  heroSizeScale: (style: CaptionStyle) => number;
  heroCss: (style: CaptionStyle, heroSize: number, pop: number) => React.CSSProperties;
  heroCasing?: "uppercase" | "lowercase" | "none";
  heroSuffix?: (style: CaptionStyle) => React.ReactNode;
  backdrop?: (style: CaptionStyle, heroSize: number, lineGap: number) => React.ReactNode;
  lineGapScale: number;
  splash: boolean;
  bodyHighlightFlash?: boolean;
}

function ThreeLineStack({ card, timeMs, style, canvas, skin, settled }: CardViewProps & { skin: StackSkin }) {
  const { container, maxWidthPx } = boxContainerStyle(card, style, canvas);
  const hero = card.words[card.heroIndex];
  const line1 = card.words.slice(0, card.heroIndex);
  const line3 = card.words.slice(card.heroIndex + 1);
  const heroTextRaw = hero?.text ?? "";
  const heroText =
    skin.heroCasing === "uppercase"
      ? heroTextRaw.toUpperCase()
      : skin.heroCasing === "lowercase"
        ? heroTextRaw.toLowerCase()
        : applyCasing(heroTextRaw, style.casing);

  const bodyWeight = typeof skin.bodyWeight === "function" ? skin.bodyWeight(style) : skin.bodyWeight;
  const bodySizeRaw = style.size * skin.bodySizeScale;
  const line1Size = fitFontSizePx(bodySizeRaw, line1.map((w) => w.text).join(" "), maxWidthPx);
  const line3Size = fitFontSizePx(bodySizeRaw, line3.map((w) => w.text).join(" "), maxWidthPx);
  const heroSizeRaw = style.size * skin.heroSizeScale(style);
  const heroSize = fitFontSizePx(heroSizeRaw, heroText, maxWidthPx);

  const heroVisible = hero && timeMs >= hero.startMs;
  const heroPop = !hero ? 1 : settled ? 1 : popSpring(timeMs, hero.startMs, 15, 260);

  // Splash anchoring: line1's left edge and line3's right edge pin to the
  // hero word's own edges.
  const heroWidthPx = Math.min(estimateTextWidthPx(heroText, heroSize), maxWidthPx);
  const heroLeftPx = (maxWidthPx - heroWidthPx) / 2;
  const useSplash = skin.splash && style.staggeredLayout !== "centre";

  const lineGap = style.size * skin.lineGapScale * style.lineSpacing;
  const enterP = settled ? 1 : cardEnterProgress(timeMs - card.startMs);

  const lineWrap = (size: number): React.CSSProperties => ({
    position: "relative",
    width: "100%",
    height: `${size * 1.18}px`,
  });

  const bodyLine = (
    words: EngineWord[],
    size: number,
    align: "left" | "right" | "center",
  ) => {
    const inner: React.CSSProperties = {
      whiteSpace: "nowrap",
      fontFamily: skin.bodyFont(style),
      fontSize: `${size}px`,
      fontWeight: bodyWeight as any,
      lineHeight: 1.18,
      ...sharedTextStyle(style),
      ...(skin.bodyCss ? skin.bodyCss(style) : {}),
    };
    const pos: React.CSSProperties = useSplash
      ? align === "left"
        ? { position: "absolute", left: `${heroLeftPx}px`, top: 0 }
        : align === "right"
          ? { position: "absolute", right: `${heroLeftPx}px`, top: 0 }
          : { position: "absolute", left: "50%", transform: "translateX(-50%)", top: 0 }
      : { position: "absolute", left: "50%", transform: "translateX(-50%)", top: 0 };

    return (
      <div style={{ ...inner, ...pos }}>
        {words.map((w, i) => (
          <BodyWord
            key={`${w.startMs}-${i}`}
            word={w}
            display={applyCasing(w.text, style.casing)}
            timeMs={timeMs}
            style={style}
            baseColor={skin.bodyColor(style)}
            animateHighlight={Boolean(skin.bodyHighlightFlash)}
            trailingSpace={i < words.length - 1}
            settled={settled}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={container}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: `${maxWidthPx}px`,
          gap: `${Math.max(0, lineGap - bodySizeRaw)}px`,
          ...entranceStyle(style.entranceAnim, enterP, timeMs, card.startMs),
        }}
      >
        {skin.backdrop ? skin.backdrop(style, heroSize, lineGap) : null}
        {line1.length > 0 && <div style={lineWrap(line1Size)}>{bodyLine(line1, line1Size, "left")}</div>}
        {heroText && (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              fontFamily: skin.heroFont(style),
              fontSize: `${heroSize}px`,
              fontWeight: skin.heroWeight(style) as any,
              lineHeight: 1.05,
              opacity: heroVisible ? 1 : 0,
              transform: `scale(${0.85 + heroPop * 0.15})`,
              ...skin.heroCss(style, heroSize, heroPop),
            }}
          >
            {heroText}
            {skin.heroSuffix ? skin.heroSuffix(style) : null}
          </div>
        )}
        {line3.length > 0 && <div style={lineWrap(line3Size)}>{bodyLine(line3, line3Size, "right")}</div>}
      </div>
    </div>
  );
}

const STACK_SKINS: Record<string, StackSkin> = {
  staggered_3line: {
    bodyFont: (s) => s.font,
    bodyWeight: "700",
    bodyColor: (s) => s.color || "#FFFFFF",
    bodySizeScale: 1.1,
    bodyCss: (s) => ({
      WebkitTextStroke: `${s.outline > 0 ? s.outline : 2}px ${s.outlineColor || "#000000"}`,
      paintOrder: "stroke fill",
    }),
    heroFont: (s) => s.heroFont || "Anton",
    heroWeight: (s) => s.heroWeight || "900",
    heroSizeScale: (s) => s.heroSizeScale ?? 1.5,
    heroCasing: "uppercase",
    heroCss: (s) => ({
      color: s.highlightColor || "#C5FF00",
      WebkitTextStroke: `${s.outline > 0 ? s.outline : 2}px ${s.outlineColor || "#000000"}`,
      paintOrder: "stroke fill",
    }),
    lineGapScale: 1.25,
    splash: true,
  },
  glow_stack: {
    bodyFont: () => "'Baloo 2', sans-serif",
    bodyWeight: "800",
    bodyColor: () => "#FFFFFF",
    bodySizeScale: 1.2,
    bodyCss: () => ({ textShadow: "0px 3px 6px rgba(0,0,0,0.45)" }),
    heroFont: (s) => s.heroFont || "Anton",
    heroWeight: (s) => s.heroWeight || "900",
    heroSizeScale: (s) => s.heroSizeScale ?? 2.3,
    heroCasing: "uppercase",
    heroCss: (s) => ({
      color: s.highlightColor || "#4FA8FF",
      textShadow: "0px 4px 8px rgba(0,0,0,0.45)",
    }),
    backdrop: (_s, heroSize, lineGap) => (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${heroSize * 3.2}px`,
          height: `${lineGap * 3.4}px`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(ellipse 62% 58% at 50% 50%, rgba(10,16,32,0.55), rgba(10,16,32,0.28) 55%, transparent 78%)",
          filter: "blur(28px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    ),
    lineGapScale: 1.1,
    splash: true,
  },
  cartoon_stack: {
    bodyFont: () => "Caveat, cursive",
    bodyWeight: "700",
    bodyColor: (s) => s.color || "#FFFFFF",
    bodySizeScale: 0.85,
    heroFont: (s) => s.heroFont || "Fredoka",
    heroWeight: (s) => s.heroWeight || "700",
    heroSizeScale: (s) => s.heroSizeScale ?? 1.6,
    heroCasing: "lowercase",
    heroCss: (s, heroSize) => ({
      color: s.highlightColor || "#EDE0A6",
      WebkitTextStroke: `${Math.max(4, heroSize * 0.055)}px ${darkenHex(s.highlightColor || "#EDE0A6", 0.65)}`,
      paintOrder: "stroke fill",
      textShadow: "0px 5px 6px rgba(0,0,0,0.45)",
    }),
    lineGapScale: 0.95,
    splash: false,
  },
  serif_pop: {
    bodyFont: (s) => s.font,
    bodyWeight: "900",
    bodyColor: () => "#FFFFFF",
    bodySizeScale: 1.0,
    bodyCss: () => ({ textShadow: "0px 3px 3px rgba(0,0,0,0.45), 0px 6px 10px rgba(0,0,0,0.35)" }),
    heroFont: (s) => s.heroFont || "'Kaushan Script', cursive",
    heroWeight: (s) => s.heroWeight || "400",
    heroSizeScale: (s) => s.heroSizeScale ?? 1.8,
    heroCss: () => ({
      color: "#FFFFFF",
      textShadow: "0px 3px 3px rgba(0,0,0,0.45), 0px 6px 10px rgba(0,0,0,0.35)",
    }),
    heroSuffix: (s) =>
      s.accentPeriod === false ? null : <span style={{ color: s.highlightColor || "#FFEE00" }}>.</span>,
    lineGapScale: 1.15,
    splash: false,
    bodyHighlightFlash: true,
  },
  cinematic_emerald: {
    bodyFont: (s) => s.font,
    bodyWeight: (s) => s.weight || "600",
    bodyColor: () => "#FFFFFF",
    bodySizeScale: 1.1,
    bodyCss: (s) => ({
      textShadow: `0px 1px 0px rgba(255,255,255,0.55), 0px -1px 0px rgba(0,0,0,0.18), 0px 6px 16px rgba(0,0,0,0.4), 0px 0px 20px ${(s.highlightColor || "#8CFF3E")}40`,
    }),
    heroFont: (s) => s.heroFont || "'Playfair Display', serif",
    heroWeight: (s) => s.heroWeight || "900",
    heroSizeScale: (s) => s.heroSizeScale ?? 2.2,
    heroCss: (s) => {
      const hl = s.highlightColor || "#8CFF3E";
      const light = lightenHex(hl, 0.45);
      const dark = darkenHex(hl, 0.3);
      return {
        fontStyle: "italic",
        letterSpacing: "-0.01em",
        background: `linear-gradient(160deg, ${dark} 0%, ${hl} 45%, ${light} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        rotate: "-4deg",
        textShadow: `0px 8px 25px rgba(0,0,0,0.3), 0px 0px 36px ${light}b3, 0px 0px 14px ${hl}cc`,
      };
    },
    backdrop: (s, heroSize) => {
      const hl = s.highlightColor || "#8CFF3E";
      const light = lightenHex(hl, 0.45);
      return (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: `${heroSize * 4}px`,
            height: `${heroSize * 2.2}px`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(ellipse at center, ${light}66 0%, ${hl}33 45%, transparent 75%)`,
            filter: "blur(18px)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      );
    },
    lineGapScale: 1.05,
    splash: false,
  },
};

/** word_by_word: one word owns the frame; each word pops in on its beat. */
function WordByWordCard({ card, timeMs, style, canvas, settled }: CardViewProps) {
  const { container, maxWidthPx } = boxContainerStyle(card, style, canvas);
  const idx = card.words.findIndex((w) => timeMs >= w.startMs && timeMs < w.endMs);
  const activeIdx = idx === -1 ? (timeMs >= card.endMs ? card.words.length - 1 : findLastSpoken(card.words, timeMs)) : idx;
  const word = card.words[activeIdx];
  if (!word) return null;

  const display = applyCasing(word.text, style.casing === "none" ? "uppercase" : style.casing);
  const size = fitFontSizePx(style.size * 1.35, display, maxWidthPx);
  const pop = settled ? 1 : popSpring(timeMs, word.startMs, 13, 240);

  const css: React.CSSProperties = {
    fontFamily: style.font,
    fontSize: `${size}px`,
    fontWeight: style.weight as any,
    lineHeight: 1.1,
    color: word.highlighted ? style.highlightColor : style.color,
    transform: `scale(${0.9 + pop * 0.1})`,
    ...sharedTextStyle(style),
  };
  if (style.colorMode === "gradient" && style.color2) {
    css.backgroundImage = `linear-gradient(135deg, ${style.color}, ${style.color2})`;
    (css as any).WebkitBackgroundClip = "text";
    css.color = "transparent";
  }

  return (
    <div style={container}>
      <div style={{ ...backgroundWrapStyle(style) }}>
        <div key={word.startMs} style={css}>
          {display}
        </div>
      </div>
    </div>
  );
}

function findLastSpoken(words: EngineWord[], timeMs: number): number {
  let last = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= timeMs) last = i;
  }
  return last;
}

/** sentence_highlight / sentence_clean / generic: full sentence block. */
function SentenceCard({ card, timeMs, style, canvas, animateActive, settled }: CardViewProps & { animateActive: boolean }) {
  const { container, maxWidthPx } = boxContainerStyle(card, style, canvas);
  const enterP = settled ? 1 : cardEnterProgress(timeMs - card.startMs);
  const gradientCss =
    style.colorMode === "gradient"
      ? `linear-gradient(135deg, ${style.color}, ${style.color2 || style.highlightColor})`
      : undefined;

  return (
    <div style={container}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent:
            style.alignment === "left" ? "flex-start" : style.alignment === "right" ? "flex-end" : "center",
          columnGap: `${10 + style.wordSpacing}px`,
          rowGap: `${8 * style.lineSpacing}px`,
          maxWidth: `${maxWidthPx}px`,
          fontFamily: style.font,
          fontWeight: style.weight as any,
          fontSize: `${style.size}px`,
          lineHeight: style.lineSpacing * 1.2,
          ...backgroundWrapStyle(style),
          ...entranceStyle(style.entranceAnim, enterP, timeMs, card.startMs),
        }}
      >
        {card.words.map((w, i) => (
          <span key={`${w.startMs}-${i}`} style={{ fontSize: `${fitFontSizePx(style.size, w.text, maxWidthPx)}px`, ...sharedTextStyle(style) }}>
            <BodyWord
              word={w}
              display={applyCasing(w.text, style.casing)}
              timeMs={timeMs}
              style={style}
              baseColor={style.color}
              animateHighlight={animateActive}
              gradientCss={gradientCss}
              trailingSpace={false}
              settled={settled}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————— Public components ————————————————————— */

/** Renders ONE card at a given absolute time. Pure — safe in Remotion. */
export const CaptionCardView: React.FC<CardViewProps> = ({ card, timeMs, style, canvas, settled }) => {
  if (timeMs < card.startMs || timeMs >= card.endMs) return null;
  if (card.words.length === 0) return null;

  const skin = STACK_SKINS[style.template];
  if (skin) {
    return <ThreeLineStack card={card} timeMs={timeMs} style={style} canvas={canvas} skin={skin} settled={settled} />;
  }
  if (style.template === "word_by_word") {
    return <WordByWordCard card={card} timeMs={timeMs} style={style} canvas={canvas} settled={settled} />;
  }
  return (
    <SentenceCard
      card={card}
      timeMs={timeMs}
      style={style}
      canvas={canvas}
      animateActive={style.template !== "sentence_clean"}
      settled={settled}
    />
  );
};

/** Finds and renders the active card. Used by the live preview. While
 * settled (paused/scrubbing) with no card under the playhead, the nearest
 * card renders fully revealed instead — the canvas never looks caption-less
 * just because the playhead sits in a gap or before the first word. */
export const CaptionCanvas: React.FC<{
  timeMs: number;
  cards: CaptionCard[];
  style: CaptionStyle;
  canvas: CanvasSpec;
  settled?: boolean;
}> = ({ timeMs, cards, style, canvas, settled }) => {
  const active = cards.find((c) => timeMs >= c.startMs && timeMs < c.endMs);
  if (active) {
    return <CaptionCardView card={active} timeMs={timeMs} style={style} canvas={canvas} settled={settled} />;
  }
  if (!settled || cards.length === 0) return null;
  const nearest = cards.reduce((best, c) => {
    const dBest = Math.abs(timeMs - (best.startMs + best.endMs) / 2);
    const dC = Math.abs(timeMs - (c.startMs + c.endMs) / 2);
    return dC < dBest ? c : best;
  });
  // Render at the card's last instant so every word shows fully revealed.
  return (
    <CaptionCardView
      card={nearest}
      timeMs={Math.max(nearest.startMs, nearest.endMs - 1)}
      style={style}
      canvas={canvas}
      settled
    />
  );
};

/** Map MotionScript global_settings + payloads to a CaptionStyle. Shared by
 * the export pipeline (authoritative) and usable by the preview as a check. */
export function styleFromMotionScript(ms: any): CaptionStyle {
  const gs = ms?.global_settings ?? {};
  const firstCaption = (ms?.timeline ?? []).find((e: any) => e.type === "caption")?.payload ?? {};
  const hero = (ms?.timeline ?? []).find((e: any) => e.type === "highlight" && e.payload?.is_keyword)?.payload ?? {};
  const safe = gs.safe_area ?? null;

  return {
    template: gs.caption_template || "staggered_3line",
    font: firstCaption.font || gs.default_font || "Outfit",
    size: firstCaption.size ?? 48,
    weight: firstCaption.weight || "800",
    color: firstCaption.color || "#FFFFFF",
    highlightColor: hero.color || firstCaption.highlight_color || "#00F5C4",
    color2: firstCaption.color2 ?? null,
    colorMode: firstCaption.color_mode || "solid",
    alignment: (firstCaption.alignment as any) || "center",
    casing: (firstCaption.text_transform as any) || "none",
    underline: Boolean(firstCaption.underline),
    letterSpacing: firstCaption.letter_spacing ?? 0,
    wordSpacing: firstCaption.word_spacing ?? 0,
    lineSpacing: firstCaption.line_spacing ?? 1,
    shadow: firstCaption.shadow ?? 0,
    shadowColor: firstCaption.shadow_color || "rgba(0,0,0,0.6)",
    outline: firstCaption.outline ?? 0,
    outlineColor: firstCaption.outline_color || "#000000",
    backgroundStyle: (firstCaption.background_style as any) || "none",
    xPercent: firstCaption.x_position_percent ?? null,
    yPercent: firstCaption.y_position_percent ?? 71.4,
    staggeredLayout: (gs.staggered_layout as any) || "splash",
    heroFont: hero.font ?? null,
    heroWeight: hero.weight ?? null,
    heroSizeScale: hero.size_scale ?? null,
    entranceAnim: (firstCaption.entrance_anim as any) || "rise",
    highlightAnim: (firstCaption.highlight_anim as any) || "pop",
    box: safe
      ? { top: safe.top ?? 80, bottom: safe.bottom ?? 120, left: safe.left ?? 50, right: safe.right ?? 50 }
      : DEFAULT_BOX,
    accentPeriod: gs.accent_period_enabled !== false,
  };
}
