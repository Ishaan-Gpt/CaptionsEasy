import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FeedField } from "../three/FeedField";
import { FEED_RAW, clip } from "../footage";
import { Grain } from "../components/Backdrop";
import { Stamp, Words } from "../components/Type";
import { C } from "../theme";
import { EXPO_IN_OUT, lerp, map, speedRamp, SMOOTH } from "../lib/motion";
import { CUES } from "../timeline";

const HERO = clip("jerry_mute");
const CLIPS = [{ src: HERO.src, poster: HERO.poster, durationSec: HERO.durationSec }, ...FEED_RAW];
const LAND = 9; // card pitches travelled before the camera lands on the hero card

/**
 * 0:00 — The feed. A wall of talking heads scrolls past at full speed; nobody is captioned. The scroll
 * speed-ramps down until one silent video is left in front of us.
 */
export const S01Feed: React.FC = () => {
  const f = useCurrentFrame();
  // fast flick-scrolling, each swipe a burst, then a long brake into the hero card
  const p = speedRamp(f, [[0, 2.6], [28, 3.4], [40, 1.6], [58, 3.6], [70, 1.6], [88, 3.8], [100, 2.2], [150, 1.1], [205, 0.18], [238, 0.0]]);
  const scroll = p * LAND;

  // camera: a raking low angle that straightens out as we land
  const k = map(f, [96, 236], [0, 1], EXPO_IN_OUT);
  const pos: [number, number, number] = [lerp(-1.6, 0, k), lerp(-2.4, 0, k), lerp(5.6, 3.05, k)];
  const look: [number, number, number] = [lerp(0.6, 0, k), lerp(1.2, 0, k), 0];
  const roll = lerp(-0.16, 0, k) + Math.sin(f / 18) * 0.012 * (1 - k);
  const fov = lerp(42, 38, k);

  return (
    <AbsoluteFill style={{ background: C.night }}>
      <FeedField
        clips={CLIPS}
        cols={11}
        rows={8}
        scroll={scroll}
        colSpeed={[0.9, 1.15, 0.8, 1.25, 0.85, 1, 0.9, 1.2, 0.8, 1.1, 0.95]}
        camera={{ pos, look, roll, fov }}
        fog={C.night}
        fogNear={3.5}
        fogFar={13}
        dim={0.62}
        hero={{ col: 5, clip: 0, landAt: LAND }}
      />
      {/* speed streaks while flicking */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(13,13,12,0.9) 0%, rgba(13,13,12,0) 22%, rgba(13,13,12,0) 78%, rgba(13,13,12,0.9) 100%)", opacity: map(f, [150, 230], [1, 0.25]) }} />

      {/* "Swipe." on every flick */}
      {CUES.swipes.slice(0, 3).map((at, i) => (
        <AbsoluteFill key={at} style={{ justifyContent: "center", alignItems: i === 1 ? "flex-end" : i === 0 ? "flex-start" : "center", padding: "0 220px" }}>
          <div style={{ transform: `translateY(${[-180, 120, -40][i]}px)` }}>
            <Stamp text="Swipe." at={at} size={150} color={C.cream} out={at + 18} rotate={[-4, 3, 0][i]} />
          </div>
        </AbsoluteFill>
      ))}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
        <Words
          size={92}
          color={C.cream}
          out={226}
          outDur={10}
          words={[
            { t: "You", at: 128 },
            { t: "get", at: 136 },
            { t: "one", at: 146, accent: true, color: C.orange },
            { t: "second.", at: 154, accent: true, color: C.orange },
          ]}
        />
      </AbsoluteFill>
      <Grain opacity={0.09} vignette={0.55} />
      <AbsoluteFill style={{ background: C.night, opacity: map(f, [0, 10], [1, 0], SMOOTH) }} />
    </AbsoluteFill>
  );
};
