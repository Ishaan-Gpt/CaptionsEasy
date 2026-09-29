"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WisprFeatureTabs() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const tabs = [
    {
      title: "Groq Whisper Timestamps",
      desc: "Sub-second word-level audio alignment ensures every single word is synchronized to your voice down to the exact frame.",
      captions: [
        { text: "STOP", hero: true, color: "#FFA946" },
        { text: "wasting", hero: false },
        { text: "hours", hero: false },
        { text: "editing", hero: false },
        { text: "SUBTITLES", hero: true, color: "#34D399" },
        { text: "manually.", hero: false },
      ],
    },
    {
      title: "Hero Word Highlighting",
      desc: "Our creative AI detects punchlines, viral hooks, and emphasis tokens, applying energetic color keyframes automatically.",
      captions: [
        { text: "CaptionsEasy", hero: true, color: "#F0D7FF" },
        { text: "highlights", hero: false },
        { text: "VIRAL", hero: true, color: "#FFA946" },
        { text: "HOOKS", hero: true, color: "#34D399" },
        { text: "instantly!", hero: false },
      ],
    },
    {
      title: "Local Worker Render",
      desc: "Offloads 4K 60FPS video rendering to your paired local computer via Cloudflare Quick Tunnels — no server queue slowdowns!",
      captions: [
        { text: "RENDER", hero: true, color: "#34D399" },
        { text: "4K", hero: true, color: "#FFA946" },
        { text: "60 FPS", hero: true, color: "#F0D7FF" },
        { text: "videos", hero: false },
        { text: "locally!", hero: false },
      ],
    },
  ];

  return (
    <section className="py-24 bg-[#FFFFEB] text-[#1A1A1A] relative overflow-hidden">
      
      {/* Curved background wave aesthetic */}
      <div className="absolute right-[-20%] bottom-[-10%] w-[800px] h-[800px] bg-[#F0D7FF]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Vertical Menu with Active Line */}
          <div className="lg:col-span-4 space-y-6">
            <div className="border-l-2 border-[#1A1A1A]/20 pl-4 space-y-6">
              {tabs.map((tab, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`block text-left w-full transition-all relative font-styled text-xl sm:text-2xl ${
                      isActive
                        ? "text-[#1A1A1A] font-normal"
                        : "text-[#1A1A1A]/40 font-light hover:text-[#1A1A1A]/70"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeTabLineCaptions"
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#FFA946] rounded-full"
                      />
                    )}
                    {tab.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: Scrollytelling Pinned Phone / Caption Frame */}
          <div className="lg:col-span-4 flex justify-center">
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-[340px] bg-gradient-to-b from-[#1A1A1A] via-[#2A2A2A] to-[#111111] rounded-[32px] p-6 shadow-2xl border-4 border-[#1A1A1A] relative overflow-hidden min-h-[460px] flex flex-col justify-between"
            >
              
              {/* Phone Top Bar */}
              <div className="flex items-center justify-between text-[#FFFFEB] text-xs font-normal">
                <span className="bg-[#FFFFEB]/10 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold text-[#34D399]">
                  ● LIVE CAPTION ENGINE
                </span>
                <span className="font-mono text-[#FFA946]">60 FPS</span>
              </div>

              {/* Dynamic Kinetic Subtitle Words */}
              <div className="relative z-10 my-auto text-center px-2 py-4 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#FFFFEB]/10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {tabs[activeTab].captions.map((word, idx) => (
                      <span
                        key={idx}
                        className={`inline-block px-2.5 py-1 rounded-xl font-styled font-black text-lg transition-transform ${
                          word.hero
                            ? "-rotate-2 scale-110 border border-[#1A1A1A]"
                            : "text-[#FFFFEB]"
                        }`}
                        style={{
                          backgroundColor: word.hero ? word.color : "transparent",
                          color: word.hero ? "#1A1A1A" : "#FFFFEB",
                        }}
                      >
                        {word.text}
                      </span>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Floating "Hero Word Identified" Pill Badge with Bouncy -4° Rotation */}
              <div className="relative z-10 flex flex-col items-center gap-2 pt-6">
                <motion.div
                  animate={{ rotate: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-[#FFA946] text-[#1A1A1A] font-normal font-bold text-xs px-4 py-1.5 rounded-full border border-[#1A1A1A] shadow-md hover:scale-105"
                >
                  Hero Word Identified
                </motion.div>

                {/* Dark Waveform Indicator */}
                <div className="bg-[#1A1A1A] text-[#FFFFEB] px-4 py-1.5 rounded-full border border-[#FFFFEB]/20 flex items-center gap-3 text-xs shadow-lg">
                  <span className="text-[#34D399]">✓ ASS Burner Ready</span>
                </div>
              </div>

            </motion.div>
          </div>

          {/* Right Column: Active Tab Description */}
          <div className="lg:col-span-4 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-3xl sm:text-4xl font-styled font-normal text-[#1A1A1A]">
                  {tabs[activeTab].title}
                </h3>
                <p className="font-normal text-base text-[#1A1A1A]/80 leading-relaxed">
                  {tabs[activeTab].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
