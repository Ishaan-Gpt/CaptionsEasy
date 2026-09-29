"use client";

import React from "react";

export default function WisprLanguages() {
  return (
    <section className="py-24 bg-[#FFFFEB] text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 space-y-24">
        
        {/* Top Subsection: 100+ Languages & Hinglish */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Card: Language Hinglish Pill + Arc Text */}
          <div className="lg:col-span-6">
            <div className="bg-[#E4E4D0]/80 rounded-3xl p-10 border border-[#1A1A1A]/10 relative min-h-[260px] flex flex-col justify-center items-center shadow-sm overflow-hidden">
              
              {/* Language Selector Pill Badge */}
              <div className="bg-[#FFFFEB] border border-[#1A1A1A]/15 px-6 py-3 rounded-full flex items-center gap-3 shadow-md relative z-10">
                <span className="font-normal font-semibold text-sm text-[#1A1A1A]">
                  Language: <strong className="font-bold">Hinglish / English / Hindi</strong>
                </span>
                {/* Indian Flag Circle */}
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#1A1A1A]/20 flex flex-col shrink-0">
                  <span className="h-1/3 bg-[#FF9933]" />
                  <span className="h-1/3 bg-[#FFFFFF]" />
                  <span className="h-1/3 bg-[#138808]" />
                </div>
              </div>

              {/* Arc Curved Text at Bottom of Card */}
              <div className="mt-8 relative z-10 w-full text-center">
                <p className="font-normal text-xs sm:text-sm text-[#1A1A1A]/70 transform rotate-[-2deg] tracking-wide font-bold">
                  Bhai yeh subtitles automatic generate ho gaye! Speech-to-text timing is sub-second...
                </p>
              </div>

            </div>
          </div>

          {/* Right Text Column: 100+ Languages */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-styled font-normal text-[#1A1A1A]">
              100+ Languages & Hinglish
            </h2>
            <p className="font-normal text-lg text-[#1A1A1A]/80 leading-relaxed max-w-lg">
              CaptionsEasy automatically detects and transcribes your audio, handling accents, regional dialects, and code-switching between languages seamlessly.
            </p>
          </div>

        </div>

        {/* Bottom Subsection: Supermemory remembers your brand */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 hidden lg:block" />

          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-styled font-light text-[#1A1A1A]/50">
              Supermemory remembers your brand
            </h2>
            <p className="font-normal text-base text-[#1A1A1A]/60 leading-relaxed max-w-lg">
              CaptionsEasy learns your preferred font pairings, brand color hexes, and caption placement rules automatically. You never have to re-configure settings.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
