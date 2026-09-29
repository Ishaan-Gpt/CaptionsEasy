"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function WisprHero() {
  const [toastIndex, setToastIndex] = useState(0);

  const toasts = [
    {
      raw: "Hey guys so um basically here is how you build a viral short form video...",
      polished: "BUILD VIRAL SHORT-FORM VIDEOS IN SECONDS!",
      heroWord: "VIRAL",
      color: "#FFA946",
      tag: "Raw Talking Head → Kinetic Motion",
    },
    {
      raw: "Stop wasting like 2 hours keyframing subtitles manually in Premiere Pro...",
      polished: "STOP WASTING HOURS EDITING SUBTITLES!",
      heroWord: "SUBTITLES",
      color: "#34D399",
      tag: "Groq AI Sub-Second Timestamps",
    },
    {
      raw: "CaptionsEasy automatically detects punchlines and highlights hero words...",
      polished: "AUTOMATIC HERO WORD HIGHLIGHTS & POP KEYFRAMES",
      heroWord: "HERO WORDS",
      color: "#F0D7FF",
      tag: "Supermemory Style Retention",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setToastIndex((prev) => (prev + 1) % toasts.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [toasts.length]);

  return (
    <section className="relative min-h-[85vh] bg-[#FFFFEB] pt-12 pb-24 flex flex-col justify-between overflow-hidden">
      
      {/* Infinite SVG Text Marquee at 25% Opacity */}
      <div className="absolute left-[-10%] top-[5%] w-[650px] h-[650px] pointer-events-none opacity-25 select-none z-0">
        <svg viewBox="0 0 500 500" className="w-full h-full animate-[spin_50s_linear_infinite]">
          <path
            id="spiralPathCaptions"
            d="M 250, 250 m -180, 0 a 180,180 0 1,1 360,0 a 180,180 0 1,1 -360,0"
            fill="none"
          />
          <text className="text-[14px] font-normal tracking-wide fill-[#1A1A1A]">
            <textPath href="#spiralPathCaptions" startOffset="0%">
              ... Groq Whisper word timing ... Kalakar kinetic motion typography ... Remotion 4K render engine ... Supermemory creator brand retention ... Hinglish & 100+ languages ...
            </textPath>
          </text>
        </svg>
      </div>

      {/* Main Hero Copy Content */}
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10 my-auto pt-6">
        
        {/* Main Stacked Headline with Gradient Text Sweep */}
        <motion.h1
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.06, ease: "easeOut" }}
          className="text-6xl sm:text-7xl lg:text-8xl tracking-tight text-[#1A1A1A] leading-[1.05]"
        >
          <span className="font-styled block font-normal text-[#1A1A1A]">
            Don’t edit,
          </span>
          <span className="font-styled italic block font-light gradient-text-sweep py-1">
            just upload.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
          className="mt-8 text-lg sm:text-xl font-normal text-[#1A1A1A]/80 max-w-xl mx-auto leading-relaxed"
        >
          The AI caption generator that turns talking-head clips into cinematic animated motion typography for Reels, Shorts, and TikTok.
        </motion.p>

        {/* Looping Product Demo — Animated Before/After Speech Toasts */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.22, ease: "easeOut" }}
          className="mt-8 max-w-md mx-auto min-h-[110px]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={toastIndex}
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="bg-[#FFFFEB] border-2 border-[#1A1A1A] p-4 rounded-2xl shadow-[4px_4px_0px_0px_#FFA946] text-left relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
                <span className="bg-[#F0D7FF] px-2 py-0.5 rounded border border-[#1A1A1A]">
                  {toasts[toastIndex].tag}
                </span>
                <span className="text-[#34D399] flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" /> Groq AI
                </span>
              </div>
              <p className="text-xs text-[#1A1A1A]/50 line-through mb-1">
                &ldquo;{toasts[toastIndex].raw}&rdquo;
              </p>
              <p className="text-sm font-black font-styled text-[#1A1A1A]">
                &ldquo;{toasts[toastIndex].polished}&rdquo;
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Center CTA Button */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="conic-glow-pill p-0.5 rounded-xl">
            <Link
              href="/login?signup=true"
              className="px-7 py-3.5 rounded-[14px] bg-[#F0D7FF] text-[#1A1A1A] border border-[#1A1A1A] font-normal font-bold text-base flex items-center gap-2.5 hover:scale-[1.03] transition-all shadow-md"
            >
              <span>✨ Generate Free Captions Now</span>
            </Link>
          </div>

          <span className="text-xs font-normal text-[#1A1A1A]/60">
            Export ready in 9:16 vertical & 16:9 widescreen MP4s
          </span>
        </motion.div>

      </div>

      {/* Diagonal Black Ribbon Marquee */}
      <div className="relative w-full mt-12 overflow-hidden py-4">
        <div className="w-[120%] -ml-[10%] rotate-[-2.5deg] bg-[#1A1A1A] text-[#FFFFEB] py-3.5 border-y border-[#1A1A1A] shadow-xl overflow-hidden flex items-center">
          
          <div className="animate-marquee-slow flex items-center gap-6 shrink-0">
            <div className="px-4 py-2 rounded-full bg-[#FFFFEB] text-[#1A1A1A] border border-[#1A1A1A] flex items-center gap-1 shrink-0 shadow-sm ml-4 font-bold text-xs">
              <span>00:04.12</span>
            </div>

            <span className="font-normal font-medium text-sm sm:text-base tracking-wide whitespace-nowrap">
              &quot;STOP WASTING HOURS EDITING SUBTITLES MANUALLY!&quot; → KALAKAR MOTION PRESET → 60 FPS 4K RENDER
            </span>

            <div className="px-4 py-2 rounded-full bg-[#34D399] text-[#1A1A1A] border border-[#1A1A1A] flex items-center gap-1 shrink-0 shadow-sm font-bold text-xs">
              <span>GROQ WHISPER AI</span>
            </div>

            <span className="font-normal font-medium text-sm sm:text-base tracking-wide whitespace-nowrap">
              AUTOMATIC HERO WORD HIGHLIGHTS · SUB-SECOND TIMING · REMOTION RENDER ENGINE
            </span>
          </div>

          {/* Duplicated for smooth loop */}
          <div className="animate-marquee-slow flex items-center gap-6 shrink-0" aria-hidden="true">
            <div className="px-4 py-2 rounded-full bg-[#FFFFEB] text-[#1A1A1A] border border-[#1A1A1A] flex items-center gap-1 shrink-0 shadow-sm ml-4 font-bold text-xs">
              <span>00:04.12</span>
            </div>

            <span className="font-normal font-medium text-sm sm:text-base tracking-wide whitespace-nowrap">
              &quot;STOP WASTING HOURS EDITING SUBTITLES MANUALLY!&quot; → KALAKAR MOTION PRESET → 60 FPS 4K RENDER
            </span>

            <div className="px-4 py-2 rounded-full bg-[#34D399] text-[#1A1A1A] border border-[#1A1A1A] flex items-center gap-1 shrink-0 shadow-sm font-bold text-xs">
              <span>GROQ WHISPER AI</span>
            </div>

            <span className="font-normal font-medium text-sm sm:text-base tracking-wide whitespace-nowrap">
              AUTOMATIC HERO WORD HIGHLIGHTS · SUB-SECOND TIMING · REMOTION RENDER ENGINE
            </span>
          </div>

        </div>
      </div>

    </section>
  );
}
