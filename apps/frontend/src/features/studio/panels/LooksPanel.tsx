"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LOOKS, loadFontFamily, lookCategories, type LookDefinition } from "@capseasy/templates";

interface Props {
  currentLookId: string | null;
  onChoose: (look: LookDefinition) => void;
}

function swatchStyle(look: LookDefinition): React.CSSProperties {
  const s = look.style;
  const fill = s.fill.type === "solid" ? s.fill.color : s.fill.stops[0]!.color;
  return {
    fontFamily: `'${s.fontId}', system-ui, sans-serif`,
    fontWeight: s.fontWeight,
    color: fill,
    textTransform: s.casing === "upper" ? "uppercase" : s.casing === "lower" ? "lowercase" : "none",
    WebkitTextStroke: s.stroke.enabled ? `${Math.min(2, s.stroke.width / 2)}px ${s.stroke.color}` : undefined,
    paintOrder: "stroke fill",
    textShadow: s.shadows[0] ? `0 ${Math.min(3, s.shadows[0].y)}px ${Math.min(6, s.shadows[0].blur)}px ${s.shadows[0].color}` : undefined,
  } as React.CSSProperties;
}

export const LooksPanel: React.FC<Props> = ({ currentLookId, onChoose }) => {
  const cats = useMemo(() => ["All", ...lookCategories()], []);
  const [cat, setCat] = useState("All");
  const [, setTick] = useState(0);

  // preview each look in its real font
  useEffect(() => {
    const families = [...new Set(LOOKS.flatMap((l) => [l.style.fontId, l.style.hero.fontId ?? ""]).filter(Boolean))];
    void Promise.all(families.map(loadFontFamily)).then(() => setTick((n) => n + 1));
  }, []);

  const shown = cat === "All" ? LOOKS : LOOKS.filter((l) => l.category === cat);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-white/10 p-3">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-2.5 py-1 text-xs transition ${cat === c ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>{c}</button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-max content-start gap-2 overflow-y-auto p-3">
        {shown.map((look) => (
          <button
            key={look.id}
            onClick={() => onChoose(look)}
            className={`group flex shrink-0 flex-col overflow-hidden rounded-xl border text-left transition ${look.id === currentLookId ? "border-emerald-500 ring-1 ring-emerald-500" : "border-white/10 hover:border-white/30"}`}
          >
            <div className="flex h-20 items-center justify-center bg-gradient-to-br from-[#2b2b3a] to-[#1a1a24] px-2 text-center text-[19px] leading-tight">
              <span style={swatchStyle(look)}>
                {look.templateId === "word_by_word" ? "WATCH" : "Watch this"} <span style={{ color: look.style.active.color }}>now</span>
              </span>
            </div>
            <div className="px-2.5 py-2">
              <div className="truncate text-sm font-medium text-white">{look.name}</div>
              <div className="truncate text-[11px] text-white/40">{look.category}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
