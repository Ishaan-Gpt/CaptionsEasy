"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RemotionTestPlayer } from "@/components/test/RemotionTestPlayer";
import { ProjectLink } from "@/components/test/ProjectLink";
import { CodePanel } from "@/components/test/CodePanel";
import { SliderRow, SegmentedControl } from "@/components/test/controls";
import { TransitionsComposition, type PresentationName, type TimingName } from "@/components/test/compositions/TransitionsComposition";

const PRESENTATIONS: PresentationName[] = ["fade", "slide", "wipe", "flip", "clockWipe", "none"];
const TIMINGS: TimingName[] = ["linear", "spring"];

export default function TransitionsPage() {
  const [presentation, setPresentation] = useState<PresentationName>("fade");
  const [timing, setTiming] = useState<TimingName>("spring");
  const [transitionDurationInFrames, setTransitionDurationInFrames] = useState(15);
  const [cardDurationInFrames, setCardDurationInFrames] = useState(40);

  const inputProps = useMemo(
    () => ({ presentation, timing, transitionDurationInFrames, cardDurationInFrames }),
    [presentation, timing, transitionDurationInFrames, cardDurationInFrames]
  );

  const totalFrames = cardDurationInFrames * 3 - transitionDurationInFrames * 2;

  const code = `// Real @remotion/transitions — this is the missing piece between
// caption cards in Subtitles.tsx:164-169 (which currently cut instantly)
import { TransitionSeries, ${timing === "spring" ? "springTiming" : "linearTiming"} } from "@remotion/transitions";
import { ${presentation === "clockWipe" ? "clockWipe" : presentation} } from "@remotion/transitions/${presentation === "clockWipe" ? "clock-wipe" : presentation}";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={${cardDurationInFrames}}>
    <CaptionCard1 />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={${presentation === "clockWipe" ? "clockWipe({ width: 1920, height: 1080 })" : `${presentation}()`}}
    timing={${
      timing === "spring"
        ? `springTiming({ config: { damping: 200 }, durationInFrames: ${transitionDurationInFrames} })`
        : `linearTiming({ durationInFrames: ${transitionDurationInFrames} })`
    }}
  />
  <TransitionSeries.Sequence durationInFrames={${cardDurationInFrames}}>
    <CaptionCard2 />
  </TransitionSeries.Sequence>
</TransitionSeries>`;

  return (
    <div className="min-h-screen bg-[#07080A] text-white antialiased pb-16">
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center gap-3">
        <Link href="/test" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider">Transitions</h1>
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Real @remotion/transitions — TransitionSeries presentations x timings</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <RemotionTestPlayer component={TransitionsComposition} inputProps={inputProps} durationInFrames={totalFrames} aspectRatio="16:9" />

          <ProjectLink
            file="apps/remotion-pipeline/src/Subtitles.tsx:164-169"
            gap
            description="Caption cards currently cut instantly with a code comment explaining why a CSS fade was removed (150ms fade ate the whole on-screen time for short highlight windows). A real TransitionSeries with a short (~5-10 frame) transitionDurationInFrames avoids that problem since the transition overlaps the two cards' own durations rather than stealing time from either."
          />
          <ProjectLink
            file="apps/backend/app/render/presets.json"
            gap
            description="No transitions field exists in any preset today — this page is the prototype for a `transitions: { presentation, timing }` preset field."
          />
          <CodePanel code={code} />
        </div>

        <div className="space-y-5 bg-[#0E1013] border border-[#23272F] rounded-xl p-4 h-fit">
          <div className="space-y-1">
            <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Presentation</label>
            <select
              value={presentation}
              onChange={(e) => setPresentation(e.target.value as PresentationName)}
              className="w-full bg-[#181B21] border border-[#23272F] text-xs rounded p-2 focus:outline-none focus:border-[#FFB800] cursor-pointer text-white"
            >
              {PRESENTATIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <SegmentedControl label="Timing" options={TIMINGS} value={timing} onChange={setTiming} />
          <SliderRow label="Transition Duration" value={transitionDurationInFrames} min={3} max={30} onChange={setTransitionDurationInFrames} unit=" frames" />
          <SliderRow label="Card Duration" value={cardDurationInFrames} min={transitionDurationInFrames + 5} max={90} onChange={setCardDurationInFrames} unit=" frames" />
        </div>
      </main>
    </div>
  );
}
