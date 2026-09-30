"use client";

import React, { useState } from "react";

export default function WisprFAQ() {
  const [activeIdx, setActiveIdx] = useState(0);

  const faqs = [
    {
      q: "Will CaptionsEasy work with vertical 9:16 Shorts, Reels, and TikToks?",
      a: "Yes! CaptionsEasy is optimized specifically for short-form portrait video (9:16) as well as traditional widescreen (16:9). All kinetic motion keyframes adjust dynamically to fit your video framing.",
    },
    {
      q: "How is CaptionsEasy different from basic CapCut or Premiere captions?",
      a: "Standard video editors apply plain static text. CaptionsEasy uses Groq Whisper AI for sub-second word timing, automatically highlights high-impact hero words with custom pop keyframes, and remembers your brand identity via Supermemory.",
    },
    {
      q: "Do I need a high-end GPU or cloud server to render videos?",
      a: "No! CaptionsEasy features a local-worker engine that pairs with your computer using Cloudflare Quick Tunnels. Heavy Remotion 4K video rendering happens directly on your GPU/CPU without waiting in long cloud queue lines.",
    },
    {
      q: "Can I customize the font, colors, and keyframe animations?",
      a: "Absolutely. You can choose from presets like Kalakar, Minimal, Emerald, and Amber, or define your own font pairs and brand hex colors. Supermemory saves your preferences so every future export inherits your brand style.",
    },
    {
      q: "Does it support Hindi, Hinglish, and regional accents?",
      a: "Yes. Groq Whisper AI handles accent variations, fast-talking creators, background noise, and multi-language code-switching (like Hinglish) with sub-frame accuracy.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-[#FFFFEB] text-[#1A1A1A]">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Section Headline */}
        <div className="text-center mb-12">
          <h2 className="text-5xl sm:text-6xl font-styled font-normal italic text-[#1A1A1A]">
            Good questions.
          </h2>
        </div>

        {/* Outer Split Container Card */}
        <div className="bg-[#E4E4D0]/60 rounded-3xl p-6 sm:p-8 border border-[#1A1A1A]/10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Questions List Card */}
            <div className="lg:col-span-6 bg-[#054033] text-[#FFFFEB] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="font-styled font-normal text-2xl mb-6 text-[#FFFFEB]">
                  Questions
                </h3>

                <div className="space-y-3">
                  {faqs.map((faq, idx) => {
                    const isActive = activeIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        className={`w-full text-left p-4 rounded-xl font-normal text-sm sm:text-base transition-all ${
                          isActive
                            ? "bg-[#0A5444] text-[#FFFFEB] font-bold border border-[#FFFFEB]/20 shadow-md"
                            : "text-[#FFFFEB]/80 hover:text-[#FFFFEB] hover:bg-[#0A5444]/40"
                        }`}
                      >
                        {faq.q}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Active Answer View */}
            <div className="lg:col-span-6 flex flex-col justify-between p-2 sm:p-4 space-y-6">
              
              <div>
                <div className="font-normal text-xs uppercase tracking-wider text-[#1A1A1A]/50 mb-2 font-semibold">
                  Answer
                </div>
                
                {/* Active Question Title Repeated */}
                <div className="font-normal text-sm text-[#1A1A1A]/60 text-right mb-6">
                  {faqs[activeIdx].q}
                </div>

                {/* White Speech Bubble Card */}
                <div className="bg-[#FFFFEB] p-6 rounded-2xl border border-[#1A1A1A]/10 shadow-md text-sm sm:text-base font-normal text-[#1A1A1A]/90 leading-relaxed">
                  {faqs[activeIdx].a}
                </div>
              </div>

              {/* Bottom Small Logo Badge */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#054033] text-[#FFFFEB] flex items-center justify-center font-styled font-bold text-xs">
                  |||
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
