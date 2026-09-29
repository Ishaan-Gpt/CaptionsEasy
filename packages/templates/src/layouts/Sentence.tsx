import React from "react";
import { effectiveIntensity, entranceStyle, exitStyle } from "../motion";
import { backgroundCss, baseTextCss, containerCss, displayText, famCss, layoutBox, scaleOf } from "../text";
import type { PageRenderProps } from "../types";
import { WordSpan } from "./WordSpan";

/** Full sentence block: explicit lines from the segmenter, active-word effect, real-metric fitting. */
export const SentenceLayout: React.FC<PageRenderProps> = ({ page, timeMs, style, canvas, measure, settled }) => {
  const sc = scaleOf(canvas);
  const box = layoutBox(style, canvas, page.position);
  const intensity = effectiveIntensity(style, page.emotion);
  const local = timeMs - page.startMs;
  const reveal = style.templateOptions.reveal === "all" ? "all" : "progressive";

  const baseSize = style.fontSize * sc;
  const lines = page.lines.map((l) => l.map((w) => displayText(w, style)));
  const spec = { fontFamily: famCss(style.fontId), fontWeight: style.fontWeight, fontStyle: style.fontStyle, letterSpacing: style.letterSpacing * sc };
  const widest = Math.max(1, ...lines.map((t) => measure(t.join(" "), { ...spec, fontSize: baseSize })));
  const size = widest > box.width ? baseSize * (box.width / widest) : baseSize;

  const justify = style.align === "left" ? "flex-start" : style.align === "right" ? "flex-end" : "center";
  const baseCss = baseTextCss(style, sc, size);

  return (
    <div style={containerCss(box, style.rotation)}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: justify,
          rowGap: (style.lineHeight - 1) * size * 0.5,
          ...backgroundCss(style, sc),
          ...entranceStyle(style, local, canvas.fps, intensity, settled),
          ...exitStyle(style, page.endMs - timeMs, settled),
        }}
      >
        {page.lines.map((line, li) => (
          <div key={li} style={{ display: "flex", flexWrap: "nowrap", justifyContent: justify, whiteSpace: "pre" }}>
            {line.map((w, wi) => (
              <WordSpan
                key={w.id}
                word={w}
                display={lines[li]![wi]!}
                timeMs={timeMs}
                style={style}
                canvas={canvas}
                intensity={intensity}
                baseCss={baseCss}
                trailingSpace={wi < line.length - 1}
                settled={settled}
                reveal={reveal}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
