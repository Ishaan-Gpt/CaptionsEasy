import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FeedField, type FeedClip } from "../three/FeedField";
import { FOOTAGE } from "../footage";
import { CAP_LOOKS } from "../caplooks";
import { Grain } from "../components/Backdrop";
import { HEART } from "../components/Phone";
import { Words } from "../components/Type";
import { C } from "../theme";
import { EXPO_IN, EXPO_IN_OUT, EXPO_OUT, lerp, map, rand, speedRamp } from "../lib/motion";

const cap = (id: string): FeedClip => ({ src: `footage/cap_${id}.mp4`, poster: `footage/cap_${id}.jpg`, durationSec: FOOTAGE[id]!.durationSec });
const HERO = cap("musuweu_lang");
const CLIPS: FeedClip[] = [HERO, ...Object.keys(CAP_LOOKS).filter((id) => id.startsWith("f_")).map(cap)];
const LAND = 8;
const LAND_AT = 140;

/**
 * 0:40 — The callback. The same feed, now in daylight, and every video is captioned: the scroll speed-ramps to a
 * stop on its own. "Now they stop. They stay. They get every word."
 */
export const S10Callback: React.FC = () => {
  const f = useCurrentFrame();
  const p = speedRamp(f, [[0, 3.6], [60, 3.2], [100, 1.4], [LAND_AT - 10, 0.12], [LAND_AT, 0]]);
  const scroll = p * LAND;
  // mirrored camera from act 1: comes in from the right, rolls level as it lands, then a slow push
  const k = map(f, [20, LAND_AT], [0, 1], EXPO_IN_OUT);
  const push = map(f, [LAND_AT, 330], [0, 1], (t) => t);
  const dive = map(f, [326, 360], [0, 1], EXPO_IN);
  const pos: [number, number, number] = [lerp(1.8, -0.62, k), lerp(-2.2, 0, k), lerp(5.8, 3.3, k) - push * 0.35 - dive * 2.9];
  const look: [number, number, number] = [lerp(-0.6, -0.62, k), lerp(1.1, 0, k), 0];
  const roll = lerp(0.14, 0, k);

  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <FeedField
        clips={CLIPS}
        cols={11}
        rows={8}
        scroll={scroll}
        colSpeed={[1.1, 0.9, 1.2, 0.8, 1.15, 1, 0.85, 1.2, 0.9, 1.05, 0.8]}
        camera={{ pos, look, roll, fov: 38 }}
        fog={C.cream}
        fogNear={4}
        fogFar={14}
        dim={1}
        hero={{ col: 5, clip: 0, landAt: LAND }}
        bezel={C.ink}
        seed={Math.round(3.7 * 60) - LAND_AT}
      />
      {/* hearts rising off the hero card once it has stopped */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {Array.from({ length: 14 }, (_, i) => {
          const at = LAND_AT + 14 + i * 11;
          const t = f - at;
          if (t < 0 || t > 70) return null;
          const x = 1400 + rand(i) * 80 + Math.sin((t + i * 7) / 9) * 18;
          const y = 760 - t * 7;
          const s = map(t, [0, 8], [0.3, 1], EXPO_OUT) * (0.7 + rand(i + 3) * 0.6);
          return (
            <svg key={i} width="60" height="60" viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, transform: `scale(${s})`, opacity: map(t, [40, 70], [1, 0]) }}>
              <path d={HEART} fill={i % 3 === 0 ? C.orange : i % 3 === 1 ? "#FF4D6D" : C.lavender} />
            </svg>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 140, opacity: 1 - dive }}>
        <div style={{ padding: "34px 44px 40px", borderRadius: 36, background: "rgba(255,255,235,0.86)", backdropFilter: "blur(16px)", width: 820, opacity: map(f, [LAND_AT + 4, LAND_AT + 16], [0, 1]), boxShadow: "0 30px 60px -30px rgba(26,26,26,0.3)" }}>
          <Words align="left" size={84} words={[{ t: "Now", at: LAND_AT + 10 }, { t: "they", at: LAND_AT + 16 }, { t: "stop.", at: LAND_AT + 22, accent: true, color: C.orange }]} />
          <Words align="left" size={84} words={[{ t: "They", at: LAND_AT + 60 }, { t: "stay.", at: LAND_AT + 66, accent: true, color: C.forest }]} />
          <Words align="left" size={84} words={[{ t: "They", at: LAND_AT + 110 }, { t: "get", at: LAND_AT + 116 }, { t: "every", at: LAND_AT + 124, accent: "gradient" }, { t: "word.", at: LAND_AT + 130, accent: "gradient" }]} />
        </div>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.12} />
      <AbsoluteFill style={{ background: C.forest, opacity: map(f, [340, 359], [0, 1], EXPO_IN) }} />
    </AbsoluteFill>
  );
};
