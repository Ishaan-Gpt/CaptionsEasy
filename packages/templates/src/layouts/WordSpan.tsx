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
}

/** One spoken word: reveals on its beat and carries the active-word effect while it is being said. */
export const WordSpan: React.FC<WordSpanProps> = ({
  word, display, timeMs, style, canvas, intensity, baseCss, trailingSpace, settled, effect, reveal = "progressive",
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

  return (
    <span style={css}>
      {behind}
      {display}
      {bar}
      {trailingSpace ? " " : ""}
    </span>
  );
};

export { progress };
