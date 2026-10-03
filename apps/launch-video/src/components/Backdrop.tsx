import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** The landing page's cream sky: lavender and orange glows drifting slowly. */
export const CreamSky: React.FC<{ drift?: number }> = ({ drift = 1 }) => {
  const f = useCurrentFrame() * drift;
  const a = Math.sin(f / 140) * 60;
  const b = Math.cos(f / 170) * 50;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 640px at ${18 + a / 40}% ${22 + b / 50}%, ${C.lavender} 0%, rgba(240,215,255,0) 70%)`, opacity: 0.95 }} />
      <AbsoluteFill style={{ background: `radial-gradient(820px 620px at ${86 - a / 50}% ${70 - b / 40}%, rgba(255,169,70,0.42) 0%, rgba(255,169,70,0) 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(700px 520px at ${60 + b / 60}% ${10 + a / 60}%, rgba(52,211,153,0.16) 0%, rgba(52,211,153,0) 70%)` }} />
    </AbsoluteFill>
  );
};

/** Night version: obsidian with ember and emerald light. */
export const NightSky: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const f = useCurrentFrame();
  const a = Math.sin(f / 120) * 8;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1400px 900px at 50% 55%, #1d1c19 0%, ${C.night} 70%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(760px 520px at ${22 + a}% 78%, rgba(255,169,70,${0.16 * glow}) 0%, rgba(255,169,70,0) 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(760px 520px at ${80 - a}% 20%, rgba(52,211,153,${0.11 * glow}) 0%, rgba(52,211,153,0) 70%)` }} />
    </AbsoluteFill>
  );
};

export const ForestSky: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.sin(f / 90) * 10;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1300px 900px at 50% 50%, #145240 0%, ${C.forest} 55%, #082219 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(700px 500px at ${30 + a}% 30%, rgba(52,211,153,0.22) 0%, rgba(52,211,153,0) 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(700px 500px at ${72 - a}% 80%, rgba(255,169,70,0.18) 0%, rgba(255,169,70,0) 70%)` }} />
    </AbsoluteFill>
  );
};

/** Moving film grain + soft vignette over everything, so flat colour never looks "digital". */
export const Grain: React.FC<{ opacity?: number; vignette?: number }> = ({ opacity = 0.07, vignette = 0.35 }) => {
  const f = useCurrentFrame();
  // a new grain offset every 2 frames (30 fps grain reads as film, 60 fps grain reads as noise)
  const k = Math.floor(f / 2);
  const x = (k * 137) % 256;
  const y = (k * 71) % 256;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${GRAIN})`,
          backgroundSize: "256px 256px",
          backgroundPosition: `${x}px ${y}px`,
          opacity,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

// 256×256 monochrome noise, generated once at load (deterministic)
const GRAIN = (() => {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = 128 + ((s >> 16) % 128) - 64;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
})();
