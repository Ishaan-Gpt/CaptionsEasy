import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { LogoIcon3D } from "../three/LogoIcon3D";
import { BRAND_GRADIENT, C, sans, serif } from "../theme";
import { EXPO_IN_OUT, EXPO_OUT, lerp, map, springIn } from "../lib/motion";

/**
 * Icon + wordmark, animated from local frame `at`: the 3D bars rise like an audio meter while the camera
 * orbits round to the front, then the icon steps left and "Captions Easy" wipes in beside it.
 */
export const Lockup: React.FC<{ at: number; iconSize?: number; scale?: number; settleAt?: number; wordAt?: number; meter?: boolean }> = ({ at, iconSize = 300, scale = 1, settleAt, wordAt, meter = true }) => {
  const f = useCurrentFrame() - at;
  const { fps } = useVideoConfig();
  const rise: [number, number, number] = [0, 1, 2].map((i) => springIn(f, fps, i * 9, { damping: 11, stiffness: 150 })) as [number, number, number];
  const orbit = map(f, [0, 110], [0, 1], EXPO_OUT);
  const rotY = lerp(-1.25, 0, orbit) + Math.sin(f / 45) * 0.06 * orbit;
  const rotX = lerp(0.5, 0, orbit) + Math.sin(f / 60) * 0.03;
  // little meter bounce once the bars are up, like the icon is listening
  const bounce: [number, number, number] = meter ? [0, 1, 2].map((i) => Math.max(0, Math.sin((f - 60) / (6 + i * 1.5) + i)) * map(f, [60, 90], [0, 1]) * 0.5) as [number, number, number] : [0, 0, 0];
  const s = settleAt ?? 90;
  const w = wordAt ?? s + 8;
  const settle = map(f, [s, s + 32], [0, 1], EXPO_IN_OUT);
  const word = map(f, [w, w + 34], [0, 1], EXPO_OUT);
  const iconX = lerp(0, -545, settle);
  const iconScale = lerp(1.25, 0.72, settle);
  return (
    <div style={{ position: "relative", width: 1200, height: iconSize * 1.4, transform: `scale(${scale})` }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(calc(-50% + ${iconX}px), -50%) scale(${iconScale})` }}>
        <div style={{ position: "absolute", left: "15%", right: "15%", bottom: "6%", height: "10%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(26,26,26,0.22), rgba(26,26,26,0))", filter: "blur(6px)", opacity: Math.min(1, rise[1] * 1.4) }} />
        <LogoIcon3D size={iconSize} rise={rise} rotX={rotX} rotY={rotY} bounce={bounce} />
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(${lerp(-420, -440, word)}px, -52%)`,
          whiteSpace: "nowrap",
          fontFamily: sans,
          fontWeight: 800,
          fontSize: 168,
          letterSpacing: "-0.055em",
          color: C.ink,
          clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span style={{ transform: `translateX(${(1 - word) * -60}px)`, display: "inline-block" }}>Captions</span>
        <span
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 190,
            letterSpacing: "-0.02em",
            marginLeft: 8,
            paddingRight: 16,
            backgroundImage: BRAND_GRADIENT,
            backgroundSize: "220% auto",
            backgroundPosition: `${lerp(100, 18, word)}% 50%`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transform: `translateX(${(1 - word) * -40}px)`,
            display: "inline-block",
          }}
        >
          Easy
        </span>
      </div>
    </div>
  );
};
