"use client";

import React, { useState } from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import { outfit, anton } from "./fonts";
import { useWordLoop } from "./TemplateSpecimen";

const LINE = ["Nobody", "rewatches", "a", "beige", "subtitle"];

/**
 * Tension beat: the same sentence twice — once as the flat auto-subtitle
 * every tool exports, once through the caption engine.
 * Features realistic simulated video backdrops, audio spectrum indicators,
 * and interactive comparison mode.
 */
export default function Contrast() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15%" });
  const activeIdx = useWordLoop(LINE.length, inView, 560);
  const [sliderPos, setSliderPos] = useState(50); // for interactive slider mode
  const [interactiveMode, setInteractiveMode] = useState(false);

  return (
    <section id="why" className="py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <Reveal className="lg:col-span-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full bg-sand-200 px-3 py-1 font-mono text-[11px] text-sand-800 font-semibold">
              Before vs After
            </span>
            <button
              onClick={() => setInteractiveMode(!interactiveMode)}
              className="font-mono text-[11px] text-sand-600 hover:text-ink underline cursor-pointer"
            >
              {interactiveMode ? "Show side-by-side" : "Try split slider"}
            </button>
          </div>

          <h2
            className="font-serif font-semibold tracking-[-0.015em] leading-[1.08] text-ink"
            style={{ fontSize: "clamp(2rem, 4.4vw, 3.3rem)" }}
          >
            Viewers judge the caption before they judge the take.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-sand-800">
            Watch any feed with the sound off. The clips that hold you are the
            ones where the type moves with the voice — scaled on the stressed
            word, timed to the pause. Flat auto-subtitles read as an afterthought,
            and viewers treat the clip the same way.
          </p>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-sand-800">
            CaptionsEasy treats the caption as a designed layer of the edit:
            every word gets its own timestamp, weight, and entrance.
          </p>
        </Reveal>

        <div ref={ref} className="lg:col-span-7">
          {interactiveMode ? (
            /* Split Screen Comparison Slider Mode */
            <Reveal delay={0.1}>
              <div className="rounded-2xl overflow-hidden bg-sand-100 shadow-sand-soft border border-sand-200">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden select-none bg-[#110D08]">
                  {/* Common Video Backdrop Simulation */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(130% 90% at 70% 20%, rgba(178,148,101,0.4) 0%, rgba(20,15,10,0) 60%), #120E09",
                    }}
                  />
                  {/* Speaker Silhouette */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-32 h-40 rounded-full bg-gradient-to-b from-white/20 to-transparent border border-white/10" />
                  </div>

                  {/* Layer 1: AFTER (CaptionsEasy Engine) */}
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center z-10">
                    <span
                      className={`${outfit.className} flex flex-wrap justify-center gap-x-[0.35em] gap-y-1.5 font-bold uppercase text-white`}
                      style={{ fontSize: "clamp(1rem, 2.2vw, 1.5rem)", lineHeight: 1.3 }}
                    >
                      {LINE.map((w, i) => {
                        const active = i === activeIdx;
                        return (
                          <span
                            key={w + i}
                            className={active ? anton.className : undefined}
                            style={{
                              display: "inline-block",
                              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                              color: active ? "#DCC8A4" : "#FFFFFF",
                              fontSize: active ? "1.4em" : "1em",
                              transform: active ? "scale(1.08)" : "scale(1)",
                              textShadow: active ? "0 0 20px rgba(220,200,164,0.6)" : "0 2px 4px rgba(0,0,0,0.5)",
                            }}
                          >
                            {w}
                          </span>
                        );
                      })}
                    </span>
                  </div>

                  {/* Layer 2: BEFORE (Auto Subtitles, Clipped by Slider) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#0F0C08] z-20 overflow-hidden border-r-2 border-white shadow-2xl"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <div className="absolute inset-0 w-full h-full flex items-end justify-center pb-8 px-6">
                      <span className="bg-black/80 text-white/85 text-[13px] sm:text-[15px] px-3 py-1.5 font-sans leading-snug text-center rounded">
                        {LINE.join(" ").toLowerCase()}
                      </span>
                    </div>
                    {/* Badge */}
                    <span className="absolute top-3 left-3 bg-red-950/80 text-red-200 border border-red-800/40 text-[10px] font-mono px-2 py-0.5 rounded">
                      Standard Subtitles
                    </span>
                  </div>

                  <span className="absolute top-3 right-3 z-10 bg-amber-950/80 text-amber-200 border border-amber-800/40 text-[10px] font-mono px-2 py-0.5 rounded">
                    CaptionsEasy Engine
                  </span>

                  {/* Interactive Slider Input */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                  />
                </div>
                <div className="px-5 py-3 font-mono text-[12px] text-sand-700 flex justify-between items-center bg-sand-50">
                  <span>← Drag slider to compare before & after →</span>
                  <span className="font-semibold">{sliderPos}% Auto / {100 - sliderPos}% CaptionsEasy</span>
                </div>
              </div>
            </Reveal>
          ) : (
            /* Side-by-side Dual Cards Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Before Card */}
              <Reveal delay={0.1}>
                <figure className="rounded-2xl overflow-hidden bg-sand-100 border border-sand-200 shadow-sm">
                  <div className="aspect-[4/5] relative bg-[#130F0A] flex items-end justify-center pb-10 px-4">
                    {/* Simulated Flat Video Backdrop */}
                    <div
                      className="absolute inset-0 opacity-40 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(100% 80% at 50% 30%, rgba(60,50,40,0.3) 0%, rgba(19,15,10,0) 70%)",
                      }}
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-sand-400">
                      Standard Export
                    </div>
                    <span className="relative z-10 bg-black/80 text-white/80 text-[13px] px-2.5 py-1.5 font-sans leading-snug text-center border border-white/10 rounded">
                      {LINE.join(" ").toLowerCase()}
                    </span>
                  </div>
                  <figcaption className="px-5 py-4 font-mono text-[12px] text-sand-700">
                    auto-subtitles — every clip looks like every other clip
                  </figcaption>
                </figure>
              </Reveal>

              {/* After Card */}
              <Reveal delay={0.22}>
                <figure className="rounded-2xl overflow-hidden bg-sand-100 shadow-sand-soft border border-sand-300/60">
                  <div
                    className="aspect-[4/5] relative flex items-center justify-center px-4 overflow-hidden"
                    style={{
                      background:
                        "radial-gradient(130% 90% at 65% 15%, rgba(178,148,101,0.45) 0%, rgba(20,15,10,0) 60%), #151009",
                    }}
                  >
                    {/* Speaker Contour & Light Ring */}
                    <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-32 h-44 rounded-full bg-gradient-to-b from-sand-300/30 to-transparent border border-amber-400/20" />
                    </div>

                    <div className="absolute top-3 right-3 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-2 py-0.5 rounded text-[10px] font-mono text-amber-200 font-medium">
                      CaptionsEasy Engine
                    </div>

                    <span
                      className={`${outfit.className} relative z-10 flex flex-wrap justify-center gap-x-[0.35em] gap-y-1.5 font-bold uppercase text-white text-center`}
                      style={{ fontSize: "clamp(1rem, 2vw, 1.35rem)", lineHeight: 1.3 }}
                    >
                      {LINE.map((w, i) => {
                        const active = i === activeIdx;
                        return (
                          <span
                            key={w + i}
                            className={active ? anton.className : undefined}
                            style={{
                              display: "inline-block",
                              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                              color: active ? "#DCC8A4" : "#FFFFFF",
                              fontSize: active ? "1.4em" : "1em",
                              transform: active ? "scale(1.08)" : "scale(1)",
                              textShadow: active ? "0 0 20px rgba(220,200,164,0.6)" : "0 2px 4px rgba(0,0,0,0.5)",
                            }}
                          >
                            {w}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  <figcaption className="px-5 py-4 font-mono text-[12px] text-sand-700 flex items-center justify-between">
                    <span>the same line, through the caption engine</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </figcaption>
                </figure>
              </Reveal>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
