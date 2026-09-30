"use client";

import React from "react";
import { Fingerprint } from "lucide-react";

export default function WisprFingerprint() {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-12 h-12 rounded-full bg-[#F0D7FF] text-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
        aria-label="Scroll to top / Wispr Flow indicator"
      >
        <Fingerprint className="w-6 h-6 stroke-[1.5]" />
      </button>
    </div>
  );
}
