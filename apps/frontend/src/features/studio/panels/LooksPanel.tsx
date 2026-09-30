"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CaptionStyleV2, ProjectSettings } from "@capseasy/shared";
import { LOOKS, loadFontFamily, lookCategories, resolveStyle, type LookDefinition } from "@capseasy/templates";
import { studioService } from "@/services/studio";

interface Props {
  currentLookId: string | null;
  onChoose: (look: LookDefinition) => void;
  currentStyle: CaptionStyleV2;
  currentSettings: ProjectSettings;
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

/** Built-in looks have previews rendered by the real composition (packages/compositions/scripts/look-previews.ts). */
const BUILT_IN = new Set(LOOKS.map((l) => l.id));

/** Still of the look; its actual animation loops on hover (and always for the selected look, e.g. on phones). */
const LookPreview: React.FC<{ id: string; name: string; playing: boolean }> = ({ id, name, playing }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);
  const active = hover || playing;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    } else v.pause();
  }, [active]);
  return (
    <div className="relative aspect-square overflow-hidden bg-[#17201c]" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/looks/${id}.webp`} alt={`${name} caption style`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      {active ? (
        <video ref={ref} src={`/looks/${id}.mp4`} muted loop playsInline preload="auto" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <span className={`pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85 transition ${active ? "opacity-0" : "opacity-100 group-hover:opacity-0"}`} aria-hidden>▶</span>
    </div>
  );
};

export const LooksPanel: React.FC<Props> =({ currentLookId, onChoose, currentStyle, currentSettings }) => {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["my-looks"], queryFn: () => studioService.listLooks() });
  const myLooks = useMemo<LookDefinition[]>(
    () => (mine.data ?? []).map((l) => ({ id: `user:${l.id}`, name: l.name, description: "Saved look", category: "My looks", templateId: l.template_id, style: resolveStyle(l.style_json), settings: l.settings_json })),
    [mine.data],
  );
  const cats = useMemo(() => ["All", ...(myLooks.length ? ["My looks"] : []), ...lookCategories()], [myLooks.length]);
  const [cat, setCat] = useState("All");
  const [saving, setSaving] = useState(false);
  const saveCurrent = async () => {
    const name = window.prompt("Name this look", "My look")?.trim();
    if (!name) return;
    setSaving(true);
    try {
      await studioService.saveLook(name, currentStyle, { maxWordsPerCard: currentSettings.maxWordsPerCard, maxLines: currentSettings.maxLines, gapBehavior: currentSettings.gapBehavior });
      await qc.invalidateQueries({ queryKey: ["my-looks"] });
      setCat("My looks");
    } finally {
      setSaving(false);
    }
  };
  const removeLook = (look: LookDefinition) => {
    if (!window.confirm(`Delete "${look.name}"?`)) return;
    void studioService.deleteLook(look.id.slice(5)).then(() => qc.invalidateQueries({ queryKey: ["my-looks"] }));
  };
  const [, setTick] = useState(0);

  // preview each look in its real font
  useEffect(() => {
    const families = [...new Set(LOOKS.flatMap((l) => [l.style.fontId, l.style.hero.fontId ?? ""]).filter(Boolean))];
    void Promise.all(families.map(loadFontFamily)).then(() => setTick((n) => n + 1));
  }, []);

  const all = [...myLooks, ...LOOKS];
  const shown = cat === "All" ? all : all.filter((l) => l.category === cat);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-st-line p-3">
        <button onClick={() => void saveCurrent()} disabled={saving} className="w-full rounded-lg border border-dashed border-st-lav/50 px-2.5 py-1.5 text-xs font-medium text-st-lav hover:bg-st-lav/10 disabled:opacity-50">
          {saving ? "Saving…" : "＋ Save current style as a look"}
        </button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-2.5 py-1 text-xs transition ${cat === c ? "bg-st-lav text-obsidian" : "bg-st-raised text-st-text/80 hover:bg-st-hover"}`}>{c}</button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-max content-start gap-2 overflow-y-auto p-3">
        {shown.map((look) => (
          <button
            key={look.id}
            onClick={() => onChoose(look)}
            className={`group flex shrink-0 flex-col overflow-hidden rounded-xl border text-left transition ${look.id === currentLookId ? "border-st-lav ring-1 ring-st-lav" : "border-st-line hover:border-white/30"}`}
          >
            {BUILT_IN.has(look.id) ? (
              <LookPreview id={look.id} name={look.name} playing={look.id === currentLookId} />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#2C2C27] to-[#151513] px-2 text-center text-[19px] leading-tight">
                <span style={swatchStyle(look)}>
                  {look.templateId === "word_by_word" ? "WATCH" : "Watch this"} <span style={{ color: look.style.active.color }}>now</span>
                </span>
              </div>
            )}
            <div className="relative px-2.5 py-2">
              {look.category === "My looks" ? (
                <span role="button" aria-label={`Delete ${look.name}`} onClick={(e) => { e.stopPropagation(); removeLook(look); }} className="absolute right-2 top-2 text-xs text-st-faint hover:text-red-300">✕</span>
              ) : null}
              <div className="truncate pr-4 text-sm font-medium text-st-text">{look.name}</div>
              <div className="truncate text-[11px] text-st-faint">{look.category}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
