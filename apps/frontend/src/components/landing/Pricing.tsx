"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, Zap, Shield } from "lucide-react";

export default function Pricing() {
  const plans = [
    {
      name: "Creator Free Tier",
      price: "$0",
      desc: "Perfect for testing clips and exploring AI motion typography.",
      bg: "#FFFFEB",
      popular: false,
      buttonText: "Start Free Now",
      buttonBg: "#F0D7FF",
      features: [
        "Groq Whisper AI Transcription",
        "5 Video Exports / month",
        "Up to 1080p Resolution",
        "Kalakar & Minimal Presets",
        "Supermemory Creator Memory",
      ],
    },
    {
      name: "Pro Creator Studio",
      price: "$19",
      desc: "Unlimited 4K exports for serious short-form video creators.",
      bg: "#F0D7FF",
      popular: true,
      buttonText: "Upgrade to Pro",
      buttonBg: "#1A1A1A",
      buttonTextColor: "#FFFFEB",
      features: [
        "Unlimited Video Exports",
        "Full 4K 60FPS Render Quality",
        "All Kinetic Motion Presets",
        "Custom Font & Brand Hex Exports",
        "Priority Remotion Local Worker Render",
        "Custom Hero-Word Rules & Presets",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#FFFFEB] border-b-2 border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] bg-[#34D399] font-normal font-extrabold text-xs uppercase tracking-wider text-[#1A1A1A]">
            <Zap className="w-4 h-4 text-[#1A1A1A]" />
            <span>Simple Transparent Pricing</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-styled font-black text-[#1A1A1A] tracking-tight">
            CHOOSE YOUR{" "}
            <span className="font-normal font-light italic bg-[#F0D7FF] px-3 py-0.5 rounded-xl border-2 border-[#1A1A1A]">
              creative plan
            </span>
          </h2>
          
          <p className="font-normal text-lg text-[#1A1A1A]/80">
            Start completely free. Upgrade anytime to unlock unlimited 4K exports and custom brand typography.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-3xl border-4 border-[#1A1A1A] p-8 flex flex-col justify-between relative transition-all ${
                plan.popular
                  ? "shadow-[10px_10px_0px_0px_#34D399] -translate-y-2"
                  : "shadow-[6px_6px_0px_0px_#1A1A1A]"
              }`}
              style={{ backgroundColor: plan.bg }}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#34D399] text-[#1A1A1A] font-styled font-black text-xs px-4 py-1.5 rounded-full border-2 border-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#1A1A1A]">
                  <Sparkles className="w-3.5 h-3.5 fill-[#1A1A1A]" />
                  <span>MOST POPULAR CHOICE</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-styled font-black text-[#1A1A1A]">
                    {plan.name}
                  </h3>
                  <p className="font-normal text-sm text-[#1A1A1A]/80 mt-1">
                    {plan.desc}
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 pt-2 border-t-2 border-[#1A1A1A]/10">
                  <span className="font-styled font-black text-5xl text-[#1A1A1A]">
                    {plan.price}
                  </span>
                  <span className="font-normal font-bold text-sm text-[#1A1A1A]/70">
                    / month
                  </span>
                </div>

                {/* Feature List */}
                <ul className="space-y-3 pt-4 border-t-2 border-[#1A1A1A]/10">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 font-normal font-semibold text-sm text-[#1A1A1A]">
                      <div className="w-5 h-5 rounded-full border border-[#1A1A1A] bg-[#34D399] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#1A1A1A]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                <Link
                  href="/login?signup=true"
                  className={`w-full py-4 rounded-xl border-2 border-[#1A1A1A] font-normal font-extrabold text-center block transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#1A1A1A] ${
                    plan.popular
                      ? "bg-[#1A1A1A] text-[#FFFFEB]"
                      : "bg-[#F0D7FF] text-[#1A1A1A]"
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
