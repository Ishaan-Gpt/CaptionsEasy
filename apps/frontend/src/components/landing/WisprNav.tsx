"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

function StaggerNavLink({ href, text }: { href: string; text: string }) {
  const letters = text.split("");

  return (
    <a href={href} className="relative overflow-hidden inline-flex group py-1">
      <div className="flex">
        {letters.map((char, i) => (
          <span
            key={i}
            className="inline-block transition-transform duration-300 group-hover:-translate-y-full"
            style={{ transitionDelay: `${i * 25}ms` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
      <div className="flex absolute inset-0 text-[#FFA946]">
        {letters.map((char, i) => (
          <span
            key={i}
            className="inline-block transition-transform duration-300 translate-y-full group-hover:translate-y-0"
            style={{ transitionDelay: `${i * 25}ms` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
    </a>
  );
}

export default function WisprNav() {
  const [aspectMode, setAspectMode] = useState<"vertical" | "horizontal">("vertical");

  return (
    <div className="pt-6 px-4 max-w-7xl mx-auto sticky top-0 z-50 pointer-events-auto">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-[#FFFFEB]/95 backdrop-blur-md rounded-2xl border border-[#1A1A1A]/15 px-4 py-2.5 flex items-center justify-between shadow-sm"
      >
        
        {/* Left Side: CaptionsEasy Logo & Aspect Mode Toggle */}
        <div className="flex items-center gap-6">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-styled font-bold text-2xl text-[#1A1A1A] group">
            <div className="flex items-center gap-0.5 h-6">
              <span className="w-1 bg-[#1A1A1A] h-3 rounded-full animate-bounce" />
              <span className="w-1 bg-[#FFA946] h-5 rounded-full" />
              <span className="w-1 bg-[#34D399] h-4 rounded-full animate-pulse" />
            </div>
            <span className="tracking-tight font-styled font-extrabold text-2xl group-hover:rotate-1 transition-transform">
              Captions<span className="font-normal font-light italic bg-[#F0D7FF] px-1.5 py-0.5 rounded border border-[#1A1A1A] text-lg ml-1">Easy</span>
            </span>
          </Link>

          {/* Video Aspect Ratio Mode Pill */}
          <div className="hidden sm:flex items-center bg-[#E4E4D0]/60 p-1 rounded-xl border border-[#1A1A1A]/10 text-xs font-normal font-semibold text-[#1A1A1A]">
            <button
              onClick={() => setAspectMode("vertical")}
              className={`px-3 py-1 rounded-lg transition-all ${
                aspectMode === "vertical"
                  ? "bg-[#FFFFEB] text-[#1A1A1A] shadow-sm font-bold border border-[#1A1A1A]/10 -rotate-1"
                  : "text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
              }`}
            >
              Shorts (9:16)
            </button>
            <button
              onClick={() => setAspectMode("horizontal")}
              className={`px-3 py-1 rounded-lg transition-all ${
                aspectMode === "horizontal"
                  ? "bg-[#FFFFEB] text-[#1A1A1A] shadow-sm font-bold border border-[#1A1A1A]/10 -rotate-1"
                  : "text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
              }`}
            >
              Video (16:9)
            </button>
          </div>

        </div>

        {/* Center-Right Links with Per-Letter Hover Stagger */}
        <div className="hidden md:flex items-center gap-6 font-normal font-semibold text-sm text-[#1A1A1A]">
          <StaggerNavLink href="#features" text="Features" />
          <StaggerNavLink href="#studio" text="Templates" />
          <StaggerNavLink href="#faq" text="FAQ" />
          <StaggerNavLink href="#pricing" text="Pricing" />
        </div>

        {/* Right CTA Button with Conic Gradient Rotating Border */}
        <div className="conic-glow-pill p-0.5 rounded-xl">
          <Link
            href="/login"
            className="px-4 py-2 rounded-[14px] bg-[#F0D7FF] text-[#1A1A1A] border border-[#1A1A1A] font-normal font-bold text-sm flex items-center gap-2 hover:scale-[1.03] transition-all shadow-sm"
          >
            <span>✨ Create Free Captions</span>
          </Link>
        </div>

      </motion.header>
    </div>
  );
}
