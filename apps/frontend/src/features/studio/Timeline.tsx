"use client";

import React from "react";
import type { Page } from "@capseasy/shared";
import { fmtTime } from "./controls";

interface Props {
  pages: Page[];
  durationMs: number;
  timeMs: number;
  onSeek: (ms: number) => void;
}

/** Overview strip: one block per caption card across the whole video; click anywhere to jump. */
export const Timeline: React.FC<Props> = ({ pages, durationMs, timeMs, onSeek }) => {
  const total = Math.max(1, durationMs);
  return (
    <div className="border-t border-white/10 bg-[#141414] px-4 py-3">
      <div
        className="relative h-10 cursor-pointer rounded-lg bg-white/5"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * total);
        }}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(timeMs)}
        tabIndex={0}
      >
        {pages.map((p) => (
          <div
            key={p.id}
            title={p.words.map((w) => w.text).join(" ")}
            className={`absolute top-1 bottom-1 overflow-hidden rounded-md px-1 text-[10px] leading-8 ${timeMs >= p.startMs && timeMs < p.endMs ? "bg-emerald-500 text-black" : "bg-white/15 text-white/70 hover:bg-white/25"}`}
            style={{ left: `${(p.startMs / total) * 100}%`, width: `max(3px, ${((p.endMs - p.startMs) / total) * 100}%)` }}
          >
            <span className="whitespace-nowrap">{p.words.map((w) => w.text).join(" ")}</span>
          </div>
        ))}
        <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${Math.min(100, (timeMs / total) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/40">
        <span>{fmtTime(timeMs)}</span>
        <span>{fmtTime(total)}</span>
      </div>
    </div>
  );
};
