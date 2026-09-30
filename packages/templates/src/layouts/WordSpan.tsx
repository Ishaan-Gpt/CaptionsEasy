import React from "react";
import type { CaptionStyleV2, Word } from "@capseasy/shared";
import { activeEffect, entranceStyle, progress, staggerDelayMs, staggerUnit, wordReveal } from "../motion";
import type { Canvas } from "../types";
import { scaleOf, wordGapCss } from "../text";

export interface WordSpanProps {
  word: Word;
  display: string;
  timeMs: number;
  style: CaptionStyleV2;
  canvas: Canvas;
  intensity: number;
  /** typography css computed by the layout (font, size, fill, stroke, shadow) */
  baseCss: React.CSSProperties;
  /** not the last word on its line: keep a gap after it (see wordGapCss) */
  trailingSpace: boolean;
  settled?: boolean;
  /** override style.active.effect (null = never animate the active word) */
  effect?: CaptionStyleV2["active"]["effect"] | null;
  /** "progressive" (legacy): words appear when spoken. "all": every word is visible, inactive dimmed. */
  reveal?: "progressive" | "all";
  /** karaoke: colour of words that have already been spoken */
  pastColor?: string;
  /** staggered card entrance: this word (or each of its letters) enters on its own, offset by its position */
  stagger?: { unit: "word" | "char"; index: number; charOffset: number; pageStartMs: number };
}

/** One spoken word: reveals on its beat and carries the active-word effect while it is being said. */
export const WordSpan: React.FC<WordSpanProps> = ({
  word, display, timeMs, style, canvas, intensity, baseCss, trailingSpace, settled, effect, reveal = "progressive", pastColor, stagger,
}) => {
  const sc = scaleOf(canvas);
  const spoken = timeMs >= word.startMs;
  const isActive = spoken && timeMs < word.endMs;
  const p = settled ? (spoken || reveal === "all" ? 1 : 1) : wordReveal(timeMs, word.startMs);

  const css: React.CSSProperties = {
    ...baseCss,
    display: "inline-block",
    whiteSpace: "pre",
    position: "relative",
    opacity: reveal === "all" ? (spoken ? 1 : style.inactiveOpacity) : p,
    transform: `translateY(${(1 - p) * 0.28}em) scale(${0.94 + p * 0.06})`,
  };
  if (word.color) Object.assign(css, { color: word.color, WebkitTextFillColor: word.color, backgroundImage: "none" });
  else if (word.emphasis === "strong" || word.emphasis === "hero") Object.assign(css, { color: style.active.color, WebkitTextFillColor: style.active.color, backgroundImage: "none" });

  if (pastColor && timeMs >= word.endMs) Object.assign(css, { color: pastColor, WebkitTextFillColor: pastColor, backgroundImage: "none", opacity: 1 });

  let behind: React.ReactNode = null;
  let bar: React.ReactNode = null;
  const eff = effect === undefined ? style.active.effect : effect;
  if (trailingSpace) css.marginRight = wordGapCss(style, sc, eff);
  if (isActive && eff) {
    const res = activeEffect({ ...style, active: { ...style.active, effect: eff } }, word, timeMs, canvas.fps, sc, intensity, settled);
    const { transform: activeTransform, ...rest } = res.css;
    Object.assign(css, rest);
    if (activeTransform) css.transform = `${css.transform} ${activeTransform}`;
    if (res.behind) behind = <span style={{ position: "absolute", pointerEvents: "none", ...res.behind.css }} />;
    if (res.bar) bar = <span style={{ position: "absolute", pointerEvents: "none", ...res.bar.css }} />;
  }

  const showEmoji = style.emoji.enabled && word.emoji && (word.emoji.position === "before" || word.emoji.position === "after");
  const emo = showEmoji ? <span style={{ fontFamily: "'Noto Color Emoji', sans-serif", WebkitTextStroke: "0px transparent", WebkitTextFillColor: "initial", color: "initial", backgroundImage: "none" }}>{word.emoji!.char}</span> : null;
  const emojiBefore = word.emoji?.position === "before" ? emo : null;
  const emojiAfter = word.emoji?.position === "after" ? emo : null;

  const local = timeMs - (stagger?.pageStartMs ?? 0);
  const text = stagger?.unit === "char" && !settled
    ? [...display].map((ch, ci) => (
        <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", ...entranceStyle(style, local - staggerDelayMs(style, stagger.charOffset + ci, "char"), canvas.fps, intensity) }}>{ch}</span>
      ))
    : display;
  const inner = (
    <span style={css}>
      {behind}
      {emojiBefore}
      {text}
      {emojiAfter}
      {bar}
    </span>
  );
  if (stagger?.unit !== "word" || settled) return inner;
  const enter = entranceStyle(style, local - staggerDelayMs(style, stagger.index, "word"), canvas.fps, intensity);
  const { marginRight, ...innerCss } = css;
  return (
    <span style={{ display: "inline-block", marginRight, ...enter }}>
      <span style={innerCss}>
        {behind}
        {emojiBefore}
        {text}
        {emojiAfter}
        {bar}
      </span>
    </span>
  );
};

export { progress };

/** Stagger bookkeeping for a card: each word's position and first-letter offset (null = the card enters as one). */
export function staggerPlan(style: CaptionStyleV2, page: { startMs: number; lines: Word[][] }, texts: string[][]) {
  const unit = staggerUnit(style);
  if (unit === "none") return null;
  const at = new Map<string, { index: number; charOffset: number }>();
  let i = 0;
  let c = 0;
  page.lines.forEach((l, li) => l.forEach((w, wi) => {
    at.set(w.id, { index: i++, charOffset: c });
    c += texts[li]?.[wi]?.length ?? 0;
  }));
  return (id: string) => ({ unit, pageStartMs: page.startMs, ...(at.get(id) ?? { index: 0, charOffset: 0 }) });
}
