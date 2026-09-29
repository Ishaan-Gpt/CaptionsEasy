"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Play, Zap, CheckCircle2, Star, Shield, Flame } from "lucide-react";

export default function Hero() {
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const demoWords = [
    { text: "Turn", highlight: false },
    { text: "talking-head", highlight: false },
    { text: "clips", highlight: false },
    { text: "into", highlight: false },
    { text: "VIRAL", highlight: true, color: "#FFA946" },
    { text: "animated", highlight: false },
    { text: "captions", highlight: true, color: "#34D399" },
    { text: "instantly!", highlight: true, color: "#F0D7FF" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % demoWords.length);
    }, 450);
    return () => clearInterval(interval);
  }, [demoWords.length]);

  return (
    <section className="relative overflow-hidden bg-[#FFFFEB] pt-12 pb-20 lg:pt-20 lg:pb-32 border-b-2 border-[#1A1A1A]">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#F0D7FF] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#34D399]/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Text Column */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#1A1A1A] bg-[#F0D7FF] shadow-[3px_3px_0px_0px_#1A1A1A]">
              <Flame className="w-4 h-4 text-[#1A1A1A] fill-[#FFA946]" />
              <span className="font-normal font-extrabold text-xs tracking-wider uppercase text-[#1A1A1A]">
                AI-Powered Kinetic Typography
              </span>
            </div>

            {/* Dual-Font Pairing Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-tight text-[#1A1A1A]">
              <span className="font-styled font-black block">
                CINEMATIC
              </span>
              <span className="font-normal font-extralight italic text-[#1A1A1A] relative inline-block bg-[#F0D7FF] px-3 py-1 rounded-xl border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#FFA946] my-2">
                captions for
              </span>{" "}
              <span className="font-styled font-extrabold text-[#1A1A1A]">
                VIRAL SHORTS
              </span>
            </h1>

            {/* Subtitle Description */}
            <p className="font-normal text-lg sm:text-xl text-[#1A1A1A]/90 max-w-2xl leading-relaxed">
              Upload any video clip. <strong className="font-bold underline decoration-[#34D399] underline-offset-4">Groq Whisper AI</strong> transcribes every word with frame-accurate timing, while our engine burns bold kinetic motion typography ready for Reels & TikTok.
            </p>

            {/* Bullet Proof Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-normal font-bold text-sm text-[#1A1A1A] pt-2">
              <div className="flex items-center gap-2 bg-[#E4E4D0]/60 p-2.5 rounded-lg border border-[#1A1A1A]">
                <CheckCircle2 className="w-5 h-5 text-[#1A1A1A] fill-[#34D399]" />
                <span>Word-Level Timing & Pacing</span>
              </div>
              <div className="flex items-center gap-2 bg-[#E4E4D0]/60 p-2.5 rounded-lg border border-[#1A1A1A]">
                <CheckCircle2 className="w-5 h-5 text-[#1A1A1A] fill-[#FFA946]" />
                <span>Remotion 4K Local Rendering</span>
              </div>
              <div className="flex items-center gap-2 bg-[#E4E4D0]/60 p-2.5 rounded-lg border border-[#1A1A1A]">
                <CheckCircle2 className="w-5 h-5 text-[#1A1A1A] fill-[#F0D7FF]" />
                <span>Supermemory Creator Memory</span>
              </div>
              <div className="flex items-center gap-2 bg-[#E4E4D0]/60 p-2.5 rounded-lg border border-[#1A1A1A]">
                <CheckCircle2 className="w-5 h-5 text-[#1A1A1A] fill-[#34D399]" />
                <span>Zero Watermark Free Tier</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Link
                href="/login?signup=true"
                className="font-normal font-extrabold text-base px-8 py-4 rounded-xl border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#34D399] transition-all flex items-center justify-center gap-3 group"
              >
                <Sparkles className="w-5 h-5 text-[#FFA946] group-hover:rotate-12 transition-transform" />
                <span>Generate Captions Free</span>
              </Link>
              
              <a
                href="#studio"
                className="font-normal font-bold text-base px-8 py-4 rounded-xl border-2 border-[#1A1A1A] bg-[#F0D7FF] text-[#1A1A1A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#FFA946] transition-all flex items-center justify-center gap-3"
              >
                <Play className="w-5 h-5 fill-[#1A1A1A]" />
                <span>Try Live Simulator</span>
              </a>
            </div>

            {/* User Trust & Social Proof */}
            <div className="flex items-center gap-4 pt-4 border-t-2 border-[#E4E4D0]/80">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-[#FFA946] border-2 border-[#1A1A1A] flex items-center justify-center font-styled font-bold text-xs">9:16</div>
                <div className="w-9 h-9 rounded-full bg-[#34D399] border-2 border-[#1A1A1A] flex items-center justify-center font-styled font-bold text-xs">4K</div>
                <div className="w-9 h-9 rounded-full bg-[#F0D7FF] border-2 border-[#1A1A1A] flex items-center justify-center font-styled font-bold text-xs">AI</div>
              </div>
              <div className="text-xs font-normal font-semibold text-[#1A1A1A]">
                <div className="flex items-center gap-1 text-[#1A1A1A]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#FFA946] text-[#1A1A1A]" />
                  ))}
                  <span className="font-bold ml-1">4.9/5</span>
                </div>
                <span>Loved by 12,000+ Short-Form Creators</span>
              </div>
            </div>

          </div>

          {/* Right Column: Live Simulated Caption Player Card */}
          <div className="lg:col-span-5 relative">
            
            {/* Phone Frame Mockup */}
            <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] bg-[#1A1A1A] p-4 rounded-[36px] border-4 border-[#1A1A1A] shadow-[12px_12px_0px_0px_#F0D7FF]">
              
              {/* Notch */}
              <div className="w-32 h-5 bg-[#1A1A1A] mx-auto rounded-b-xl mb-3 flex items-center justify-center">
                <div className="w-12 h-1.5 bg-[#E4E4D0]/30 rounded-full" />
              </div>

              {/* Video Player Display Canvas */}
              <div className="relative aspect-[9/16] bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#111111] rounded-[24px] overflow-hidden border-2 border-[#E4E4D0]/20 flex flex-col justify-between p-6">
                
                {/* Top Video Overlay Stats */}
                <div className="flex items-center justify-between text-[#FFFFEB] text-xs font-normal">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFFEB]/10 backdrop-blur-md border border-[#FFFFEB]/20">
                    <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">LIVE RENDER</span>
                  </div>
                  <span className="font-mono bg-[#1A1A1A]/80 px-2 py-0.5 rounded text-[#FFA946]">60 FPS</span>
                </div>

                {/* Simulated Creator Video Persona Avatar */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-48 h-48 rounded-full border-4 border-[#F0D7FF] flex items-center justify-center text-[#FFFFEB] font-styled text-6xl font-black">
                    ME
                  </div>
                </div>

                {/* Dynamic Subtitle Display Area */}
                <div className="relative z-10 my-auto text-center px-2 py-4 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#FFFFEB]/10">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {demoWords.map((word, idx) => {
                      const isActive = idx === activeWordIndex;
                      return (
                        <span
                          key={idx}
                          className={`inline-block px-2 py-1 rounded-lg transition-all duration-200 ${
                            isActive
                              ? "scale-110 -rotate-2 font-styled font-black text-[#1A1A1A] shadow-md"
                              : "font-normal font-bold text-[#FFFFEB]"
                          }`}
                          style={{
                            backgroundColor: isActive
                              ? word.color || "#34D399"
                              : "transparent",
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Style Pill Preset Tags */}
                <div className="relative z-10 flex items-center justify-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#34D399] text-[#1A1A1A] border border-[#1A1A1A]">
                    Kalakar
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#FFA946] text-[#1A1A1A] border border-[#1A1A1A]">
                    Minimal
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#F0D7FF] text-[#1A1A1A] border border-[#1A1A1A]">
                    Emerald
                  </span>
                </div>

              </div>

              {/* Floating Highlight Badges around Phone */}
              <div className="absolute -top-4 -right-6 bg-[#34D399] text-[#1A1A1A] font-styled font-black text-xs px-3 py-1.5 rounded-lg border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] rotate-6 hidden sm:block">
                Sub-Second Groq AI
              </div>

              <div className="absolute -bottom-4 -left-6 bg-[#FFA946] text-[#1A1A1A] font-styled font-black text-xs px-3 py-1.5 rounded-lg border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] -rotate-6 hidden sm:block">
                Frame-Accurate ASS
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
