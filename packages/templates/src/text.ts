import type React from "react";
import type { CaptionStyleV2, Word } from "@capseasy/shared";
import { applyCasing, withAlpha } from "@motion-ai/caption-engine/core";
import type { Canvas } from "./types";

/** px per reference px: styles are authored at 1080 short edge */
export const scaleOf = (c: Canvas) => Math.min(c.width, c.height) / 1080;

export const famCss = (fontId: string) => `'${fontId}', system-ui, sans-serif`;

/** Captions never show sentence punctuation (legacy behaviour); apostrophes/hyphens stay. */
export function stripPunctuation(text: string): string {
  return text.replace(/[.,!?;:"“”‘’`…()[\]{}]/g, "").replace(/\s+/g, " ").trim();
}

export function displayText(w: Word, style: CaptionStyleV2, casing: CaptionStyleV2["casing"] = style.casing): string {
  const keep = style.templateOptions.keepPunctuation === true;
  return applyCasing(keep ? w.text.trim() : stripPunctuation(w.text), casing);
}

export function fillCss(fill: CaptionStyleV2["fill"]): React.CSSProperties {
  if (fill.type === "solid") return { color: fill.color };
  const stops = fill.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(", ");
  return {
    backgroundImage: `linear-gradient(${fill.angle}deg, ${stops})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties;
}

export function firstColor(fill: CaptionStyleV2["fill"]): string {
  return fill.type === "solid" ? fill.color : fill.stops[0]!.color;
}

export function strokeCss(stroke: { enabled: boolean; width: number; color: string }, sc: number): React.CSSProperties {
  if (!stroke.enabled || stroke.width <= 0) return { WebkitTextStroke: "0px transparent" } as React.CSSProperties;
  return { WebkitTextStroke: `${stroke.width * sc}px ${stroke.color}`, paintOrder: "stroke fill" } as React.CSSProperties;
}

export function shadowCss(style: CaptionStyleV2, sc: number, extra: string[] = []): string | undefined {
  const layers = style.shadows.map((s) => `${s.x * sc}px ${s.y * sc}px ${s.blur * sc}px ${s.color}`);
  if (style.glow.enabled) {
    const r = style.glow.radius * sc;
    layers.push(`0 0 ${r}px ${withAlpha(style.glow.color, style.glow.intensity)}`);
    layers.push(`0 0 ${r * 2}px ${withAlpha(style.glow.color, style.glow.intensity * 0.6)}`);
  }
  layers.push(...extra);
  return layers.length ? layers.join(", ") : "none";
}

/** Base typography shared by every layout. */
export function baseTextCss(style: CaptionStyleV2, sc: number, sizePx: number): React.CSSProperties {
  return {
    fontFamily: famCss(style.fontId),
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontSize: sizePx,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing * sc,
    wordSpacing: style.wordSpacing * sc,
    ...fillCss(style.fill),
    ...strokeCss(style.stroke, sc),
    textShadow: shadowCss(style, sc),
  };
}

export function backgroundCss(style: CaptionStyleV2, sc: number): React.CSSProperties {
  const b = style.background;
  if (b.type === "none" || b.type === "word-box") return {};
  const pad = b.padding * sc;
  const base: React.CSSProperties = {
    backgroundColor: withAlpha(b.color, b.opacity),
    padding: `${pad * 0.6}px ${pad * 1.4}px`,
    borderRadius: b.type === "pill" ? 9999 : b.radius * sc,
    ...(b.blur > 0 ? { backdropFilter: `blur(${b.blur * sc}px)` } : {}),
  };
  if (b.type === "box") base.boxShadow = "0 6px 24px rgba(0,0,0,0.35)";
  return base;
}

/** Where the caption block sits: horizontal span from the safe box, centre from style.position. */
export function layoutBox(style: CaptionStyleV2, canvas: Canvas, positionOverride?: { x: number; y: number } | null) {
  const sb = style.safeBox;
  const spanW = canvas.width * (1 - sb.left - sb.right);
  const width = Math.max(80, Math.min(spanW, canvas.width * style.maxWidth));
  const pos = positionOverride ?? style.position;
  return { width, cx: pos.x * canvas.width, cy: pos.y * canvas.height };
}

export function containerCss(box: { width: number; cx: number; cy: number }, rotation = 0): React.CSSProperties {
  return {
    position: "absolute",
    left: box.cx,
    top: box.cy,
    width: box.width,
    transform: `translate(-50%, -50%)${rotation ? ` rotate(${rotation}deg)` : ""}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };
}
