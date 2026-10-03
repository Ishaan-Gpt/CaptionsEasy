import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Grain, NightSky } from "../components/Backdrop";
import { Stamp, Words } from "../components/Type";
import { C, mono, sans } from "../theme";
import { EXPO_IN, lerp, map, rand, speedRamp } from "../lib/motion";

const WORDS = "so you caption it by hand every single word one at a time line by line frame by frame again and again until the timing feels right then you fix the typos and nudge it and render it and watch it and fix it again".split(" ");

const fmt = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * 0:08 — The grind, as a hyperlapse: an editing timeline filling with caption blocks one by one, a clock
 * running away, "Every. Single. Word." Ends in a white-out that becomes the reveal.
 */
export const S03Grind: React.FC = () => {
  const f = useCurrentFrame();
  // hyperlapse: work speeds up the whole scene
  const p = speedRamp(f, [[0, 0.4], [80, 1], [170, 3.5], [240, 9]]);
  const blocks = Math.floor(p * 150);
  const hours = p * 4.2 * 3600;
  const playhead = (p * 7) % 1;
  const shake = f >= 120 && f < 200 ? (rand(f) - 0.5) * map((f - 120) % 30, [0, 10], [22, 0]) : 0;
  const out = map(f, [200, 238], [0, 1], EXPO_IN);
  const rotZ = lerp(-9, 5, p) + out * 30;
  const tz = lerp(-100, 260, p) + out * 900;

  const tracks = [0, 1, 2];
  const trackY = (t: number) => 250 + t * 120;
  const blockW = (i: number) => 60 + rand(i * 7) * 110;
  let cursorX = 0;
  const placed: { x: number; w: number; t: number; i: number }[] = [];
  for (let i = 0; i < blocks; i++) {
    const w = blockW(i);
    const t = i % 3;
    placed.push({ x: (cursorX % 2400) + 40, w, t, i });
    if (t === 2) cursorX += w + 18;
  }

  return (
    <AbsoluteFill>
      <NightSky glow={0.6} />
      <AbsoluteFill style={{ perspective: 1400, perspectiveOrigin: "50% 30%", transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              width: 2600,
              height: 760,
              borderRadius: 28,
              background: "#161614",
              border: "1px solid rgba(255,255,235,0.08)",
              boxShadow: "0 80px 160px rgba(0,0,0,0.6)",
              transform: `translate3d(0, 140px, ${tz}px) rotateX(40deg) rotateZ(${rotZ}deg) scale(1.15)`,
              position: "relative",
              overflow: "hidden",
              filter: out > 0.05 ? `blur(${out * 14}px)` : undefined,
            }}
          >
            {/* ruler */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, borderBottom: "1px solid rgba(255,255,235,0.08)" }}>
              {Array.from({ length: 52 }, (_, i) => (
                <div key={i} style={{ position: "absolute", left: 40 + i * 50, top: 18, fontFamily: mono, fontSize: 18, color: "rgba(255,255,235,0.35)" }}>
                  {i % 2 === 0 ? `${i / 2}s` : "·"}
                </div>
              ))}
            </div>
            {/* video track */}
            <div style={{ position: "absolute", left: 40, right: 40, top: 90, height: 120, borderRadius: 12, background: "linear-gradient(90deg,#2a2a26,#33332f,#2a2a26)", opacity: 0.9 }}>
              {Array.from({ length: 22 }, (_, i) => (
                <div key={i} style={{ position: "absolute", left: i * 114, top: 8, width: 106, height: 104, borderRadius: 8, background: `rgba(255,255,235,${0.04 + rand(i) * 0.05})` }} />
              ))}
            </div>
            {/* waveform */}
            <div style={{ position: "absolute", left: 40, right: 40, top: 228, height: 0 }} />
            {tracks.map((t) => (
              <div key={t} style={{ position: "absolute", left: 40, right: 40, top: trackY(t), height: 96, borderRadius: 12, background: "rgba(255,255,235,0.03)", border: "1px dashed rgba(255,255,235,0.07)" }} />
            ))}
            {placed.map((b) => {
              const age = blocks - b.i;
              const fresh = age < 3;
              return (
                <div
                  key={b.i}
                  style={{
                    position: "absolute",
                    left: b.x,
                    top: trackY(b.t) + 10,
                    width: b.w,
                    height: 76,
                    borderRadius: 10,
                    background: fresh ? C.orange : b.t === 1 ? "rgba(52,211,153,0.55)" : "rgba(240,215,255,0.5)",
                    boxShadow: fresh ? "0 0 30px rgba(255,169,70,0.8)" : undefined,
                    fontFamily: sans,
                    fontWeight: 700,
                    fontSize: 20,
                    color: C.ink,
                    padding: "8px 10px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {WORDS[b.i % WORDS.length]}
                </div>
              );
            })}
            {/* playhead */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 40 + playhead * 2520, width: 3, background: C.orange, boxShadow: `0 0 20px ${C.orange}` }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* the clock running away */}
      <AbsoluteFill style={{ alignItems: "flex-end", padding: "70px 90px", opacity: map(f, [10, 30], [0, 1]) * (1 - out) }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: mono, fontSize: 24, color: "rgba(255,255,235,0.5)", letterSpacing: "0.12em" }}>TIME SPENT CAPTIONING</div>
          <div style={{ fontFamily: mono, fontSize: 84, fontWeight: 500, color: C.cream, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{fmt(hours)}</div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 150px" }}>
        <Words
          align="left"
          size={96}
          color={C.cream}
          out={104}
          words={[
            { t: "So", at: 12 },
            { t: "you", at: 18 },
            { t: "caption", at: 24 },
            { t: "it", at: 32 },
            { t: "by", at: 42, accent: true, color: C.orange },
            { t: "hand.", at: 48, accent: true, color: C.orange },
          ]}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 46, alignItems: "baseline", transform: "translateY(-30px)" }}>
          {[["Every.", 120], ["Single.", 150], ["Word.", 180]].map(([t, at], i) => (
            <Stamp key={t} text={t as string} at={at as number} size={160} color={i === 2 ? C.orange : C.cream} out={206} />
          ))}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.09} vignette={0.5} />
      {/* white-out into the reveal */}
      <AbsoluteFill style={{ background: C.cream, opacity: map(f, [222, 239], [0, 1], EXPO_IN) }} />
    </AbsoluteFill>
  );
};
