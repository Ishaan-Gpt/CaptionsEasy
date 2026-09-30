import type React from "react";
import { Easing, interpolate, spring } from "remotion";
import type { CaptionStyleV2, Emotion } from "@capseasy/shared";
import { withAlpha } from "@motion-ai/caption-engine/core";

export const SPRINGS = {
  snappy: { damping: 14, stiffness: 220, mass: 0.5 },
  bouncy: { damping: 9, stiffness: 180, mass: 0.5 },
  smooth: { damping: 26, stiffness: 120, mass: 0.6 },
  punch: { damping: 11, stiffness: 240, mass: 0.5 },
} as const;

const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

export function easeFn(id: CaptionStyleV2["entrance"]["easing"]): (t: number) => number {
  switch (id) {
    case "linear": return (t) => t;
    case "outQuad": return Easing.out(Easing.quad);
    case "outCubic": return Easing.out(Easing.cubic);
    case "inOutCubic": return Easing.inOut(Easing.cubic);
    case "spring":
    case "outExpo":
    default: return EASE_OUT_EXPO;
  }
}

/** One-shot spring keyed to an absolute start time in ms. fps comes from the composition, never a constant. */
export function springMs(timeMs: number, startMs: number, fps: number, cfg: { damping: number; stiffness: number; mass?: number } = SPRINGS.snappy): number {
  const frame = Math.max(0, ((timeMs - startMs) / 1000) * fps);
  return spring({ frame, fps, config: cfg });
}

