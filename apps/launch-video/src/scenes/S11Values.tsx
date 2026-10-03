import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ForestSky, Grain } from "../components/Backdrop";
import { LookCaptions, lookStyle, timedPhrase } from "../components/LookCaptions";
import { C, mono } from "../theme";
import { EXPO_IN, EXPO_OUT, map } from "../lib/motion";

/** The promises, each one set in a different viral look by the real engine, one per beat-pair. */
const LINES: { text: string; look: string; at: number }[] = [
  { text: "No install.", look: "hormozi_box", at: 0 },
  { text: "No watermark.", look: "beast_bounce", at: 60 },
  { text: "Every word editable.", look: "karaoke_fill", at: 120 },
  { text: "Free to start.", look: "comic_burst", at: 180 },
];
const CENTER = { position: { x: 0.5, y: 0.47 }, maxWidth: 0.86 };
const WIDE = { width: 1920, height: 1080, fps: 60 };

/** 0:46 — Value slam on deep emerald. */
export const S11Values: React.FC = () => {
  const f = useCurrentFrame();
  const cur = [...LINES].reverse().find((l) => f >= l.at) ?? LINES[0]!;
  const t = f - cur.at;
  const n = cur.text.split(" ").length;
  const words = timedPhrase(cur.text, 40, Math.min(330, 760 / n));
  const punch = map(t, [0, 10], [1.1, 1], EXPO_OUT);
  const flash = map(t, [0, 6], [0.35, 0]);
  const out = map(f, [226, 240], [0, 1], EXPO_IN);
  return (
    <AbsoluteFill>
      <ForestSky />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${punch * (1 + out * 0.3)})`, opacity: 1 - out, filter: out > 0.05 ? `blur(${out * 20}px)` : undefined }}>
        <div style={{ position: "relative", width: 1920, height: 1080, flexShrink: 0 }}>
          <LookCaptions key={cur.look} lookId={cur.look} words={words} timeMs={(t / 60) * 1000 + 40} sizeMul={2.1} override={CENTER} wordsPerCard={3} canvas={WIDE} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90, opacity: map(t, [6, 16], [0, 1]) * (1 - out) }}>
        <div style={{ fontFamily: mono, fontSize: 24, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,235,0.55)" }}>look · {lookStyle(cur.look).name}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.cream, opacity: flash }} />
      <Grain opacity={0.08} vignette={0.4} />
      <AbsoluteFill style={{ background: C.cream, opacity: map(f, [228, 240], [0, 1], EXPO_IN) }} />
    </AbsoluteFill>
  );
};
