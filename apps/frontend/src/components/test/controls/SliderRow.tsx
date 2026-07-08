"use client";

import React from "react";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** Labeled range-input row: `label + value readout + slider`.
 * Extracted from the repeated pattern in SidebarControlsSection.tsx
 * (e.g. font-size, hero-size-scale rows) so every /test page shares the
 * exact same control instead of re-typing the markup. */
export function SliderRow({ label, value, min, max, step = 1, unit = "", onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
        <span>{label}</span>
        <span className="font-mono text-[#FFB800]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
      />
    </div>
  );
}
