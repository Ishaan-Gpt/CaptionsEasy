"use client";

import React, { useState } from "react";
import { Sparkles, Play, Pause, RefreshCw, Sliders, Layers, Cpu, Check } from "lucide-react";

type StylePreset = "kalakar" | "emerald" | "amber" | "lavender";

export default function CaptionStudio() {
  const [selectedPreset, setSelectedPreset] = useState<StylePreset>("kalakar");
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeWordIdx, setActiveWordIdx] = useState(1);

  const sampleCaptions = [
    { text: "STOP", hero: true, color: "#FFA946" },
    { text: "wasting", hero: false },
    { text: "hours", hero: false },
    { text: "editing", hero: false },
    { text: "SUBTITLES", hero: true, color: "#34D399" },
    { text: "manually.", hero: false },
    { text: "CaptionsEasy", hero: true, color: "#F0D7FF" },
    { text: "automates", hero: false },
    { text: "EVERYTHING", hero: true, color: "#FFA946" },
    { text: "in seconds!", hero: true, color: "#34D399" },
  ];

  const presets = [
    {
      id: "kalakar",
      name: "Kalakar High-Impact",
      bg: "#1A1A1A",
      textColor: "#FFFFEB",
      heroBg: "#FFA946",
      heroText: "#1A1A1A",
      tagBg: "#F0D7FF",
      desc: "Bold high-contrast pop keyframes designed for viral TikTok hooks.",
    },
    {
      id: "emerald",
      name: "Emerald Kinetic",
      bg: "#FFFFEB",
      textColor: "#1A1A1A",
      heroBg: "#34D399",
      heroText: "#1A1A1A",
      tagBg: "#34D399",
      desc: "Clean modern aesthetic with vivid green emphasis highlights.",
    },
    {
      id: "amber",
      name: "Amber Warm Glow",
      bg: "#FFFFEB",
      textColor: "#1A1A1A",
      heroBg: "#FFA946",
      heroText: "#1A1A1A",
      tagBg: "#FFA946",
      desc: "Energetic orange accents tailored for YouTube Shorts & Reels.",
    },
    {
      id: "lavender",
      name: "Soft Lavender Minimal",
      bg: "#F0D7FF",
      textColor: "#1A1A1A",
      heroBg: "#1A1A1A",
      heroText: "#FFFFEB",
      tagBg: "#E4E4D0",
      desc: "Sophisticated pastel background with sharp black typography.",
    },
  ];

  const currentPresetObj = presets.find((p) => p.id === selectedPreset) || presets[0];

  return (
    <section id="studio" className="py-20 bg-[#FFFFEB] border-b-2 border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Dual Font */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] bg-[#F0D7FF] font-normal font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#1A1A1A] fill-[#FFA946]" />
            <span>Interactive Preset Simulator</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-styled font-black text-[#1A1A1A] tracking-tight">
            TEST KINETIC CAPTION{" "}
            <span className="font-normal font-light italic bg-[#F0D7FF] px-3 py-0.5 rounded-xl border-2 border-[#1A1A1A]">
              templates live
            </span>
          </h2>
          <p className="font-normal text-lg text-[#1A1A1A]/80">
            Click through our preset motion typography templates below to see how word-level timing and hero word highlights adapt in real time.
          </p>
        </div>

        {/* Interactive Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Preset Selection Controls Column */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-center">
            <div className="font-styled font-extrabold text-xl text-[#1A1A1A] mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#34D399]" />
              <span>Choose Motion Preset:</span>
            </div>

            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id as StylePreset)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start justify-between gap-4 ${
                    isSelected
                      ? "bg-[#F0D7FF] border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] -translate-y-0.5"
                      : "bg-[#FFFFEB] border-[#1A1A1A] hover:bg-[#E4E4D0]/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-styled font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                      <span>{preset.name}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-normal font-extrabold bg-[#34D399] text-[#1A1A1A] border border-[#1A1A1A]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="font-normal text-xs text-[#1A1A1A]/80">
                      {preset.desc}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 bg-[#FFFFEB]">
                    {isSelected && <Check className="w-4 h-4 text-[#1A1A1A]" />}
                  </div>
                </button>
              );
            })}

            {/* AI Customization Callout */}
            <div className="p-4 rounded-xl border-2 border-[#1A1A1A] bg-[#E4E4D0] mt-4 flex items-center gap-3">
              <Cpu className="w-6 h-6 text-[#1A1A1A] shrink-0" />
              <p className="font-normal text-xs text-[#1A1A1A] font-semibold">
                Supermemory automatically stores your custom font, color hexes, and size preferences for future exports!
              </p>
            </div>

          </div>

          {/* Live Simulator Viewport Column */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="h-full rounded-3xl border-4 border-[#1A1A1A] bg-[#1A1A1A] p-6 shadow-[10px_10px_0px_0px_#34D399] flex flex-col justify-between relative overflow-hidden">
              
              {/* Studio Header Bar */}
              <div className="flex items-center justify-between border-b border-[#FFFFEB]/20 pb-4 mb-6 text-[#FFFFEB]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FFA946]" />
                    <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                    <div className="w-3 h-3 rounded-full bg-[#F0D7FF]" />
                  </div>
                  <span className="font-mono text-xs text-[#E4E4D0]">
                    PRESET: <span className="font-bold text-[#FFA946] uppercase">{selectedPreset}</span>
                  </span>
                </div>
                
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 rounded-lg border-2 border-[#FFFFEB] bg-[#FFFFEB] text-[#1A1A1A] font-normal font-bold text-xs flex items-center gap-1.5 hover:bg-[#34D399] transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? "Pause Preview" : "Play Preview"}</span>
                </button>
              </div>

              {/* Subtitle Render Canvas Container */}
              <div
                className="flex-1 min-h-[300px] rounded-2xl p-8 border-2 border-[#FFFFEB]/20 flex items-center justify-center text-center transition-colors duration-300"
                style={{ backgroundColor: currentPresetObj.bg }}
              >
                <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl">
                  {sampleCaptions.map((word, idx) => {
                    const isCurrent = idx === activeWordIdx;
                    return (
                      <span
                        key={idx}
                        className={`inline-block px-3 py-1.5 rounded-xl transition-all duration-300 ${
                          isCurrent
                            ? "scale-125 -rotate-3 font-styled font-black shadow-lg"
                            : word.hero
                            ? "font-styled font-extrabold"
                            : "font-normal font-bold"
                        }`}
                        style={{
                          backgroundColor: isCurrent
                            ? currentPresetObj.heroBg
                            : word.hero
                            ? word.color
                            : "transparent",
                          color: isCurrent
                            ? currentPresetObj.heroText
                            : currentPresetObj.textColor,
                          border: isCurrent ? "2px solid #1A1A1A" : "none",
                        }}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Simulator Inspector Controls */}
              <div className="mt-6 pt-4 border-t border-[#FFFFEB]/20 flex flex-wrap items-center justify-between text-[#FFFFEB] text-xs font-normal gap-4">
                <div className="flex items-center gap-4">
                  <span>Pacing: <strong className="text-[#34D399]">140 WPM</strong></span>
                  <span>Provider: <strong className="text-[#FFA946]">Groq Whisper</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
                  <span className="font-mono text-[11px] text-[#E4E4D0]">Frame: 00:04.12</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
