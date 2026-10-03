import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { Panel, Progress } from "../components/Studio";
import { Words, Mono } from "../components/Type";
import { clip } from "../footage";
import { C, mono, sans } from "../theme";
import { EXPO_IN, EXPO_IN_OUT, EXPO_OUT, lerp, map, springIn } from "../lib/motion";

const OMAR = clip("omar_line");

/** 0:18 — "Drop your video." A clip flies into the dropzone, the upload bar sweeps orange to emerald. */
export const S05Drop: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // camera: high angle settling to straight-on, then a whip to the next scene
  const settle = map(f, [0, 70], [0, 1], EXPO_OUT);
  const whip = map(f, [160, 180], [0, 1], EXPO_IN);
  const rx = lerp(30, 8, settle);
  const ry = lerp(-18, -4, settle) - whip * 40;
  const tz = lerp(-500, 0, settle);
  const tx = whip * -1600;

  // the file card's flight: in from top-left on an arc, lands at frame 32 with a squash
  const fly = map(f, [6, 32], [0, 1], EXPO_IN_OUT);
  const land = springIn(f, fps, 32, { damping: 9, stiffness: 260 });
  const fx = lerp(-760, 0, fly);
  const fy = lerp(-560, 0, fly) - Math.sin(fly * Math.PI) * 160;
  const frot = lerp(-24, 0, fly);
  const squash = f >= 32 ? 1 + (1 - land) * 0.12 : 1;
  const up = map(f, [40, 128], [0, 1], (t) => 1 - Math.pow(1 - t, 2.2));
  const done = map(f, [128, 140], [0, 1]);
  const hover = map(f, [18, 30], [0, 1]) * (1 - map(f, [34, 44], [0, 1]));

  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ padding: "120px 0 0 150px" }}>
        <Words
          align="left"
          size={104}
          out={150}
          words={[
            { t: "Drop", at: 4 },
            { t: "your", at: 10 },
            { t: "video.", at: 16, accent: true, color: C.forest },
          ]}
        />
        <div style={{ marginTop: 22, opacity: map(f, [40, 56], [0, 1]) * (1 - map(f, [150, 162], [0, 1])) }}>
          <Mono size={24}>no install · no plugin · right in your browser</Mono>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "60% 40%" }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 230, paddingLeft: 260 }}>
          <div style={{ transform: `translate3d(${tx}px,0,${tz}px) rotateX(${rx}deg) rotateY(${ry}deg)`, transformStyle: "preserve-3d", filter: whip > 0.05 ? `blur(${whip * 20}px)` : undefined }}>
            <Panel style={{ width: 1180, height: 560, padding: 40, boxSizing: "border-box" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 22,
                  border: `3px dashed ${hover > 0 ? C.ink : C.beige}`,
                  background: hover > 0 ? "rgba(240,215,255,0.45)" : "rgba(244,244,224,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div style={{ opacity: 1 - map(f, [28, 36], [0, 1]), textAlign: "center" }}>
                  <div style={{ fontSize: 64 }}>🎬</div>
                  <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 40, marginTop: 10 }}>Drop your video here</div>
                  <div style={{ fontFamily: sans, fontSize: 24, color: C.muted, marginTop: 8 }}>MP4, MOV or WebM</div>
                </div>
                {/* progress, once landed */}
                <div style={{ position: "absolute", left: 60, right: 60, bottom: 54, opacity: map(f, [36, 46], [0, 1]) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: mono, fontSize: 22, color: C.muted }}>
                    <span>{done > 0.5 ? "ready · 1080×1920 · 12.4 s" : "uploading…"}</span>
                    <span style={{ color: done > 0.5 ? C.forest : C.ink, fontWeight: 500 }}>{done > 0.5 ? "✓ 100%" : `${Math.round(up * 100)}%`}</span>
                  </div>
                  <Progress value={up} width={980} height={16} />
                </div>
              </div>
            </Panel>
          </div>
        </AbsoluteFill>
        {/* the clip, as a file card */}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 140, paddingLeft: 260 }}>
          <div
            style={{
              transform: `translate3d(${fx}px, ${fy - (f >= 32 ? 60 : 0)}px, 120px) rotate(${frot}deg) scale(${squash}, ${2 - squash}) scale(${lerp(1.15, 0.92, fly)})`,
              opacity: 1 - map(f, [150, 166], [0, 1]),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "18px 30px 18px 18px", borderRadius: 26, background: C.cream, border: `1.5px solid ${C.beige}`, boxShadow: "0 30px 60px -20px rgba(26,26,26,0.4)" }}>
              <div style={{ width: 92, height: 150, borderRadius: 14, overflow: "hidden", background: C.ink }}>
                <Img src={staticFile(OMAR.poster)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 26, color: C.ink }}>take_07_final.mp4</div>
                <div style={{ fontFamily: sans, fontSize: 22, color: C.muted, marginTop: 8 }}>0:12 · vertical</div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.14} />
    </AbsoluteFill>
  );
};
