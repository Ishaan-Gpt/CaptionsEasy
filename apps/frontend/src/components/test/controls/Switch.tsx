"use client";

import React from "react";

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Pill toggle switch, extracted from the repeated pattern in
 * SidebarControlsSection.tsx (underline/stroke/shadow toggles). */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white">{label}</span>
        {description && <span className="text-[7px] text-white/40 uppercase tracking-wider">{description}</span>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
          checked ? "bg-[#FFB800]" : "bg-[#23272F]"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
