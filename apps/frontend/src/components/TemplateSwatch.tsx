"use client";

import { PresetConfig } from "@/config/captionTemplates";

interface Props {
  preset: PresetConfig;
}

/** Approximates a text-stroke ("outline") the same way the ASS/Remotion
 * exporters fake one — layered text-shadows in 8 directions — since
 * `-webkit-text-stroke` renders visibly thinner/different across browsers
 * and would make the swatch lie about what the export actually looks like. */
function outlineShadow(px: number, color = "#000000"): string {
  if (px <= 0) return "none";
  const d = Math.max(1, Math.round(px * 0.6));
  return [
    `-${d}px -${d}px 0 ${color}`, `${d}px -${d}px 0 ${color}`,
    `-${d}px ${d}px 0 ${color}`, `${d}px ${d}px 0 ${color}`,
    `0 -${d}px 0 ${color}`, `0 ${d}px 0 ${color}`,
    `-${d}px 0 0 ${color}`, `${d}px 0 0 ${color}`,
  ].join(", ");
}

/** A small, honest, CSS-only preview of a caption preset — real font, real
 * weight, real colors, real outline/shadow/background — rendered directly
 * against the preset's own config instead of a static screenshot, so it
 * never drifts out of sync with what picking the preset actually applies.
 * Not a pixel-perfect stand-in for the 5 templates with bespoke layered
 * layouts (gradients/glow/extrusion) — those still need the live preview
 * player for a full look — but it replaces "just a name" with an honest
 * glance at typography and color, which is the gap that mattered most. */
export function TemplateSwatch({ preset }: Props) {
  const isWordByWord = preset.caption_template === "word_by_word";
  const isStaggered = preset.caption_template === "staggered_3line";
  const baseShadow = preset.shadow > 0 ? `0 ${Math.round(preset.shadow)}px ${Math.round(preset.shadow * 2)}px rgba(0,0,0,0.6)` : "none";
  const stroke = outlineShadow(preset.outline);
  const textShadow = [stroke, baseShadow].filter((s) => s !== "none").join(", ") || "none";

  const bgPad = preset.background_style === "pill" ? "3px 10px" : preset.background_style === "shadow-box" ? "4px 8px" : "0";
  const bgRadius = preset.background_style === "pill" ? "999px" : preset.background_style === "shadow-box" ? "4px" : "0";
  const bgColor = preset.background_style !== "none" ? "rgba(0,0,0,0.55)" : "transparent";

  const wordStyle = (isHighlight: boolean): React.CSSProperties => ({
    fontFamily: `"${preset.font}", sans-serif`,
    fontWeight: preset.weight,
    color: isHighlight ? preset.highlight_color : preset.color,
    textShadow,
    padding: bgPad,
    background: bgColor,
    borderRadius: bgRadius,
    lineHeight: 1.15,
  });

  return (
    <div
      className="w-full aspect-video rounded-md overflow-hidden flex items-center justify-center relative"
      style={{
        background: "radial-gradient(circle at 50% 35%, #2C2314 0%, #171208 75%)",
      }}
    >
      {isWordByWord ? (
        <span className="text-[15px] uppercase tracking-wide" style={wordStyle(true)}>
          {(preset.name.split(" ")[0] || "WORD").toUpperCase()}
        </span>
      ) : isStaggered ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[8px] uppercase" style={wordStyle(false)}>hello and</span>
          <span className="text-[13px] uppercase" style={wordStyle(true)}>WELCOME</span>
          <span className="text-[8px] uppercase" style={wordStyle(false)}>to the show</span>
        </div>
      ) : (
        <span className="text-[9px] uppercase leading-relaxed text-center px-3">
          <span style={wordStyle(false)}>this is how </span>
          <span style={wordStyle(true)}>your captions</span>
          <span style={wordStyle(false)}> will look</span>
        </span>
      )}
    </div>
  );
}
