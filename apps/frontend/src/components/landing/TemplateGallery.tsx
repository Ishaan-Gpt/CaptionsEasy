"use client";

import React, { useState } from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import { SPECIMENS, DEMO_WORDS, useWordLoop } from "./TemplateSpecimen";

// Theme color accents per specimen tile
const SPECIMEN_ACCENTS: Record<string, { bg: string; accent: string }> = {
  hormozi_viral: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(255,230,0,0.25) 0%, rgba(20,18,8,0) 60%), #141208",
    accent: "#FFE600",
  },
  mrbeast_punch: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(0,245,255,0.25) 0%, rgba(8,20,25,0) 60%), #081419",
    accent: "#00F5FF",
  },
  cyber_neon: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(255,0,127,0.25) 0%, rgba(25,8,18,0) 60%), #190812",
    accent: "#FF007F",
  },
  tiktok_pop: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(118,255,3,0.25) 0%, rgba(12,22,8,0) 60%), #0C1608",
    accent: "#76FF03",
  },
  minimal_luxe: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(229,193,88,0.25) 0%, rgba(22,18,10,0) 60%), #16120A",
    accent: "#E5C158",
  },
  vintage_cinematic: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(140,255,62,0.25) 0%, rgba(12,22,8,0) 60%), #0A1407",
    accent: "#8CFF3E",
  },
  bold_impact: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(255,87,34,0.25) 0%, rgba(25,12,8,0) 60%), #190C08",
    accent: "#FF5722",
  },
  staggered_splash: {
    bg: "radial-gradient(130% 90% at 60% 10%, rgba(197,255,0,0.25) 0%, rgba(18,22,8,0) 60%), #121608",
    accent: "#C5FF00",
  },
};

function SpecimenTile({ index }: { index: number }) {
  const spec = SPECIMENS[index];
  const theme = SPECIMEN_ACCENTS[spec.id] || SPECIMEN_ACCENTS.sentence_clean;
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10%" });
  const [isHovered, setIsHovered] = useState(false);

  // Offset each tile's loop so the wall doesn't pulse in unison
  const idx = useWordLoop(DEMO_WORDS.length, inView, 520 + (index % 4) * 90);

  return (
    <Reveal delay={(index % 3) * 0.08}>
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative cursor-pointer"
      >
        <div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center px-5 text-center transition-all duration-500 group-hover:scale-[1.02] border border-white/10 group-hover:border-white/25 shadow-lg"
          style={{ background: theme.bg }}
        >
          {/* Simulated Speaker Contour backdrop */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="w-24 h-32 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
          </div>

          {/* Top Pill / Active Audio Indicator */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
            <span className="font-mono text-[9px] text-white/60 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
              Style 0{index + 1}
            </span>

            {/* Audio Wave Bar */}
            <div className="flex items-end gap-0.5 h-3">
              {[60, 100, 40].map((h, bi) => (
                <span
                  key={bi}
                  className="w-0.5 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: theme.accent,
                    height: `${(h * ((idx % 3) + 1)) / 3}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Render Active Template Specimen */}
          <div className="relative z-10">{spec.render(DEMO_WORDS, idx)}</div>

          {/* Hover Glow Highlight */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${theme.accent}15, transparent 70%)`,
            }}
          />
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-3">
          <h3 className="font-sora text-[15px] font-bold text-dune-white group-hover:text-white transition-colors">
            {spec.name}
          </h3>
          <span className="font-mono text-[10px] text-sand-400 opacity-80">Remotion 4K</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-sand-300">{spec.blurb}</p>
      </div>
    </Reveal>
  );
}

/**
 * Drenched sand-dark section: the template wall. Every tile is a live
 * specimen of a real render template with video backdrop styling.
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
