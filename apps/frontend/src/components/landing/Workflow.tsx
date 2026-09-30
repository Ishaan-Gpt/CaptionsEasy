"use client";

import React from "react";
import { UploadCloud, Wand2, Download, ArrowRight } from "lucide-react";

export default function Workflow() {
  const steps = [
    {
      num: "01",
      icon: UploadCloud,
      title: "Upload Talking-Head Video",
      desc: "Drag & drop MP4 or MOV clips. Supports horizontal 16:9 or vertical 9:16 portrait videos up to 4K resolution.",
      badgeColor: "#F0D7FF",
      accentColor: "#FFA946",
    },
    {
      num: "02",
      icon: Wand2,
      title: "AI Pacing & Kinetic Styling",
      desc: "Groq Whisper transcribes word timings, identifies hero emphasis words, and applies kinetic motion keyframes instantly.",
      badgeColor: "#34D399",
      accentColor: "#F0D7FF",
    },
    {
      num: "03",
      icon: Download,
      title: "Render & Viral Export",
      desc: "Download high-bitrate MP4 with burned ASS subtitles ready for TikTok, Instagram Reels, and YouTube Shorts.",
      badgeColor: "#FFA946",
      accentColor: "#34D399",
    },
  ];

  return (
    <section id="workflow" className="py-24 bg-[#FFFFEB] border-b-2 border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] bg-[#FFA946] font-normal font-extrabold text-xs uppercase tracking-wider text-[#1A1A1A]">
            <span>3 Simple Steps</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-styled font-black text-[#1A1A1A] tracking-tight">
            FROM RAW CLIP TO{" "}
            <span className="font-normal font-light italic bg-[#F0D7FF] px-3 py-0.5 rounded-xl border-2 border-[#1A1A1A]">
              viral reel in seconds
            </span>
          </h2>
          
          <p className="font-normal text-lg text-[#1A1A1A]/80">
            No complex video editing software needed. Automated pipeline turns talking heads into scroll-stopping content.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const IconComp = step.icon;
            return (
              <div
                key={idx}
                className="bg-[#FFFFEB] rounded-3xl border-4 border-[#1A1A1A] p-8 relative shadow-[6px_6px_0px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-all"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className="font-styled font-black text-3xl px-3 py-1 rounded-xl border-2 border-[#1A1A1A]"
                      style={{ backgroundColor: step.badgeColor }}
                    >
                      {step.num}
                    </span>
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[2px_2px_0px_0px_#1A1A1A]"
                      style={{ backgroundColor: step.accentColor }}
                    >
                      <IconComp className="w-6 h-6 text-[#1A1A1A]" />
                    </div>
                  </div>

                  {/* Dual Font Step Title */}
                  <h3 className="text-2xl font-styled font-extrabold text-[#1A1A1A] mb-3">
                    {step.title}
                  </h3>

                  <p className="font-normal text-base text-[#1A1A1A]/80 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#F0D7FF] flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
