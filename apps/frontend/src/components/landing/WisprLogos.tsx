"use client";

import React from "react";
import { motion } from "framer-motion";

export default function WisprLogos() {
  const platforms = [
    { name: "TikTok", icon: "🎵" },
    { name: "Instagram Reels", icon: "📸" },
    { name: "YouTube Shorts", icon: "▶" },
    { name: "Remotion Engine", icon: "🎬" },
    { name: "Groq Whisper AI", icon: "⚡" },
    { name: "Supermemory AI", icon: "🧠" },
    { name: "Cloudflare Tunnels", icon: "☁" },
  ];

  return (
    <section className="bg-[#1A1A1A] text-[#FFFFEB] pt-16 pb-20 rounded-t-[40px] border-t border-[#1A1A1A] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center">
        
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="text-xs font-normal font-bold uppercase tracking-[0.2em] text-[#FFFFEB]/60 mb-10"
        >
          BUILT FOR SHORT-FORM CREATORS ON
        </motion.p>

        {/* Logo Wall Infinite Marquee Loop */}
        <div className="relative w-full overflow-hidden flex items-center">
          <div className="animate-marquee-slow flex items-center gap-12 sm:gap-20 opacity-85 text-xl sm:text-2xl font-styled font-bold shrink-0">
            {platforms.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 shrink-0 hover:scale-105 transition-transform">
                <span className="text-base">{p.icon}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>

          {/* Duplicated set for smooth seamless infinite loop */}
          <div className="animate-marquee-slow flex items-center gap-12 sm:gap-20 opacity-85 text-xl sm:text-2xl font-styled font-bold shrink-0" aria-hidden="true">
            {platforms.map((p, idx) => (
              <div key={`dup-${idx}`} className="flex items-center gap-3 shrink-0 hover:scale-105 transition-transform">
                <span className="text-base">{p.icon}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
