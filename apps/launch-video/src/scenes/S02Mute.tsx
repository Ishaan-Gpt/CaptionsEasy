import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ClipAt, FeedChrome, MutedBadge, Phone } from "../components/Phone";
import { Grain, NightSky } from "../components/Backdrop";
import { Stamp, Words } from "../components/Type";
import { clip } from "../footage";
import { C } from "../theme";
import { EXPO_IN, EXPO_IN_OUT, EXPO_OUT, lerp, map, springIn } from "../lib/motion";

const JERRY = clip("jerry_mute");

/**
 * 0:04 — The silent video. It's talking, but on mute it says nothing; the thumb flicks it away. "Gone."
 * Local frames (scene starts at 0:04).
 */
export const S02Mute: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // dolly: the phone glides right and turns toward the words, then gets flicked off the top
  const slide = map(f, [26, 96], [0, 1], EXPO_IN_OUT);
  const flick = map(f, [172, 196], [0, 1], EXPO_IN);
  const x = lerp(0, 360, slide);
  const y = lerp(0, -1500, flick);
  const rotY = lerp(0, -16, slide) + Math.sin(f / 40) * 1.5;
  const rotX = lerp(0, 4, slide) + flick * 28;
  const rotZ = flick * -6;
  const s = lerp(1, 1.04, map(f, [0, 170], [0, 1]));
  const blur = flick * 26;
  // the thumb comes in from below before the flick
  const thumb = map(f, [150, 172], [0, 1], EXPO_OUT);
  const thumbUp = flick;
  const mute = springIn(f, fps, 34, { damping: 12, stiffness: 200 });

  return (
    <AbsoluteFill>
      <NightSky glow={0.8} />
      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "50% 45%" }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ transform: `translate3d(${x}px, ${y}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${s})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined, transformStyle: "preserve-3d" }}>
            <Phone height={860} glare={0.6}>
              <ClipAt src={JERRY.src} timeSec={4 + f / fps} dim={0.12} />
              <FeedChrome likes="3" handle="@yourchannel" progress={0.1 + f / 900} />
              <MutedBadge scale={mute} opacity={map(f, [34, 40], [0, 1]) * (1 - flick)} />
            </Phone>
          </div>
        </AbsoluteFill>
        {/* thumb */}
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
          <div
            style={{
              width: 200,
              height: 420,
              borderRadius: "100px 100px 60px 60px",
              background: "linear-gradient(180deg, #c99a7a 0%, #a8775a 100%)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 10px 30px rgba(255,255,255,0.15)",
              transform: `translate(${x + 40}px, ${lerp(520, 180, thumb) - thumbUp * 380}px) rotate(${-8 + thumbUp * 6}deg)`,
              opacity: thumb * (1 - map(f, [192, 204], [0, 1])),
              filter: thumbUp > 0.2 ? `blur(${thumbUp * 8}px)` : undefined,
            }}
          >
            <div style={{ margin: "26px auto 0", width: 120, height: 140, borderRadius: "60px 60px 40px 40px", background: "rgba(255,235,220,0.35)" }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* "Most people scroll on mute." */}
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 170, paddingBottom: 40 }}>
        <div style={{ width: 760 }}>
          <Words
            align="left"
            size={104}
            color={C.cream}
            out={140}
            words={[
              { t: "Most", at: 44 },
              { t: "people", at: 50 },
              { t: "scroll", at: 58 },
              { t: "on", at: 70, accent: true, color: C.orange },
              { t: "mute.", at: 76, accent: true, color: C.orange },
            ]}
          />
          <div style={{ marginTop: 34 }}>
            <Words align="left" size={58} color="rgba(255,255,235,0.6)" weight={600} out={140} words={[{ t: "No", at: 104 }, { t: "captions,", at: 110 }, { t: "no", at: 120 }, { t: "story.", at: 126 }]} />
          </div>
        </div>
      </AbsoluteFill>

      {/* "Gone." */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Stamp text="Scrolled." at={192} size={230} color={C.cream} italic out={232} />
      </AbsoluteFill>
      <Grain opacity={0.08} vignette={0.5} />
    </AbsoluteFill>
  );
};
