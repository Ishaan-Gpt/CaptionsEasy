"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Type, Sparkles, Clock, Shuffle, Captions, AudioLines, Film, Wand2, LayoutTemplate, Grid3x3, Terminal, FlaskConical, ArrowRight } from "lucide-react";

interface PageEntry {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  projectTie: string;
  status: "ready" | "planned";
}

const PAGES: PageEntry[] = [
  {
    href: "/test/typography",
    title: "Typography",
    icon: Type,
    summary: "Real Remotion text rendering: fonts, weight, casing, spacing, stroke, shadow, solid vs. gradient fill.",
    projectTie: "Drives the generic caption template's payload fields in Subtitles.tsx and presets.json's typography block.",
    status: "ready",
  },
  {
    href: "/test/motion",
    title: "Motion: Springs & Easing",
    icon: Sparkles,
    summary: "Real spring() with every config param, real interpolate()/Easing curves plotted live.",
    projectTie: "Same spring() config that drives the hero-word pop and active-word bounce in every production caption template.",
    status: "ready",
  },
  {
    href: "/test/sequencing",
    title: "Sequencing & Timing",
    icon: Clock,
    summary: "<Sequence>/<Series>, from/durationInFrames, multi-layer timelines.",
    projectTie: "How caption/highlight timeline events become on-screen cards.",
    status: "ready",
  },
  {
    href: "/test/transitions",
    title: "Transitions",
    icon: Shuffle,
    summary: "@remotion/transitions: fade/wipe/slide/flip/clockWipe x spring/linear timing.",
    projectTie: "Gap: caption cards currently cut instantly with no transition — prototype for adding one.",
    status: "ready",
  },
  {
    href: "/test/captions",
    title: "Captions & Word Reveal",
    icon: Captions,
    summary: "Word-by-word reveal, hero/keyword highlight timing, @remotion/captions, SRT import.",
    projectTie: "The project's core mechanic — mirrors Subtitles.tsx's RevealLine/heroEvent logic directly.",
    status: "planned",
  },
  {
    href: "/test/audio",
    title: "Audio",
    icon: AudioLines,
    summary: "<Audio>, useAudioData, visualizeAudio, volume envelopes, trimming.",
    projectTie: "Ties to word_pacing/pause_handling in presets.json; flags waveform-reactive captions as unused capability.",
    status: "planned",
  },
  {
    href: "/test/media",
    title: "Video & Media",
    icon: Film,
    summary: "OffthreadVideo, Video, Img, staticFile, GIFs.",
    projectTie: "Gap: captions render text-only today with no background video/image layer.",
    status: "planned",
  },
  {
    href: "/test/effects",
    title: "Effects & Filters",
    icon: Wand2,
    summary: "Real CSS filters in Remotion, @remotion/noise, light leaks, 3D perspective text.",
    projectTie: "The actual technique behind cinematic_emerald's glow halo and glow_stack's backdrop blur.",
    status: "planned",
  },
  {
    href: "/test/layout",
    title: "Layout & Safe Areas",
    icon: Grid3x3,
    summary: "AbsoluteFill, safe-area/caption-box/speaker-box draggable editor, per-caption overrides.",
    projectTie: "Exact same pixel semantics as resolve_box_margins / apply_fragment_overrides and Subtitles.tsx's capBox math.",
    status: "planned",
  },
  {
    href: "/test/templates",
    title: "Templates Gallery",
    icon: LayoutTemplate,
    summary: "Live gallery of all 5 production templates, driven by the real Subtitles.tsx render branches.",
    projectTie: "Literally previews production — cannot drift from what actually ships.",
    status: "planned",
  },
  {
    href: "/test/render",
    title: "Render & Hooks",
    icon: Terminal,
    summary: "CLI render flags next to the real worker command, plus delayRender/getInputProps/measureText reference.",
    projectTie: "Compared directly against app/render/engine and ai_pipeline_stage.py.",
    status: "planned",
  },
  {
    href: "/test/playground",
    title: "Playground",
    icon: FlaskConical,
    summary: "Combine every control from every page; export a ready-to-paste presets.json entry.",
    projectTie: "Closes the loop from exploring Remotion to shipping a real preset.",
    status: "planned",
  },
];

export default function TestHubPage() {
  return (
    <div className="min-h-screen bg-[#07080A] text-white antialiased pb-16">
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-left">
            <h1 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              Remotion Capability Explorer
              <span className="text-[7.5px] bg-[#00F5C4]/15 text-[#00F5C4] border border-[#00F5C4]/20 px-2 py-0.5 rounded-full">real @remotion/player</span>
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">
              Every Remotion capability, live, tied back to CaptionsEasy&apos;s actual render pipeline
            </p>
          </div>
        </div>
        <Link href="/test/legacy" className="px-3 py-2 border border-[#23272F] rounded text-[9px] font-black uppercase tracking-wider hover:bg-white/5 cursor-pointer text-white/50 hover:border-white/30 transition-all">
          Old CSS-simulated version →
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAGES.map((page) => {
            const Icon = page.icon;
            const card = (
              <div
                className={`h-full flex flex-col gap-3 p-5 rounded-xl border transition-all ${
                  page.status === "ready"
                    ? "border-[#23272F] bg-[#0E1013] hover:border-[#FFB800]/60 cursor-pointer group"
                    : "border-[#23272F]/50 bg-[#0E1013]/40 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-[#181B21] border border-[#23272F] flex items-center justify-center text-[#FFB800]">
                    <Icon className="w-4 h-4" />
                  </div>
                  {page.status === "planned" ? (
                    <span className="text-[7px] font-bold uppercase tracking-widest text-white/30 border border-white/10 rounded-full px-2 py-0.5">
                      Planned
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#FFB800] group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wide text-white">{page.title}</h2>
                  <p className="text-[10px] text-white/50 mt-1 leading-relaxed">{page.summary}</p>
                </div>
                <div className="mt-auto pt-2 border-t border-[#23272F]/60">
                  <p className="text-[8.5px] text-[#00F5C4]/80 leading-relaxed">{page.projectTie}</p>
                </div>
              </div>
            );

            return page.status === "ready" ? (
              <Link key={page.href} href={page.href}>
                {card}
              </Link>
            ) : (
              <div key={page.href}>{card}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
