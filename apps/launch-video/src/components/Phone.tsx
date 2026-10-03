import React from "react";
import { Freeze, OffthreadVideo, staticFile } from "remotion";
import { C, FPS, sans } from "../theme";

/**
 * A phone in the site's style: obsidian bezel, generous radius. Children are laid out on a 1080×1920 screen
 * (the product's canvas) and scaled to fit, so captions sit exactly where they would on a real Short.
 */
export const Phone: React.FC<{
  height: number;
  children?: React.ReactNode;
  bezel?: string;
  shadow?: boolean;
  glare?: number;
  style?: React.CSSProperties;
}> = ({ height, children, bezel = C.ink, shadow = true, glare = 0.5, style }) => {
  const pad = height * 0.016;
  const screenH = height - pad * 2;
  const screenW = (screenH * 9) / 16;
  const width = screenW + pad * 2;
  const scale = screenW / 1080;
  const r = height * 0.075;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: r,
        background: bezel,
        padding: pad,
        boxSizing: "border-box",
        boxShadow: shadow ? `0 ${height * 0.06}px ${height * 0.12}px -${height * 0.03}px rgba(26,26,26,0.45), 0 ${height * 0.01}px ${height * 0.02}px rgba(26,26,26,0.25), inset 0 0 0 ${Math.max(1, height * 0.0025)}px rgba(255,255,235,0.12)` : undefined,
        position: "relative",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: r - pad, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 1080, height: 1920, transform: `translate(-50%, -50%) scale(${scale})` }}>{children}</div>
        {/* glass glare */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(125deg, rgba(255,255,255,${0.16 * glare}) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,${0.06 * glare}) 100%)`, pointerEvents: "none" }} />
        {/* dynamic island */}
        <div style={{ position: "absolute", top: height * 0.018, left: "50%", width: height * 0.11, height: height * 0.032, borderRadius: 999, background: "#000", transform: "translateX(-50%)" }} />
      </div>
    </div>
  );
};

/** A clip on the 1080×1920 screen, shown at an arbitrary media time (so it can speed-ramp or freeze). */
export const ClipAt: React.FC<{ src: string; timeSec: number; dim?: number; style?: React.CSSProperties }> = ({ src, timeSec, dim = 0, style }) => (
  <div style={{ position: "absolute", inset: 0, ...style }}>
    <Freeze frame={Math.max(0, Math.round(timeSec * FPS))}>
      <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Freeze>
    {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${dim})` }} /> : null}
  </div>
);

const Icon: React.FC<{ d: string; label?: string; filled?: boolean; color?: string }> = ({ d, label, filled = true, color = "#fff" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <svg width="78" height="78" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 2} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}>
      <path d={d} />
    </svg>
    {label ? <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 30, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>{label}</div> : null}
  </div>
);

export const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
const BUBBLE = "M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z";
const SHARE = "M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z";

/** Generic short-video chrome (no platform branding): action rail, handle, progress line. */
export const FeedChrome: React.FC<{ likes?: string; handle?: string; progress?: number; heartColor?: string }> = ({ likes = "12.4K", handle = "@creator", progress = 0.3, heartColor = "#fff" }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.45) 100%)" }} />
    <div style={{ position: "absolute", right: 34, bottom: 300, display: "flex", flexDirection: "column", gap: 44 }}>
      <Icon d={HEART} label={likes} color={heartColor} />
      <Icon d={BUBBLE} label="482" />
      <Icon d={SHARE} label="Share" />
    </div>
    <div style={{ position: "absolute", left: 44, bottom: 150, fontFamily: sans, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
      <div style={{ fontWeight: 800, fontSize: 40 }}>{handle}</div>
      <div style={{ marginTop: 14, width: 560, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.55)" }} />
      <div style={{ marginTop: 12, width: 380, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.4)" }} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, height: 6, background: "rgba(255,255,255,0.25)" }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", background: "#fff" }} />
    </div>
  </div>
);

export const MutedBadge: React.FC<{ scale?: number; opacity?: number }> = ({ scale = 1, opacity = 1 }) => (
  <div style={{ position: "absolute", left: "50%", top: "44%", transform: `translate(-50%,-50%) scale(${scale})`, opacity, width: 220, height: 220, borderRadius: 999, background: "rgba(13,13,12,0.55)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center" }}>
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill={C.cream} />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  </div>
);
