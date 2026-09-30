"use client";

import React from "react";

export default function WisprFooter() {
  const columns = [
    {
      title: "PRODUCT",
      links: [
        "Features",
        "Templates",
        "Groq Whisper AI",
        "Local Worker Engine",
        "Supermemory Brand Retention",
      ],
    },
    {
      title: "CREATORS",
      links: [
        "TikTok Shorts",
        "Instagram Reels",
        "YouTube Shorts",
        "Podcasters",
        "Educators",
      ],
    },
    {
      title: "RESOURCES",
      links: [
        "API Documentation",
        "Remotion Engine Guide",
        "ASS Subtitle Specs",
        "Local Worker Pair Setup",
        "Community Showcase",
      ],
    },
    {
      title: "COMPANY",
      links: [
        "About MotionAI",
        "Careers",
        "Privacy Policy",
        "Terms of Service",
      ],
    },
  ];

  return (
    <footer className="bg-[#FFFFEB] text-[#1A1A1A] pt-20 pb-8 border-t border-[#1A1A1A]/10 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* 4 Column Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16 pb-20">
          {columns.map((col, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="font-normal font-bold text-xs uppercase tracking-widest text-[#1A1A1A]/50">
                {col.title}
              </h4>
              <ul className="space-y-2.5 font-normal text-xs sm:text-sm text-[#1A1A1A]/80">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a href="#" className="hover:text-[#1A1A1A] hover:underline transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant CaptionsEasy Bottom Logo */}
        <div className="pt-8 border-t border-[#1A1A1A]/10 flex items-center justify-between overflow-hidden select-none">
          <div className="flex items-center gap-2 sm:gap-4 text-[#1A1A1A] w-full">
            {/* Audio Wave Icon Bars */}
            <div className="flex items-center gap-1 sm:gap-2 h-16 sm:h-28 lg:h-36 shrink-0">
              <span className="w-2 sm:w-4 bg-[#1A1A1A] h-1/2 rounded-full" />
              <span className="w-2 sm:w-4 bg-[#FFA946] h-full rounded-full" />
              <span className="w-2 sm:w-4 bg-[#34D399] h-4/5 rounded-full" />
            </div>

            {/* Giant CaptionsEasy Typography */}
            <span className="font-styled font-black text-[45px] sm:text-[90px] lg:text-[140px] leading-none tracking-tighter text-[#1A1A1A]">
              Captions<span className="font-normal font-light italic text-[#1A1A1A]">Easy</span>
            </span>
          </div>
        </div>

        {/* Legal Copyright */}
        <div className="pt-6 flex items-center justify-between text-xs font-normal text-[#1A1A1A]/60">
          <span>© {new Date().getFullYear()} MotionAI / CaptionsEasy. All rights reserved.</span>
          <span>Powered by Groq & Remotion</span>
        </div>

      </div>
    </footer>
  );
}
