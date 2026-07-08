"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { spring } from "remotion";
import { RemotionTestPlayer } from "@/components/test/RemotionTestPlayer";
import { ProjectLink } from "@/components/test/ProjectLink";
import { CodePanel } from "@/components/test/CodePanel";
import { SliderRow, Switch, SegmentedControl } from "@/components/test/controls";
import { MotionComposition, type EasingPreset, type ExtrapolateMode, type MotionMode } from "@/components/test/compositions/MotionComposition";

const MODES = ["spring", "interpolate"] as const;
const EASINGS: EasingPreset[] = ["linear", "ease-in", "ease-out", "ease-in-out", "bounce", "elastic", "back"];
const EXTRAPOLATES: ExtrapolateMode[] = ["clamp", "extend", "identity"];
const FPS = 30;
const PLOT_FRAMES = 60;

export default function MotionPage() {
  const [mode, setMode] = useState<MotionMode>("spring");
  const [damping, setDamping] = useState(10);
  const [stiffness, setStiffness] = useState(120);
  const [mass, setMass] = useState(0.4);
  const [overshootClamping, setOvershootClamping] = useState(false);
  const [springDurationInFrames, setSpringDurationInFrames] = useState(0);
  const [easingPreset, setEasingPreset] = useState<EasingPreset>("ease-out");
  const [extrapolateLeft, setExtrapolateLeft] = useState<ExtrapolateMode>("clamp");
  const [extrapolateRight, setExtrapolateRight] = useState<ExtrapolateMode>("clamp");
  const [animDelay, setAnimDelay] = useState(10);
  const [animLength, setAnimLength] = useState(15);

  const inputProps = useMemo(
    () => ({
      mode,
      damping,
      stiffness,
      mass,
      overshootClamping,
      springDurationInFrames,
      easingPreset,
      extrapolateLeft,
      extrapolateRight,
      animDelay,
      animLength,
    }),
    [mode, damping, stiffness, mass, overshootClamping, springDurationInFrames, easingPreset, extrapolateLeft, extrapolateRight, animDelay, animLength]
  );

  // Real spring() values plotted with the same config the Player evaluates —
  // this is the actual production curve, not a redrawn approximation.
  const springCurve = useMemo(() => {
    const points: number[] = [];
    for (let f = 0; f < PLOT_FRAMES; f++) {
      points.push(
        spring({
          frame: f - animDelay,
          fps: FPS,
          config: { damping, stiffness, mass, overshootClamping },
          durationInFrames: springDurationInFrames || undefined,
        })
      );
    }
    return points;
  }, [damping, stiffness, mass, overshootClamping, springDurationInFrames, animDelay]);

  const maxVal = Math.max(1.2, ...springCurve);
  const pathD = springCurve
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (PLOT_FRAMES - 1)) * 100} ${100 - (v / maxVal) * 90}`)
    .join(" ");

  const code =
    mode === "spring"
      ? `// Identical shape to Subtitles.tsx's heroPopSpring (line 224-231)
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame: frame - ${animDelay},
  fps,
  config: {
    damping: ${damping},
    stiffness: ${stiffness},
    mass: ${mass},
    overshootClamping: ${overshootClamping},
  },${springDurationInFrames ? `\n  durationInFrames: ${springDurationInFrames},` : ""}
});`
      : `// Identical shape to interpolate() calls throughout Subtitles.tsx
import { interpolate, Easing, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();
const translateY = interpolate(frame, [${animDelay}, ${animDelay + animLength}], [120, 0], {
  easing: Easing.${easingPreset === "linear" ? "linear" : easingPreset.replace(/-./g, (s) => s[1].toUpperCase())}(...),
  extrapolateLeft: "${extrapolateLeft}",
  extrapolateRight: "${extrapolateRight}",
});`;

  return (
    <div className="min-h-screen bg-[#07080A] text-white antialiased pb-16">
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center gap-3">
        <Link href="/test" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider">Motion: Springs &amp; Easing</h1>
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Real spring() and interpolate()/Easing from the remotion package</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <RemotionTestPlayer component={MotionComposition} inputProps={inputProps} durationInFrames={PLOT_FRAMES} aspectRatio="1:1" />

          <div className="bg-[#0E1013] border border-[#23272F] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">Live spring() curve (frames 0-{PLOT_FRAMES})</span>
              <span className="text-[8px] font-mono text-[#FFB800]">fps={FPS}</span>
            </div>
            <svg viewBox="0 0 100 100" className="w-full h-40 bg-[#0A0B0D] rounded border border-[#23272F]/60">
              <line x1="0" y1="10" x2="100" y2="10" stroke="#23272F" strokeWidth="0.5" />
              <path d={pathD} fill="none" stroke="#00F5C4" strokeWidth="1.2" />
            </svg>
          </div>

          <ProjectLink
            file="apps/remotion-pipeline/src/Subtitles.tsx:224-231"
            description="heroPopSpring uses { damping: 16, stiffness: 260, mass: 0.4 } with durationInFrames: 4 — the exact spring() call this page's sliders reproduce."
          />
          <ProjectLink
            file="apps/remotion-pipeline/src/Subtitles.tsx:152-161"
            description="activeWordSpring (the per-word pop as each word is spoken) uses { damping: 10, stiffness: 120, mass: 0.4 } — this page's default values."
          />
          <ProjectLink
            file="apps/backend/app/render/presets.json"
            gap
            description="animation.motion_preset/intensity currently only pick between a few hardcoded presets server-side — exposing raw spring params per-preset (as sliders here do) would let users tune the exact feel instead of choosing from fixed buckets."
          />
          <CodePanel code={code} />
        </div>

        <div className="space-y-5 bg-[#0E1013] border border-[#23272F] rounded-xl p-4 h-fit">
          <SegmentedControl label="Mode" options={MODES} value={mode} onChange={setMode} />

          {mode === "spring" ? (
            <>
              <SliderRow label="Damping" value={damping} min={0} max={40} onChange={setDamping} />
              <SliderRow label="Stiffness" value={stiffness} min={0} max={400} onChange={setStiffness} />
              <SliderRow label="Mass" value={mass} min={0.1} max={5} step={0.1} onChange={setMass} />
              <SliderRow label="Duration In Frames (0 = auto)" value={springDurationInFrames} min={0} max={60} onChange={setSpringDurationInFrames} />
              <SliderRow label="Start Frame" value={animDelay} min={0} max={40} onChange={setAnimDelay} />
              <Switch label="Overshoot Clamping" description="Clamp past 1 instead of bouncing" checked={overshootClamping} onChange={setOvershootClamping} />
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Easing Preset</label>
                <select
                  value={easingPreset}
                  onChange={(e) => setEasingPreset(e.target.value as EasingPreset)}
                  className="w-full bg-[#181B21] border border-[#23272F] text-xs rounded p-2 focus:outline-none focus:border-[#FFB800] cursor-pointer text-white"
                >
                  {EASINGS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <SegmentedControl label="Extrapolate Left" options={EXTRAPOLATES} value={extrapolateLeft} onChange={setExtrapolateLeft} />
              <SegmentedControl label="Extrapolate Right" options={EXTRAPOLATES} value={extrapolateRight} onChange={setExtrapolateRight} />
              <SliderRow label="Start Frame" value={animDelay} min={0} max={40} onChange={setAnimDelay} />
              <SliderRow label="Duration (frames)" value={animLength} min={2} max={40} onChange={setAnimLength} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
