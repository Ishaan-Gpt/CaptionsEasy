"use client";

import React, { useEffect, useState } from "react";
import { SPECIMENS, DEMO_WORDS, useWordLoop } from "./TemplateSpecimen";

const HERO_CYCLE = ["glow_stack", "cinematic_emerald", "serif_pop", "sentence_highlight"];
const WORD_MS = 520;

/**
 * A 9:16 "phone" frame playing the caption engine live: the demo line is
 * re-rendered word-by-word, and every few seconds the whole frame re-styles
 * itself into the next real template — the product's core promise, shown
 * instead of described.
 */
export default function CaptionPhone() {
  const [templateIdx, setTemplateIdx] = useState(0);
  const wordIdx = useWordLoop(DEMO_WORDS.length, true, WORD_MS);

  useEffect(() => {
    const t = setInterval(
      () => setTemplateIdx((i) => (i + 1) % HERO_CYCLE.length),
      DEMO_WORDS.length * WORD_MS * 2,
    );
    return () => clearInterval(t);
  }, []);

  const spec = SPECIMENS.find((s) => s.id === HERO_CYCLE[templateIdx])!;
  const seconds = (wordIdx * WORD_MS) / 1000;
  const timecode = `00:0${Math.floor(seconds)}:${String(Math.round((seconds % 1) * 30)).padStart(2, "0")}`;

  return (
    <div className="relative w-full max-w-[300px] sm:max-w-[340px] mx-auto">
      {/* Frame */}
      <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-ink shadow-sand-deep ring-8 ring-white">
        {/* Footage stand-in: cinematic vignette + warm key light */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 70% 12%, rgba(178,148,101,0.38) 0%, rgba(32,25,16,0) 55%), radial-gradient(140% 110% at 30% 100%, rgba(78,60,36,0.5) 0%, rgba(32,25,16,0) 60%), #16110A",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Template chip */}
        <div className="absolute top-4 inset-x-0 flex justify-center">
          <span
            key={spec.id}
            className="animate-fade-in-up rounded-full bg-white/12 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-sora font-semibold tracking-wide text-sand-200"
          >
            {spec.name}
          </span>
        </div>

        {/* The live caption */}
        <div className="absolute inset-x-4 top-[54%] -translate-y-1/2 flex items-center justify-center text-center min-h-[7rem]">
          {spec.render(DEMO_WORDS, wordIdx)}
        </div>

        {/* Word-timing rail: one tick per word, the live one fills */}
        <div className="absolute bottom-5 inset-x-6">
          <div className="flex items-center justify-between mb-2 font-mono text-[10px] text-sand-300/80">
            <span>{timecode}</span>
            <span>1080 × 1920</span>
          </div>
          <div className="flex gap-1">
            {DEMO_WORDS.map((_, i) => (
              <span
                key={i}
                className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i <= wordIdx ? "#DCC8A4" : "rgba(255,255,255,0.18)" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Template dots */}
      <div className="mt-5 flex justify-center gap-2">
        {HERO_CYCLE.map((id, i) => (
          <button
            key={id}
            aria-label={`Show ${SPECIMENS.find((s) => s.id === id)?.name}`}
            onClick={() => setTemplateIdx(i)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === templateIdx ? "w-6 bg-sand-500" : "w-1.5 bg-sand-300 hover:bg-sand-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
