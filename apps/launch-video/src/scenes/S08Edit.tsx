import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreamSky, Grain } from "../components/Backdrop";
import { ClipAt, Phone } from "../components/Phone";
import { LookCaptions } from "../components/LookCaptions";
import { Cursor, Panel, Slider, Swatch, WordChip } from "../components/Studio";
import { Pill, Words } from "../components/Type";
import { clip } from "../footage";
import { C, mono, sans } from "../theme";
import { EXPO_OUT, keys, lerp, map } from "../lib/motion";

const SANDRA = clip("sandra_name");
const TYPED = ["Sondra.", "S", "Sa", "San", "Sand", "Sandr", "Sandra."];
const COLORS = ["#FFD400", C.orange, C.emerald, C.lavender, C.cream];

/**
 * 0:33 — "Make it yours." The camera travels across the studio: fix a misheard name, swap the spoken-word
 * colour, drag the size. The phone in the middle updates live every time.
 */
export const S08Edit: React.FC = () => {
  const f = useCurrentFrame();
  // speed ramp on the footage: slow-motion while the name is being fixed, then real time
  const clipT = f < 90 ? 0.15 + (f / 60) * 0.62 : 0.15 + (90 / 60) * 0.62 + ((f - 90) / 60) * 1.0;

  // the fix
  const typing = Math.floor(map(f, [36, 72], [0, TYPED.length - 1]));
  const fixed = f >= 74;
  const editing = f >= 32 && !fixed;
  const name = fixed ? "Sandra." : f < 32 ? "Sondra." : TYPED[Math.max(1, typing)]!;
  const words = SANDRA.words.map((w) => (/^Sandra/.test(w.text) ? { ...w, text: fixed ? "Sandra." : "Sondra." } : w));
  // the colour
  const colorIdx = f >= 100 ? 2 : 0;
  // the size
  const size = map(f, [160, 192], [0.35, 0.8], EXPO_OUT);

  // camera over the studio world (1920×1080): [scale, centreX, centreY, rotX, rotY]
  const [s, cx, cy, rx, ry] = keys(f, [
    { at: 0, v: [0.86, 960, 560, 16, -14] },
    { at: 26, v: [1.42, 470, 470, 4, 6], dur: 26 },
    { at: 96, v: [1.42, 1520, 430, -2, -8], dur: 22 },
    { at: 150, v: [1.22, 1360, 600, 0, -4], dur: 24 },
    { at: 222, v: [0.98, 960, 540, 6, 0], dur: 30 },
  ]);
  const enterBlur = map(f, [0, 14], [18, 0]);

  // cursor (world coordinates)
  const [mx, my] = keys(f, [
    { at: 0, v: [700, 900] },
    { at: 30, v: [430, 432], dur: 22 },
    { at: 92, v: [1620, 420], dur: 26 },
    { at: 158, v: [1420, 640], dur: 26 },
    { at: 192, v: [1680, 640], dur: 32 },
    { at: 230, v: [1900, 900], dur: 30 },
  ]);
  const press = (at: number) => (f >= at && f < at + 14 ? map(f, [at, at + 14], [0, 1]) : 0);

  return (
    <AbsoluteFill>
      <CreamSky />
      <AbsoluteFill style={{ perspective: 2200 }}>
        <AbsoluteFill
          style={{
            transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s}) translate(${960 - cx}px, ${540 - cy}px)`,
            transformOrigin: "50% 50%",
            filter: enterBlur > 0.5 ? `blur(${enterBlur}px)` : undefined,
          }}
        >
          {/* captions list */}
          <div style={{ position: "absolute", left: 90, top: 150, opacity: s > 1.3 && cx > 1000 ? 0.55 : 1 }}>
            <Panel title="Captions" style={{ width: 600, height: 780 }}>
              <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 26 }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 18, color: C.muted, marginBottom: 12 }}>00:00.20</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <WordChip text="My" />
                    <WordChip text="name" />
                    <WordChip text="is" />
                    <WordChip text={name} state={editing ? "editing" : fixed ? (f < 96 ? "selected" : "idle") : "low"} caret={editing && Math.floor(f / 8) % 2 === 0} />
                  </div>
                  {f < 32 ? <div style={{ marginTop: 12, fontFamily: sans, fontSize: 20, color: C.orange, fontWeight: 600 }}>Low confidence: check this word</div> : null}
                  {fixed && f < 120 ? <div style={{ marginTop: 12, fontFamily: sans, fontSize: 20, color: C.forest, fontWeight: 600, opacity: map(f, [74, 84], [0, 1]) }}>✓ Saved</div> : null}
                </div>
                {[["00:02.30", ["I", "came", "from"]], ["00:03.10", ["Guyana", "in"]], ["00:04.40", ["1995"]]].map(([t, ws]) => (
                  <div key={t as string}>
                    <div style={{ fontFamily: mono, fontSize: 18, color: C.muted, marginBottom: 12 }}>{t as string}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {(ws as string[]).map((w) => (
                        <WordChip key={w} text={w} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* preview */}
          <div style={{ position: "absolute", left: 960 - 262, top: 70 }}>
            <Phone height={930}>
              <ClipAt src={SANDRA.src} timeSec={clipT} />
              <LookCaptions lookId="karaoke_fill" words={words} timeMs={clipT * 1000} sizeMul={lerp(1.35, 2.05, (size - 0.35) / 0.45)} override={{ active: { color: COLORS[colorIdx] } }} />
            </Phone>
          </div>

          {/* style panel */}
          <div style={{ position: "absolute", left: 1290, top: 150 }}>
            <Panel title="Style" style={{ width: 560, height: 780 }}>
              <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 40, fontFamily: sans }}>
                <div>
                  <div style={{ fontSize: 22, color: C.muted, fontWeight: 600, marginBottom: 14 }}>Look</div>
                  <Pill size={24}>Karaoke Fill</Pill>
                </div>
                <div>
                  <div style={{ fontSize: 22, color: C.muted, fontWeight: 600, marginBottom: 16 }}>Spoken word colour</div>
                  <div style={{ display: "flex", gap: 22 }}>
                    {COLORS.map((c, i) => (
                      <Swatch key={c} color={c} selected={i === colorIdx} />
                    ))}
                  </div>
                </div>
                <Slider label="Size" value={size} width={480} />
                <div>
                  <div style={{ fontSize: 22, color: C.muted, fontWeight: 600, marginBottom: 14 }}>Font</div>
                  <div style={{ fontSize: 30, fontWeight: 800 }}>Poppins · ExtraBold</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, color: C.muted, fontWeight: 600, marginBottom: 14 }}>Motion</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Pill size={22} dark>Sweep</Pill>
                    <Pill size={22} style={{ background: C.cream }}>Pop</Pill>
                    <Pill size={22} style={{ background: C.cream }}>Rise</Pill>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <Cursor x={mx} y={my} press={Math.max(press(30), press(98), press(160))} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "70px 0 0 110px" }}>
        <div style={{ padding: "18px 34px 22px", borderRadius: 30, background: "rgba(255,255,235,0.82)", backdropFilter: "blur(14px)", display: "inline-block", opacity: map(f, [4, 14], [0, 1]) * (1 - map(f, [78, 94], [0, 1])) }}>
          <Words align="left" size={80} words={[{ t: "Make", at: 6 }, { t: "it", at: 12 }, { t: "yours.", at: 18, accent: true, color: C.forest }]} />
        </div>
      </AbsoluteFill>
      <Grain opacity={0.05} vignette={0.14} />
    </AbsoluteFill>
  );
};
