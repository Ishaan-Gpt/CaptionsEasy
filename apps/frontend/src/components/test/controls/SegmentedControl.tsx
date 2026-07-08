"use client";

import React from "react";

interface SegmentedControlProps<T extends string> {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  formatLabel?: (option: T) => string;
}

/** Pill-group segmented selector, extracted from SidebarControlsSection.tsx's
 * alignment/color-mode selectors. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  formatLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">{label}</label>}
      <div className="flex border border-[#23272F] rounded overflow-hidden bg-[#0A0B0D] p-0.5">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex-1 py-1 px-2 text-[8px] font-bold uppercase cursor-pointer rounded transition-all whitespace-nowrap ${
              value === option ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/60 hover:text-white"
            }`}
          >
            {formatLabel ? formatLabel(option) : option}
          </button>
        ))}
      </div>
    </div>
  );
}
