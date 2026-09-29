"use client";

import React from "react";

export default function WisprSpeed() {
  return (
    <section className="bg-[#054033] text-[#FFFFEB] pt-20 pb-28 rounded-t-[40px] border-t border-[#054033] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 text-center">
        
        {/* Main Headline */}
        <h2 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.1]">
          <span className="font-styled font-normal">10x faster </span>
          <span className="font-styled italic font-light text-[#FFFFEB]">than manual editing</span>
        </h2>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg font-normal text-[#FFFFEB]/90 max-w-2xl mx-auto leading-relaxed">
          Manual keyframing takes hours per video. CaptionsEasy transcribes, highlights hero words, and burns ASS subtitles in under 15 seconds.
        </p>

        {/* Speed Comparison Cards Container */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch text-left">
          
          {/* Left Card: Manual Editing (120 min) */}
          <div className="md:col-span-4 bg-[#033026] rounded-3xl p-8 border border-[#FFFFEB]/10 flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="font-normal text-sm text-[#FFFFEB]/70 text-center mb-1">
                Manual Premiere / CapCut
              </div>
              <div className="font-styled text-4xl sm:text-5xl font-normal text-center text-[#FFFFEB]">
                120 min
              </div>
            </div>

            <div className="text-xs font-normal text-[#FFFFEB]/40 pt-12">
              ... Manually creating text layers, dragging keyframes, fixing typos ...
            </div>
          </div>

          {/* Right Card: CaptionsEasy AI (15 sec) */}
          <div className="md:col-span-8 relative bg-gradient-to-br from-[#0B5E4C] to-[#043328] rounded-3xl p-8 border border-[#FFFFEB]/20 flex flex-col justify-between min-h-[320px] overflow-hidden shadow-2xl">
            
            {/* Background Blur Video Simulator Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#34D399]/20 via-transparent to-transparent pointer-events-none" />

            <div>
              <div className="font-normal text-sm text-[#FFFFEB]/80 text-center mb-1 relative z-10">
                CaptionsEasy AI Engine
              </div>
              <div className="font-styled text-5xl sm:text-6xl font-normal text-center text-[#FFFFEB] relative z-10">
                15 sec
              </div>
            </div>

            {/* Curved Animated Text Ribbon Overlay Across Card */}
            <div className="my-auto relative z-10 py-6">
              <p className="font-normal text-sm sm:text-base text-[#FFFFEB] tracking-wide leading-relaxed transform -rotate-1 text-center bg-[#054033]/60 backdrop-blur-md p-4 rounded-2xl border border-[#FFFFEB]/10 font-bold">
                Groq Whisper word timing + Kalakar pop keyframes + 4K Remotion GPU render ready!
              </p>
            </div>

            {/* Central Dark Waveform Capsule Indicator */}
            <div className="mx-auto bg-[#1A1A1A] px-6 py-2.5 rounded-full border border-[#FFFFEB]/20 flex items-center gap-1.5 relative z-10 shadow-lg">
              <span className="w-1 bg-[#FFFFEB] h-3 rounded-full animate-pulse" />
              <span className="w-1 bg-[#34D399] h-5 rounded-full" />
              <span className="w-1 bg-[#FFA946] h-4 rounded-full" />
              <span className="w-1 bg-[#34D399] h-6 rounded-full animate-bounce" />
              <span className="w-1 bg-[#FFFFEB] h-4 rounded-full" />
              <span className="w-1 bg-[#FFFFEB] h-2 rounded-full" />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
