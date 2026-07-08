"use client";

import React from "react";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Color swatch + hex readout, extracted from SidebarControlsSection.tsx's
 * body/gradient color rows. */
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[7px] font-bold uppercase tracking-wider text-white/40">{label}</label>
      <div className="flex gap-1.5 items-center bg-[#181B21] border border-[#23272F] p-1 rounded">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-5 bg-transparent border-0 cursor-pointer"
        />
        <span className="text-[8px] font-mono uppercase text-white/80">{value.replace("#", "")}</span>
      </div>
    </div>
  );
}
