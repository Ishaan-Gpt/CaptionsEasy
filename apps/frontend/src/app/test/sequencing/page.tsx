"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RemotionTestPlayer } from "@/components/test/RemotionTestPlayer";
import { ProjectLink } from "@/components/test/ProjectLink";
import { CodePanel } from "@/components/test/CodePanel";
import { SliderRow } from "@/components/test/controls";
import { SequencingComposition, type SequenceLayer } from "@/components/test/compositions/SequencingComposition";

const TOTAL_FRAMES = 150; // matches Root.tsx's comment: engine.py renders 5s @ 30fps by default

const INITIAL_LAYERS: SequenceLayer[] = [
  { id: "bg", label: "Background", from: 0, durationInFrames: 150, color: "#4FA8FF", top: 60 },
  { id: "title", label: "Main Title", from: 15, durationInFrames: 60, color: "#FFB800", top: 160 },
  { id: "caption", label: "Caption Card", from: 45, durationInFrames: 80, color: "#00F5C4", top: 260 },
];

export default function SequencingPage() {
  const [layers, setLayers] = useState<SequenceLayer[]>(INITIAL_LAYERS);

  const updateLayer = (id: string, patch: Partial<SequenceLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const inputProps = useMemo(() => ({ layers }), [layers]);

  const code = `// Real <Sequence> from "remotion" — replaces manual start_ms/end_ms
// window checks (Subtitles.tsx:112-117) with declarative mounting.
import { Sequence, useCurrentFrame } from "remotion";

${layers
  .map(
    (l) => `<Sequence from={${l.from}} durationInFrames={${l.durationInFrames}}>
  {/* useCurrentFrame() here starts at 0 when this Sequence begins */}
  <${l.label.replace(/\s+/g, "")} />
</Sequence>`
  )
  .join("\n")}`;

  return (
    <div className="min-h-screen bg-[#07080A] text-white antialiased pb-16">
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center gap-3">
        <Link href="/test" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider">Sequencing &amp; Timing</h1>
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Real &lt;Sequence&gt; layering with from / durationInFrames</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <RemotionTestPlayer component={SequencingComposition} inputProps={inputProps} durationInFrames={TOTAL_FRAMES} aspectRatio="16:9" />

          <div className="bg-[#0E1013] border border-[#23272F] rounded-xl p-4 space-y-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">Timeline (frames 0-{TOTAL_FRAMES})</span>
            {layers.map((l) => (
              <div key={l.id} className="relative h-5 bg-[#0A0B0D] rounded border border-[#23272F]/60">
                <div
                  className="absolute h-full rounded flex items-center px-2 text-[8px] font-bold text-[#0A0B0D]"
                  style={{
                    left: `${(l.from / TOTAL_FRAMES) * 100}%`,
                    width: `${(l.durationInFrames / TOTAL_FRAMES) * 100}%`,
                    background: l.color,
                  }}
                >
                  {l.label}
                </div>
              </div>
            ))}
          </div>

          <ProjectLink
            file="apps/remotion-pipeline/src/Subtitles.tsx:112-117"
            gap
            description="Production doesn't use <Sequence> at all — it finds the active caption/highlight by comparing currentTimeMs against every TimelineEvent's start_ms/end_ms on every frame. This page shows what declarative <Sequence>-based mounting would look like instead, which would also unlock premountFor for heavier per-card layouts."
          />
          <ProjectLink
            file="apps/remotion-pipeline/src/Root.tsx:13-30"
            description="calculateMetadata derives durationInFrames from the timeline's last end_ms — the same 'total duration driven by real event timing' idea as this page's 150-frame (5s) default."
          />
          <CodePanel code={code} />
        </div>

        <div className="space-y-5 bg-[#0E1013] border border-[#23272F] rounded-xl p-4 h-fit">
          {layers.map((l) => (
            <div key={l.id} className="space-y-2 border-b border-[#23272F]/50 pb-4 last:border-0 last:pb-0">
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: l.color }}>
                {l.label}
              </span>
              <SliderRow label="From (frame)" value={l.from} min={0} max={TOTAL_FRAMES - 5} onChange={(v) => updateLayer(l.id, { from: Math.min(v, TOTAL_FRAMES - l.durationInFrames) })} />
              <SliderRow
                label="Duration (frames)"
                value={l.durationInFrames}
                min={5}
                max={TOTAL_FRAMES}
                onChange={(v) => updateLayer(l.id, { durationInFrames: Math.min(v, TOTAL_FRAMES - l.from) })}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
