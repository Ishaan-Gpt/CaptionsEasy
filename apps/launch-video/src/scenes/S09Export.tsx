import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { Cursor, Panel, Progress } from "../components/Studio";
import { Words } from "../components/Type";
import { C, mono, sans } from "../theme";
import { EXPO_IN, EXPO_IN_OUT, EXPO_OUT, lerp, map, speedRamp, springIn } from "../lib/motion";

/** 0:37 — "Export. Done." One click, a render that hyperlapses to 100%, the download button. */
export const S09Export: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = map(f, [0, 26], [0, 1], EXPO_OUT);
  const exit = map(f, [156, 180], [0, 1], EXPO_IN);
  const rx = lerp(38, 4, enter) + Math.sin(f / 50) * 1.5 - exit * 20;
  const ry = lerp(-22, -6, enter) + map(f, [26, 156], [0, 10]);
  const z = lerp(-900, 0, enter) + exit * 1400;
  // render progress: a hyperlapse that slows into 100
  const p = f < 36 ? 0 : speedRamp(f, [[36, 0.4], [60, 2.6], [100, 2.2], [118, 0.3]]);
  const done = f >= 118;
  const pop = springIn(f, fps, 118, { damping: 10, stiffness: 220 });
  const clickAt = 32;
  const press = f >= clickAt && f < clickAt + 14 ? map(f, [clickAt, clickAt + 14], [0, 1]) : 0;
  const pressDl = f >= 138 && f < 152 ? map(f, [138, 152], [0, 1]) : 0;
  const go = map(f, [8, 30], [0, 1], EXPO_IN_OUT);
  const mx = lerp(1880, 1590, go) - map(f, [120, 136], [0, 1], EXPO_IN_OUT) * 20;
  const my = lerp(1060, 800, go);

  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ padding: "0 0 0 150px", justifyContent: "center" }}>
        <Words
          align="left"
          size={112}
          out={150}
          words={[
            { t: "Export.", at: 10 },
            { t: "Done.", at: 120, accent: true, color: C.forest },
          ]}
        />
        <div style={{ marginTop: 26, fontFamily: mono, fontSize: 26, color: C.muted, opacity: map(f, [128, 140], [0, 1]) * (1 - exit) }}>MP4 · 1080×1920 · no watermark</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 2000 }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingLeft: 640 }}>
          <div style={{ transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`, opacity: 1 - exit, filter: exit > 0.05 ? `blur(${exit * 16}px)` : undefined }}>
            <Panel title="Export" right={<span style={{ fontFamily: mono, fontSize: 18, color: C.muted }}>v1 · saved</span>} style={{ width: 860 }}>
              <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 18, fontFamily: sans }}>
                {[
                  { t: "MP4 video", d: "Captions burned in · 1080×1920", badge: "Most popular", on: true },
                  { t: "SRT subtitles", d: "For YouTube or your editor", on: false },
                ].map((o) => (
                  <div key={o.t} style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 26px", borderRadius: 20, border: `2px solid ${o.on ? C.ink : C.beige}`, background: o.on ? "rgba(240,215,255,0.4)" : C.cream }}>
                    <div style={{ width: 28, height: 28, borderRadius: 28, border: `3px solid ${C.ink}`, display: "grid", placeItems: "center" }}>{o.on ? <div style={{ width: 14, height: 14, borderRadius: 14, background: C.ink }} /> : null}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 32, fontWeight: 800 }}>{o.t}</div>
                      <div style={{ fontSize: 22, color: C.muted, marginTop: 4 }}>{o.d}</div>
                    </div>
                    {o.badge ? <div style={{ fontSize: 20, fontWeight: 700, padding: "8px 16px", borderRadius: 999, background: C.orange }}>{o.badge}</div> : null}
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: "24px 26px", borderRadius: 20, background: C.cream2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 22, color: C.muted, marginBottom: 16 }}>
                    <span>{f < 36 ? "ready to render" : done ? "rendered in your browser" : "rendering · 1080×1920 · 60fps"}</span>
                    <span style={{ color: done ? C.forest : C.ink }}>{done ? "✓ 100%" : `${Math.round(p * 100)}%`}</span>
                  </div>
                  <Progress value={p} width={740} height={16} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <div
                    style={{
                      padding: "20px 38px",
                      borderRadius: 999,
                      background: done ? C.ink : C.lavender,
                      border: `2px solid ${C.ink}`,
                      color: done ? C.cream : C.ink,
                      fontWeight: 800,
                      fontSize: 30,
                      transform: `scale(${done ? 0.9 + pop * 0.1 : 1 - press * 0.06})`,
                    }}
                  >
                    {done ? "↓ Download MP4" : "Export video →"}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <Cursor x={mx} y={my} press={Math.max(press, pressDl)} style={{ opacity: 1 - exit }} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.14} />
      <AbsoluteFill style={{ background: C.cream, opacity: map(f, [168, 180], [0, 1]) }} />
    </AbsoluteFill>
  );
};
