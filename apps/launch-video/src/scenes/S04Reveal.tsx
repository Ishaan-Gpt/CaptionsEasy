import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { Lockup } from "../components/Lockup";
import { Words } from "../components/Type";
import { C, sans } from "../theme";
import { EXPO_IN, EXPO_OUT, map } from "../lib/motion";

/** 0:12 — The drop. Out of the white-out: "Introducing", the 3D icon rises, the wordmark, the promise. */
export const S04Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const intro = map(f, [14, 44], [0, 1], EXPO_OUT);
  const out = map(f, [326, 358], [0, 1], EXPO_IN);
  const push = 1 + map(f, [0, 326], [0, 0.05]) + out * 0.5;
  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ transform: `scale(${push})`, filter: out > 0.02 ? `blur(${out * 24}px)` : undefined, opacity: 1 - out * 0.9 }}>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 210 }}>
          <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 30, letterSpacing: "0.42em", textTransform: "uppercase", color: C.muted, opacity: intro * map(f, [96, 120], [1, 0]), transform: `translateY(${(1 - intro) * 20}px)` }}>
            Introducing
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 60 }}>
          <Lockup at={40} iconSize={340} settleAt={96} />
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230 }}>
          <Words
            size={78}
            words={[
              { t: "Don’t", at: 196 },
              { t: "edit,", at: 204 },
              { t: "just", at: 216, accent: "gradient" },
              { t: "upload.", at: 222, accent: "gradient" },
            ]}
          />
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.12} />
      {/* the white-out from the grind resolves here */}
      <AbsoluteFill style={{ background: C.cream, opacity: map(f, [0, 22], [1, 0], EXPO_OUT) }} />
    </AbsoluteFill>
  );
};
