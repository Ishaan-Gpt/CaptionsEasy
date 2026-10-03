import React from "react";
import { C, mono, sans } from "../theme";

/** Studio surfaces in the product's light theme: cream panels, beige hairlines, obsidian type. */
export const Panel: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; title?: string; right?: React.ReactNode }> = ({ children, style, title, right }) => (
  <div
    style={{
      background: C.cream,
      border: `1.5px solid ${C.beige}`,
      borderRadius: 28,
      boxShadow: "0 40px 80px -30px rgba(26,26,26,0.28), 0 6px 18px rgba(26,26,26,0.06)",
      fontFamily: sans,
      color: C.ink,
      overflow: "hidden",
      position: "relative",
      ...style,
    }}
  >
    {title ? (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px", borderBottom: `1.5px solid ${C.beige}` }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>{title}</div>
        {right}
      </div>
    ) : null}
    {children}
  </div>
);

/** A word chip from the captions list: lavender when selected, orange when it's being spoken. */
export const WordChip: React.FC<{ text: string; state?: "idle" | "spoken" | "selected" | "editing" | "low"; size?: number; caret?: boolean }> = ({ text, state = "idle", size = 30, caret }) => {
  const bg = state === "spoken" ? C.orange : state === "selected" || state === "editing" ? C.lavender : "rgba(228,228,208,0.55)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${size * 0.22}px ${size * 0.42}px`,
        borderRadius: size * 0.4,
        background: bg,
        fontFamily: sans,
        fontWeight: 700,
        fontSize: size,
        color: C.ink,
        border: state === "editing" ? `2px solid ${C.ink}` : "2px solid transparent",
        textDecoration: state === "low" ? `underline wavy ${C.orange}` : undefined,
        textUnderlineOffset: 6,
        whiteSpace: "nowrap",
      }}
    >
      {text}
      {caret ? <span style={{ display: "inline-block", width: 3, height: size * 1.05, background: C.ink, marginLeft: 2 }} /> : null}
    </span>
  );
};

export const Cursor: React.FC<{ x: number; y: number; press?: number; style?: React.CSSProperties }> = ({ x, y, press = 0, style }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(26,26,26,0.35))", zIndex: 50, ...style }}>
    <svg width="52" height="60" viewBox="0 0 26 30">
      <path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12 17 L20 17 Z" fill={C.ink} stroke={C.cream} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
    {press > 0 ? <div style={{ position: "absolute", left: -18, top: -18, width: 40, height: 40, borderRadius: 999, border: `3px solid ${C.orange}`, opacity: 1 - press, transform: `scale(${0.6 + press * 1.4})` }} /> : null}
  </div>
);

export const Swatch: React.FC<{ color: string; selected?: boolean; size?: number }> = ({ color, selected, size = 56 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: color, boxShadow: selected ? `0 0 0 4px ${C.cream}, 0 0 0 7px ${C.ink}` : `inset 0 0 0 2px rgba(26,26,26,0.12)` }} />
);

export const Slider: React.FC<{ value: number; width?: number; label?: string }> = ({ value, width = 420, label }) => (
  <div style={{ fontFamily: sans }}>
    {label ? (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
        <span>{label}</span>
        <span style={{ fontFamily: mono, color: C.muted, fontSize: 22 }}>{Math.round(40 + value * 80)}</span>
      </div>
    ) : null}
    <div style={{ position: "relative", width, height: 10, borderRadius: 10, background: C.beige }}>
      <div style={{ width: `${value * 100}%`, height: "100%", borderRadius: 10, background: C.ink }} />
      <div style={{ position: "absolute", left: `${value * 100}%`, top: "50%", width: 36, height: 36, borderRadius: 36, background: C.cream, border: `3px solid ${C.ink}`, transform: "translate(-50%,-50%)", boxShadow: "0 4px 10px rgba(26,26,26,0.2)" }} />
    </div>
  </div>
);

/** The upload / render bar in the site's orange→emerald gradient. */
export const Progress: React.FC<{ value: number; width?: number; height?: number }> = ({ value, width = 720, height = 14 }) => (
  <div style={{ width, height, borderRadius: height, background: C.beige, overflow: "hidden" }}>
    <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", borderRadius: height, background: `linear-gradient(90deg, ${C.orange}, ${C.emerald})` }} />
  </div>
);
