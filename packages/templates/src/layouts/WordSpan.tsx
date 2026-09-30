import React from "react";
import type { CaptionStyleV2, Word } from "@capseasy/shared";
import { activeEffect, progress, wordReveal } from "../motion";
import type { Canvas } from "../types";
import { scaleOf } from "../text";

export interface WordSpanProps {
  word: Word;
  display: string;
  timeMs: number;
  style: CaptionStyleV2;
  canvas: Canvas;
  intensity: number;
  /** typography css computed by the layout (font, size, fill, stroke, shadow) */
  baseCss: React.CSSProperties;
  trailingSpace: boolean;
  settled?: boolean;
  /** override style.active.effect (null = never animate the active word) */
  effect?: CaptionStyleV2["active"]["effect"] | null;
  /** "progressive" (legacy): words appear when spoken. "all": every word is visible, inactive dimmed. */
  reveal?: "progressive" | "all";
  /** karaoke: colour of words that have already been spoken */
  pastColor?: string;
}

/** One spoken word: reveals on its beat and carries the active-word effect while it is being said. */
export const WordSpan: React.FC<WordSpanProps> = ({
  word, display, timeMs, style, canvas, intensity, baseCss, trailingSpace, settled, effect, reveal = "progressive", pastColor,
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

  return (
    <span style={css}>
      {behind}
      {emojiBefore}
      {display}
      {emojiAfter}
      {bar}
      {trailingSpace ? " " : ""}
    </span>
  );
};

export { progress };