export function progress(localMs: number, durationMs: number, easing: (t: number) => number = EASE_OUT_EXPO): number {
  if (durationMs <= 0) return 1;
  return interpolate(localMs, [0, durationMs], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Emotion changes how strongly things move; templates may layer more on top (P8). */
const EMOTION_INTENSITY: Record<Emotion, number> = {
  neutral: 1, excited: 1.3, funny: 1.2, serious: 0.7, sad: 0.6, angry: 1.4, surprised: 1.35, question: 1, hype: 1.5, calm: 0.6,
};

export function effectiveIntensity(style: CaptionStyleV2, emotion: Emotion): number {
  const mult = 1 + (EMOTION_INTENSITY[emotion] - 1) * style.emotionReactivity;
  return style.motionIntensity * mult;
}

/** Whole-card entrance. `localMs` = ms since the page started. */
export function entranceStyle(style: CaptionStyleV2, localMs: number, fps: number, intensity: number, settled?: boolean): React.CSSProperties {
  const e = style.entrance;
  if (settled || e.type === "none") return {};
  const p = progress(localMs, e.durationMs, easeFn(e.easing));
  const k = intensity;
  switch (e.type) {
    case "fade": return { opacity: p };
    case "drop": return { opacity: p, transform: `translateY(${(p - 1) * 34 * k}px)` };
    case "zoom": return { opacity: p, transform: `scale(${1 + (1 - p) * 0.35 * k})` };
    case "slide-left": return { opacity: p, transform: `translateX(${(1 - p) * -60 * k}px)` };
    case "slide-right": return { opacity: p, transform: `translateX(${(1 - p) * 60 * k}px)` };
    case "blur-in": return { opacity: p, filter: `blur(${(1 - p) * 14 * k}px)` };
    case "flip": return { opacity: p, transform: `perspective(600px) rotateX(${(1 - p) * 70 * k}deg)` };
    case "mask-reveal": return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, opacity: Math.min(1, p * 4) };
    case "pop": {
      const s = springMs(localMs, 0, fps, { damping: 13, stiffness: 240, mass: 0.5 });
      return { opacity: Math.min(1, p * 2), transform: `scale(${1 - 0.08 * k + s * 0.08 * k})` };
    }
    case "elastic": {
      const s = springMs(localMs, 0, fps, SPRINGS.bouncy);
      return { opacity: Math.min(1, p * 3), transform: `scale(${0.6 + s * 0.4})` };
    }
    case "glitch": {
      // RGB-split jitter that settles (deterministic: derived from the frame number, never Math.random)
      const f = Math.floor((localMs / 1000) * fps);
      const j = (1 - p) * 8 * k;
      const dx = ((f * 7919) % 5) - 2;
      return { opacity: Math.min(1, p * 3), transform: `translateX(${dx * j * 0.6}px)`, filter: j > 0.4 ? `drop-shadow(${j}px 0 rgba(255,0,80,0.85)) drop-shadow(${-j}px 0 rgba(0,240,255,0.85))` : undefined };
    }
    case "wave":
    case "rise":
    default: return { opacity: p, transform: `translateY(${(1 - p) * 16 * k}px)` };
  }
}

/** Per-item delay for staggered entrances: words ~70 ms apart, letters ~28 ms apart (scaled by entrance speed). */
export function staggerDelayMs(style: CaptionStyleV2, index: number, unit: "word" | "char"): number {
  const base = unit === "word" ? 70 : 28;
  return index * base * Math.max(0.4, style.entrance.durationMs / 220);
}

/** Which unit a layout should stagger by ("wave" always animates letter by letter). */
export function staggerUnit(style: CaptionStyleV2): "none" | "word" | "char" {
  if (style.entrance.type === "none") return "none";
  if (style.entrance.type === "wave") return "char";
  return style.entrance.stagger;
}

export function exitStyle(style: CaptionStyleV2, msUntilEnd: number, settled?: boolean): React.CSSProperties {
  const x = style.exit;
  if (settled || x.type === "none" || x.durationMs <= 0 || msUntilEnd >= x.durationMs) return {};
  const p = 1 - Math.max(0, msUntilEnd) / x.durationMs; // 0 -> 1 as the card ends
  switch (x.type) {
    case "fade": return { opacity: 1 - p };
    case "fall": return { opacity: 1 - p, transform: `translateY(${p * 40}px)` };
    case "zoom-out": return { opacity: 1 - p, transform: `scale(${1 - p * 0.2})` };
    case "blur-out": return { opacity: 1 - p, filter: `blur(${p * 12}px)` };
    case "slide-up": return { opacity: 1 - p, transform: `translateY(${-p * 40}px)` };
    default: return {};
  }
}

/** Progressive per-word reveal used by "progressive" reveal mode (legacy behaviour). */
export const wordReveal = (timeMs: number, startMs: number) => progress(timeMs - startMs, 130);

export interface ActiveResult {
  css: React.CSSProperties;
  /** absolutely-positioned decoration rendered behind the word */
  behind?: { css: React.CSSProperties };
  /** thin bar under the word (underline/marker) */
  bar?: { css: React.CSSProperties };
}

/** The word currently being spoken. Pure function of time. */
export function activeEffect(
  style: CaptionStyleV2, word: { startMs: number; endMs: number }, timeMs: number, fps: number, sc: number, intensity: number, settled?: boolean,
): ActiveResult {
  const a = style.active;
  const color = a.color;
  const sp = settled ? 1 : springMs(timeMs, word.startMs, fps, SPRINGS.snappy);
  const dur = Math.max(1, word.endMs - word.startMs);
  const t = Math.min(1, Math.max(0, (timeMs - word.startMs) / dur));
  switch (a.effect) {
    case "none": return { css: {} };
    case "color": return { css: { color, WebkitTextFillColor: color, backgroundImage: "none" } };
    case "pop": return { css: { color, WebkitTextFillColor: color, backgroundImage: "none", transform: `scale(${1 + (a.scale - 1) * sp * intensity})` } };
    case "scale-up": return { css: { transform: `scale(${1 + (a.scale - 1) * sp * intensity})` } };
    case "bounce": return { css: { color, WebkitTextFillColor: color, transform: `translateY(${-Math.sin(Math.PI * Math.min(1, ((timeMs - word.startMs) / 260))) * 14 * sc * intensity}px)` } };
    case "shake": {
      const k = settled ? 0 : Math.sin(((timeMs - word.startMs) / 1000) * 60) * 3 * sc * intensity;
      return { css: { color, WebkitTextFillColor: color, transform: `translateX(${k}px)` } };
    }
    case "glow": return { css: { color, WebkitTextFillColor: color, textShadow: `0 0 ${(12 + sp * 10) * sc}px ${color}, 0 0 ${(24 + sp * 16) * sc}px ${withAlpha(color, 0.6)}` } };
    case "underline": {
      const w = settled ? 100 : progress(timeMs - word.startMs, 180) * 100;
      return { css: { color, WebkitTextFillColor: color }, bar: { css: { left: 0, bottom: "-0.08em", height: "0.09em", width: `${w}%`, backgroundColor: color, borderRadius: 4 } } };
    }
    case "marker": {
      const w = settled ? 100 : progress(timeMs - word.startMs, 200) * 100;
      return { css: {}, behind: { css: { left: "-0.12em", top: "12%", height: "78%", width: `calc(${w}% + 0.24em)`, backgroundColor: withAlpha(color, 0.85), borderRadius: "0.12em", zIndex: -1 } } };
    }
    case "box": return { css: { transform: `scale(${1 + (a.scale - 1) * sp})` }, behind: { css: { left: "-0.22em", right: "-0.22em", top: "6%", bottom: "2%", backgroundColor: a.boxColor ?? color, borderRadius: a.boxRadius * sc, zIndex: -1 } } };
    case "fill-sweep": {
      const p = settled ? 100 : t * 100;
      return { css: { backgroundImage: `linear-gradient(90deg, ${color} ${p}%, currentColor ${p}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } };
    }
    case "outline-fill": return { css: { color, WebkitTextFillColor: color } };
    default: return { css: {} };
  }
}
