import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { ClipAt, Phone } from "../components/Phone";
import { LookCaptions } from "../components/LookCaptions";
import { Panel } from "../components/Studio";
import { Words } from "../components/Type";
import { clip } from "../footage";
import { C, mono, sans } from "../theme";
import { EXPO_IN_OUT, EXPO_OUT, lerp, map, rand } from "../lib/motion";

const OMAR = clip("omar_line");
export const PHONE_SIZE = 1.55;

const ts = (ms: number) => {
  const s = ms / 1000;
  return `00:${String(Math.floor(s)).padStart(2, "0")}.${String(Math.floor((s % 1) * 100)).padStart(2, "0")}`;
};

/** Transcript lines of ~4 words, like the editor's caption list. */
const LINES = (() => {
  const out: { startMs: number; words: { text: string; startMs: number; endMs: number }[] }[] = [];
  for (let i = 0; i < OMAR.words.length; i += 4) {
    const words = OMAR.words.slice(i, i + 4);
    out.push({ startMs: words[0]!.startMs, words });
  }
  return out;
})();

/**
 * 0:21 — "Every word, caught." Omar speaks (his real voice starts here): his words land in the transcript with
 * their timestamps while the same words pop on his video in the Jumping Box look.
 */
export const S06Words: React.FC = () => {
  const f = useCurrentFrame();
  const tMs = (f / 60) * 1000;
  const enter = map(f, [0, 22], [0, 1], EXPO_OUT);
  const orbit = map(f, [0, 300], [0, 1]);
  const toCenter = map(f, [262, 300], [0, 1], EXPO_IN_OUT);
  const ry = lerp(16, -6, orbit) * (1 - toCenter);
  const rx = lerp(6, 2, orbit) * (1 - toCenter);
  const sceneX = lerp(1500, 0, enter);

  // visible transcript window: the current line and three before it
  const current = Math.max(0, LINES.findLastIndex((l) => l.startMs <= tMs));
  const first = Math.max(0, current - 3);
  const scrollY = map(f, [0, 300], [0, 0]) + first * 0;

  // waveform driven by the words actually being spoken
  const bars = Array.from({ length: 46 }, (_, i) => {
    const t = tMs - (23 - i) * 40;
    const speaking = OMAR.words.some((w) => t >= w.startMs - 30 && t <= w.endMs + 30);
    const n = rand(i * 13 + Math.floor(f / 3) * 7);
    return speaking ? 0.35 + n * 0.65 : 0.06 + n * 0.08;
  });

  const phoneX = lerp(-500, 0, toCenter);
  const phoneS = lerp(1, 900 / 860, toCenter);
  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ padding: "112px 0 0 900px", opacity: 1 - toCenter, transform: `translateX(${sceneX * 0.4}px)` }}>
        <Words align="left" size={92} words={[{ t: "Every", at: 8 }, { t: "word,", at: 14 }, { t: "caught.", at: 22, accent: true, color: C.forest }]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 2000, perspectiveOrigin: "50% 45%" }}>
        <AbsoluteFill style={{ transform: `translateX(${sceneX}px) rotateX(${rx}deg) rotateY(${ry}deg)`, transformStyle: "preserve-3d", filter: enter < 0.9 ? `blur(${(1 - enter) * 24}px)` : undefined }}>
          {/* transcript */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingLeft: 720, paddingTop: 200, transform: `translateZ(-80px) translateX(${toCenter * 1400}px)`, opacity: 1 - toCenter }}>
            <Panel title="Transcript · word level" right={<span style={{ fontFamily: mono, fontSize: 18, color: C.forest }}>● listening</span>} style={{ width: 820, height: 470 }}>
              <div style={{ padding: "18px 0", transform: `translateY(${-scrollY}px)` }}>
                {LINES.slice(first, first + 5).map((l, k) => {
                  const idx = first + k;
                  const active = idx === current;
                  const shown = l.words.filter((w) => w.startMs <= tMs + 40);
                  if (!shown.length) return null;
                  const age = map(tMs, [l.startMs, l.startMs + 250], [0, 1], EXPO_OUT);
                  return (
                    <div key={idx} style={{ display: "flex", gap: 26, alignItems: "center", padding: "18px 30px", background: active ? "rgba(240,215,255,0.45)" : "transparent", opacity: age, transform: `translateY(${(1 - age) * 20}px)` }}>
                      <span style={{ fontFamily: mono, fontSize: 22, color: C.muted, width: 120 }}>{ts(l.startMs)}</span>
                      <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {shown.map((w, j) => {
                          const now = tMs >= w.startMs && tMs < w.endMs + 60;
                          const pop = map(tMs, [w.startMs, w.startMs + 160], [0, 1], EXPO_OUT);
                          return (
                            <span key={j} style={{ fontFamily: sans, fontWeight: active ? 700 : 500, fontSize: 34, color: C.ink, padding: "4px 10px", borderRadius: 10, background: now ? C.orange : "transparent", transform: `scale(${0.85 + pop * 0.15})`, display: "inline-block" }}>
                              {w.text}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </AbsoluteFill>
          {/* phone + waveform */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translateZ(60px) translateX(${phoneX}px) scale(${phoneS})` }}>
            <Phone height={860}>
              <ClipAt src={OMAR.src} timeSec={f / 60} />
              <LookCaptions lookId="hormozi_box" words={OMAR.words} timeMs={tMs} sizeMul={PHONE_SIZE} />
            </Phone>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "none", gap: 6, alignItems: "center", justifyContent: "center", height: 70, opacity: 1 - toCenter }}>
              {bars.map((b, i) => (
                <div key={i} style={{ width: 7, height: 70 * b, borderRadius: 7, background: i % 3 === 0 ? C.orange : C.ink, opacity: 0.85 }} />
              ))}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.14} />
    </AbsoluteFill>
  );
};
