import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { Lockup } from "../components/Lockup";
import { Words } from "../components/Type";
import { C, mono } from "../theme";
import { EXPO_OUT, map } from "../lib/motion";

/** 0:50 — End card: the lockup, the one-line promise, nothing else. */
export const S12End: React.FC = () => {
  const f = useCurrentFrame();
  const sub = map(f, [176, 200], [0, 1], EXPO_OUT);
  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120, transform: `scale(${1 + map(f, [0, 300], [0.02, 0])})` }}>
        <Lockup at={6} iconSize={340} settleAt={70} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 250 }}>
        <Words
          size={64}
          weight={600}
          words={[
            { t: "Animated", at: 120 },
            { t: "captions", at: 126 },
            { t: "for", at: 132 },
            { t: "Shorts,", at: 138 },
            { t: "Reels", at: 144 },
            { t: "and", at: 150 },
            { t: "TikToks.", at: 156, accent: "gradient" },
          ]}
        />
        <div style={{ marginTop: 26, fontFamily: mono, fontSize: 26, letterSpacing: "0.08em", color: C.muted, opacity: sub, transform: `translateY(${(1 - sub) * 14}px)` }}>
          free to start · made right in your browser
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 34, opacity: sub * 0.8 }}>
        <div style={{ fontFamily: mono, fontSize: 15, color: C.faint, letterSpacing: "0.04em" }}>Footage: Wikitongues & Wikimedia Commons contributors · CC BY 3.0 / CC BY-SA 4.0</div>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.12} />
      <AbsoluteFill style={{ background: C.cream, opacity: map(f, [0, 14], [1, 0]) }} />
    </AbsoluteFill>
  );
};
