import React from "react";
import { useCurrentFrame } from "remotion";
import { BRAND_GRADIENT, C, mono, sans, serif } from "../theme";
import { EXPO_IN, EXPO_OUT, map } from "../lib/motion";

export type Word = { t: string; at: number; accent?: boolean | "gradient"; color?: string };

/**
 * Kinetic headline: each word rises out of a blur on its own frame, sans with Instrument Serif italic accents
 * (the site's type system). `out` blurs the whole line away.
 */
export const Words: React.FC<{
  words: Word[];
  size: number;
  color?: string;
  out?: number;
  outDur?: number;
  align?: "center" | "left";
  rise?: number;
  dur?: number;
  style?: React.CSSProperties;
  tracking?: number;
  weight?: number;
}> = ({ words, size, color = C.ink, out, outDur = 12, align = "center", rise = 0.5, dur = 16, style, tracking = -0.045, weight = 700 }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : map(frame, [out, out + outDur], [0, 1], EXPO_IN);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        columnGap: size * 0.24,
        rowGap: size * 0.02,
        fontFamily: sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: `${tracking}em`,
        color,
        opacity: 1 - o,
        filter: o > 0 ? `blur(${o * 18}px)` : undefined,
        transform: o > 0 ? `translateY(${-o * size * 0.25}px)` : undefined,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = map(frame, [w.at, w.at + dur], [0, 1], EXPO_OUT);
        const accent = w.accent;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: map(p, [0, 0.35], [0, 1]),
              transform: `translateY(${(1 - p) * size * rise}px) scale(${1 + (1 - p) * 0.08})`,
              filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined,
              ...(accent
                ? {
                    fontFamily: serif,
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: size * 1.12,
                    letterSpacing: "-0.025em",
                    paddingRight: size * 0.04,
                    ...(accent === "gradient"
                      ? { backgroundImage: BRAND_GRADIENT, backgroundSize: "200% auto", backgroundPosition: `${(frame * 0.6) % 200}% 50%`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }
                      : { color: w.color ?? color }),
                  }
                : w.color
                  ? { color: w.color }
                  : {}),
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** A single huge word punched in with overshoot (impact frames). */
export const Stamp: React.FC<{ text: string; at: number; size: number; color?: string; italic?: boolean; out?: number; rotate?: number }> = ({ text, at, size, color = C.ink, italic, out, rotate = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return <div style={{ fontFamily: italic ? serif : sans, fontStyle: italic ? "italic" : "normal", fontWeight: italic ? 400 : 800, fontSize: size, letterSpacing: italic ? "-0.02em" : "-0.05em", lineHeight: 1, opacity: 0, whiteSpace: "nowrap" }}>{text}</div>;
  const s = t < 4 ? map(t, [0, 4], [1.6, 0.94]) : map(t, [4, 10], [0.94, 1], EXPO_OUT);
  const o = out === undefined ? 0 : map(frame, [out, out + 8], [0, 1], EXPO_IN);
  return (
    <div
      style={{
        fontFamily: italic ? serif : sans,
        fontStyle: italic ? "italic" : "normal",
        fontWeight: italic ? 400 : 800,
        fontSize: size,
        letterSpacing: italic ? "-0.02em" : "-0.05em",
        lineHeight: 1,
        color,
        transform: `scale(${s * (1 + o * 0.3)}) rotate(${rotate}deg)`,
        opacity: map(t, [0, 2], [0, 1]) * (1 - o),
        filter: t < 3 ? `blur(${(3 - t) * 4}px)` : o > 0 ? `blur(${o * 20}px)` : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** Mono label in the site's "remotion render · 1080×1920" style. */
export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 22, color = C.muted, style }) => (
  <span style={{ fontFamily: mono, fontSize: size, color, letterSpacing: "0.02em", ...style }}>{children}</span>
);

/** Lavender pill (the site's primary button / chip). */
export const Pill: React.FC<{ children: React.ReactNode; dark?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, dark, size = 26, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.4,
      padding: `${size * 0.55}px ${size * 1.05}px`,
      borderRadius: 999,
      border: `1.5px solid ${dark ? C.ink : "rgba(26,26,26,0.3)"}`,
      background: dark ? C.ink : C.lavender,
      color: dark ? C.cream : C.ink,
      fontFamily: sans,
      fontWeight: 700,
      fontSize: size,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);
