"use client";

import React from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import { SPECIMENS, DEMO_WORDS, useWordLoop } from "./TemplateSpecimen";

function SpecimenTile({ index }: { index: number }) {
  const spec = SPECIMENS[index];
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10%" });
  // Offset each tile's loop so the wall doesn't pulse in unison
  const idx = useWordLoop(DEMO_WORDS.length, inView, 520 + (index % 4) * 90);

  return (
    <Reveal delay={(index % 3) * 0.08}>
      <div ref={ref} className="group">
        <div
          className="relative aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center px-5 text-center transition-transform duration-500 group-hover:scale-[1.015]"
          style={{
            background:
              "radial-gradient(120% 90% at 60% 10%, rgba(178,148,101,0.22) 0%, rgba(18,15,10,0) 55%), #14100A",
          }}
        >
          {spec.render(DEMO_WORDS, idx)}
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <h3 className="font-sora text-[15px] font-bold text-dune-white">{spec.name}</h3>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-sand-300">{spec.blurb}</p>
      </div>
    </Reveal>
  );
}

/**
 * Drenched sand-dark section: the template wall. Every tile is a live
 * specimen of a real render template — same demo line everywhere, so the
 * styles compare honestly.
 */
export default function TemplateGallery() {
  return (
    <section id="templates" className="py-24 sm:py-32 bg-sand-900 text-dune-white">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2
            className="font-serif font-semibold tracking-[-0.015em] leading-[1.08]"
            style={{ fontSize: "clamp(2rem, 4.4vw, 3.3rem)" }}
          >
            Eight templates. <em className="italic text-sand-300">One line, eight tempers.</em>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-sand-200">
            The same sentence, played live through every render template — because a
            style you can only judge from a thumbnail isn&rsquo;t a style you can trust.
            Each one ships with its own typography, hero-word behaviour, and motion.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {SPECIMENS.map((_, i) => (
            <SpecimenTile key={SPECIMENS[i].id} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
