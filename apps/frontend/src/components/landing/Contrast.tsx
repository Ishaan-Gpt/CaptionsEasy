"use client";

import React from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import { outfit, anton } from "./fonts";
import { useWordLoop } from "./TemplateSpecimen";

const LINE = ["Nobody", "rewatches", "a", "beige", "subtitle"];

/**
 * Tension beat: the same sentence twice — once as the flat auto-subtitle
 * every tool exports, once through the caption engine. The argument is
 * made by the artifact, not by adjectives.
 */
export default function Contrast() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15%" });
  const activeIdx = useWordLoop(LINE.length, inView, 560);

  return (
    <section id="why" className="py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <Reveal className="lg:col-span-5">
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

        <div ref={ref} className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Before */}
          <Reveal delay={0.1}>
            <figure className="rounded-2xl overflow-hidden bg-sand-100">
              <div className="aspect-[4/5] relative bg-[#1A1712] flex items-end justify-center pb-10 px-4">
                <span className="bg-black/70 text-white/85 text-[13px] px-2 py-1 font-sans leading-snug text-center">
                  {LINE.join(" ").toLowerCase()}
                </span>
              </div>
              <figcaption className="px-5 py-4 font-mono text-[12px] text-sand-700">
                auto-subtitles — every clip looks like every other clip
              </figcaption>
            </figure>
          </Reveal>

          {/* After */}
          <Reveal delay={0.22}>
            <figure className="rounded-2xl overflow-hidden bg-sand-100 shadow-sand-soft">
              <div className="aspect-[4/5] relative flex items-center justify-center px-4"
                style={{
                  background:
                    "radial-gradient(110% 80% at 65% 15%, rgba(178,148,101,0.35) 0%, rgba(26,23,18,0) 55%), #1A1712",
                }}
              >
                <span
                  className={`${outfit.className} flex flex-wrap justify-center gap-x-[0.35em] gap-y-1.5 font-bold uppercase text-white text-center`}
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
                          transform: active ? "scale(1.06)" : "scale(1)",
                        }}
                      >
                        {w}
                      </span>
                    );
                  })}
                </span>
              </div>
              <figcaption className="px-5 py-4 font-mono text-[12px] text-sand-700">
                the same line, through the caption engine
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
