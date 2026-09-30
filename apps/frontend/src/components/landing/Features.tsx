"use client";

import React from "react";
import { Zap, Cpu, Flame, Layers, ShieldCheck, Video, BrainCircuit, FastForward } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "Sub-Second Groq Whisper AI",
      subtitle: "Lightning Fast Speech-to-Text",
      description:
        "Transcribe long clips in under 800 milliseconds. Word-level timestamping ensures perfect synchronization with speech nuances, pauses, and inflections.",
      bg: "#FFFFEB",
      accent: "#FFA946",
      tag: "Whisper Large v3",
    },
    {
      icon: Flame,
      title: "Hero Word Emphasis Engine",
      subtitle: "Automatic Pacing & Highlighting",
      description:
        "Our creative intelligence identifies key punchlines, viral hooks, and emphasis words, automatically applying bold color keyframes to hold viewer attention.",
      bg: "#F0D7FF",
      accent: "#34D399",
      tag: "Pacing AI",
    },
    {
      icon: BrainCircuit,
      title: "Supermemory Style Retention",
      subtitle: "Always-On Creator Identity",
      description:
        "Never re-configure settings. Supermemory remembers your custom font pairs, color hexes, brand rules, and preferred preset across sessions.",
      bg: "#F0D7FF",
      accent: "#FFA946",
      tag: "User Vector Memory",
    },
    {
      icon: Video,
      title: "Remotion 4K Local Rendering",
      subtitle: "GPU-Accelerated Video Export",
      description:
        "Render high-bitrate MP4s directly on your local GPU/CPU paired worker. No server-side queue slowdowns or resolution throttling.",
      bg: "#FFFFEB",
      accent: "#34D399",
      tag: "60 FPS Output",
    },
  ];

  return (
    <section id="features" className="py-24 bg-[#FFFFEB] border-b-2 border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] bg-[#34D399] font-normal font-extrabold text-xs uppercase tracking-wider text-[#1A1A1A]">
            <FastForward className="w-4 h-4 text-[#1A1A1A]" />
            <span>Built For Short-Form Creators</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-styled font-black text-[#1A1A1A] tracking-tight">
            EVERYTHING YOU NEED TO{" "}
            <span className="font-normal font-light italic bg-[#F0D7FF] px-3 py-0.5 rounded-xl border-2 border-[#1A1A1A]">
              dominate short-form
            </span>
          </h2>
          
          <p className="font-normal text-lg text-[#1A1A1A]/80">
            CaptionsEasy combines state-of-the-art AI transcription, kinetic subtitle styling, and GPU rendering into one fluid workflow.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl border-4 border-[#1A1A1A] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#1A1A1A] flex flex-col justify-between"
                style={{ backgroundColor: item.bg }}
              >
                <div className="space-y-6">
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between">
                    <div
                      className="w-14 h-14 rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[3px_3px_0px_0px_#1A1A1A]"
                      style={{ backgroundColor: item.accent }}
                    >
                      <IconComp className="w-7 h-7 text-[#1A1A1A]" />
                    </div>
                    <span className="px-3 py-1 rounded-full border-2 border-[#1A1A1A] bg-[#FFFFEB] font-normal font-extrabold text-xs text-[#1A1A1A]">
                      {item.tag}
                    </span>
                  </div>

                  {/* Dual Typography Title */}
                  <div className="space-y-1">
                    <h3 className="text-2xl sm:text-3xl font-styled font-extrabold text-[#1A1A1A]">
                      {item.title}
                    </h3>
                    <div className="font-normal font-bold text-sm text-[#1A1A1A]/70 uppercase tracking-wider">
                      {item.subtitle}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="font-normal text-base text-[#1A1A1A]/90 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Card Footer Pill */}
                <div className="mt-8 pt-4 border-t-2 border-[#1A1A1A]/10 flex items-center gap-2 text-xs font-normal font-bold text-[#1A1A1A]">
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                  <span>Production Ready API Contract</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
