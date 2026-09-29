"use client";

import React from "react";
import Link from "next/link";

export default function WisprClosingCTA() {
  return (
    <section className="relative py-28 bg-[#1A1A1A] text-[#FFFFEB] overflow-hidden text-center flex flex-col justify-center min-h-[550px]">
      
      {/* Background Image / Motion Blur Backdrop */}
      <div 
        className="absolute inset-0 opacity-40 bg-cover bg-center filter blur-sm scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1600&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/70 to-[#1A1A1A]/90 pointer-events-none" />

      {/* Main Copy Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 space-y-8">
        
        {/* Stacked Headline */}
        <h2 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08]">
          <span className="font-styled font-normal block text-[#FFFFEB]">
            You have a story to tell.
          </span>
          <span className="font-styled font-normal text-[#FFFFEB]">
            Now,{" "}
          </span>
          <span className="font-styled italic font-light text-[#FFFFEB]">
            captivate.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="font-normal text-base sm:text-lg text-[#FFFFEB]/90 max-w-xl mx-auto leading-relaxed">
          Turn raw talking-head videos into scroll-stopping short-form content. Start creating cinematic captions today.
        </p>

        {/* CTA Button */}
        <div className="pt-4 flex justify-center">
          <Link
            href="/login?signup=true"
            className="px-7 py-3.5 rounded-xl bg-[#F0D7FF] text-[#1A1A1A] border border-[#1A1A1A] font-normal font-bold text-base flex items-center gap-2.5 hover:bg-[#F0D7FF]/80 transition-all shadow-xl hover:scale-[1.02]"
          >
            <span>✨ Create Free Captions Now</span>
          </Link>
        </div>

      </div>

    </section>
  );
}
