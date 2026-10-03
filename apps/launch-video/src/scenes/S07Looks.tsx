import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { ClipAt, Phone } from "../components/Phone";
import { LookCaptions, lookStyle } from "../components/LookCaptions";
import { Pill, Words } from "../components/Type";
import { clip } from "../footage";
import { C, sans, serif } from "../theme";
import { EXPO_IN_OUT, EXPO_OUT, lerp, map } from "../lib/motion";
import { LOOK_SWITCHES, RING_AT, SCENES } from "../timeline";
import { PHONE_SIZE } from "./S06Words";

const OMAR = clip("omar_line");
const FROM = SCENES.looks.from;
const CLIP_OFFSET = SCENES.looks.from - SCENES.words.from; // Omar keeps talking across the cut
const B = RING_AT - FROM;
const RING_LOOKS = ["hormozi_box", "beast_bounce", "staggered_splash", "comic_burst", "karaoke_fill", "glow_stack_classic", "kinetic_mix", "neon_sign", "vintage_cinematic", "retro_3d", "highlighter_card", "gradient_pop"];

/**
 * 0:26 — "Pick a look." Same words, same timing, the look changes on the beat and keeps speeding up while the
 * camera circles the phone; then we pull back into a ring of phones, every one a different viral look.
 */
export const S07Looks: React.FC = () => {
  const f = useCurrentFrame();
  const abs = FROM + f;
  const clipFrame = CLIP_OFFSET + f;
  const tMs = (clipFrame / 60) * 1000;
  const sw = [...LOOK_SWITCHES].reverse().find((s) => s.at <= abs) ?? LOOK_SWITCHES[0]!;
  const swIdx = LOOK_SWITCHES.indexOf(sw);
  const sinceSwitch = abs - sw.at;
  const bump = swIdx > 0 ? map(sinceSwitch, [0, 8], [1, 0], EXPO_OUT) : 0;

  const ringAt = RING_AT - FROM;
  const pull = map(f, [ringAt - 6, ringAt + 60], [0, 1], EXPO_IN_OUT);
  // orbit speeds up with the switches
  const orbitAngle = Math.sin(f / lerp(34, 14, map(f, [0, ringAt], [0, 1]))) * lerp(10, 22, map(f, [0, ringAt], [0, 1]));
  const name = lookStyle(sw.look).name;

  return (
    <AbsoluteFill>
      <CreamSky drift={1.5} />
      {/* the look's name, huge, behind the phone */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: (1 - pull) * map(f, [24, 40], [0, 1]) }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 300, color: "rgba(26,26,26,0.07)", whiteSpace: "nowrap", transform: `scale(${1 + bump * 0.05})`, letterSpacing: "-0.03em" }}>{name}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "100px 0 0 150px", opacity: 1 - map(f, [ringAt - 30, ringAt], [0, 1]) }}>
        <Words align="left" size={92} words={[{ t: "Pick", at: 6 }, { t: "a", at: 12 }, { t: "look.", at: 18, accent: true, color: C.forest }]} />
        <div style={{ marginTop: 28, fontFamily: sans, fontSize: 30, color: C.muted, opacity: map(f, [40, 60], [0, 1]) }}>Same words. Same timing. New style.</div>
      </AbsoluteFill>

      {/* hero phone */}
      <AbsoluteFill style={{ perspective: 2200, opacity: 1 - map(f, [ringAt + 20, ringAt + 50], [0, 1]) }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translateZ(${-pull * 1400}px) rotateY(${orbitAngle * (1 - pull)}deg) scale(${1 + bump * 0.035})` }}>
          <Phone height={880}>
            <ClipAt src={OMAR.src} timeSec={clipFrame / 60} />
            <LookCaptions key={sw.look} lookId={sw.look} words={OMAR.words} timeMs={tMs} sizeMul={PHONE_SIZE} />
            {/* flash on each switch */}
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: bump * 0.22 }} />
          </Phone>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, ${430 + bump * 8}px)` }}>
            <Pill dark size={28} style={{ boxShadow: "0 12px 30px -10px rgba(26,26,26,0.5)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 12, background: C.orange, display: "inline-block" }} />
              {name}
            </Pill>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* the ring */}
      {f >= ringAt - 6 ? <Ring f={f - ringAt} tMs={tMs} clipFrame={clipFrame} /> : null}
      <Grain opacity={0.05} vignette={0.16} />
    </AbsoluteFill>
  );
};

const Ring: React.FC<{ f: number; tMs: number; clipFrame: number }> = ({ f, tMs, clipFrame }) => {
  const n = RING_LOOKS.length;
  const R = 980;
  const appear = map(f, [-6, 40], [0, 1], EXPO_OUT);
  const spin = lerp(-40, 0, appear) + f * 0.32;
  const tilt = lerp(30, 15, appear);
  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 50%" }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 200 }}>
        <div style={{ transformStyle: "preserve-3d", transform: `translateZ(${lerp(-4200, -3000, appear)}px) rotateX(${-tilt}deg) rotateY(${spin}deg)`, opacity: appear }}>
          {RING_LOOKS.map((look, i) => {
            const a = (360 / n) * i;
            return (
              <div key={look} style={{ position: "absolute", left: -180, top: -320, transform: `rotateY(${a}deg) translateZ(${R}px)`, backfaceVisibility: "hidden" }}>
                <Phone height={640} shadow={false}>
                  <ClipAt src={OMAR.src} timeSec={clipFrame / 60} />
                  <LookCaptions lookId={look} words={OMAR.words} timeMs={tMs} sizeMul={1.8} />
                </Phone>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
        <Words size={110} words={[{ t: "20+", at: B + 22 }, { t: "viral", at: B + 30, accent: true, color: C.orange }, { t: "looks.", at: B + 36, accent: true, color: C.orange }]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
