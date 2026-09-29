import React from "react";
import { exitStyle, SPRINGS, springMs } from "../motion";
import { fitSize } from "../measure";
import { backgroundCss, baseTextCss, containerCss, displayText, famCss, layoutBox, scaleOf } from "../text";
import type { PageRenderProps } from "../types";

/** One word owns the frame; each word pops in on its own beat. */
export const WordLayout: React.FC<PageRenderProps> = ({ page, timeMs, style, canvas, measure, settled }) => {
  const sc = scaleOf(canvas);
  const box = layoutBox(style, canvas, page.position);

  let idx = page.words.findIndex((w) => timeMs >= w.startMs && timeMs < w.endMs);
  if (idx === -1) {
    idx = 0;
    page.words.forEach((w, i) => {
      if (w.startMs <= timeMs) idx = i;
    });
  }
  const word = page.words[idx];
  if (!word) return null;

  const casing = style.casing === "none" ? "upper" : style.casing;
  const display = displayText(word, style, casing);
  const scale = typeof style.templateOptions.sizeScale === "number" ? style.templateOptions.sizeScale : 1.35;
  const size = fitSize(display, style.fontSize * scale * sc, box.width, {
    fontFamily: famCss(style.fontId), fontWeight: style.fontWeight, fontStyle: style.fontStyle, letterSpacing: style.letterSpacing * sc,
  }, measure);

  const pop = settled ? 1 : springMs(timeMs, word.startMs, canvas.fps, SPRINGS.punch);
  const emphasised = word.emphasis === "strong" || word.emphasis === "hero";
  const rot = typeof style.templateOptions.tilt === "number" ? (idx % 2 === 0 ? -1 : 1) * style.templateOptions.tilt * pop : 0;
  const css: React.CSSProperties = {
    ...baseTextCss(style, sc, size),
    transform: `scale(${(0.9 + pop * 0.1) * (1 + (style.active.scale - 1) * (emphasised ? 1 : 0))}) rotate(${rot}deg)`,
    ...(word.color ? { color: word.color, WebkitTextFillColor: word.color, backgroundImage: "none" } : {}),
    ...(emphasised ? { color: style.active.color, WebkitTextFillColor: style.active.color, backgroundImage: "none" } : {}),
  };

  return (
    <div style={containerCss(box, style.rotation)}>
      <div style={{ ...backgroundCss(style, sc), ...exitStyle(style, page.endMs - timeMs, settled) }}>
        <div key={word.id} style={css}>
          {display}
        </div>
      </div>
    </div>
  );
};
