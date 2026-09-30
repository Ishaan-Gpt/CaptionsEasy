"use client";

import React, { useMemo, useState } from "react";
import type { CaptionDoc, Emotion, Page } from "@capseasy/shared";
import { findMatches, findReplace, mergeWithPrevious, setCardEmotion, setEmphasis, setHidden, setWordText, splitCardAt } from "@motion-ai/caption-engine/core";
import { Button, fmtTime } from "../controls";

const EMOTIONS: Emotion[] = ["neutral", "excited", "funny", "serious", "sad", "angry", "surprised", "question", "hype", "calm"];
const EMOJI: Record<Emotion, string> = { neutral: "·", excited: "🤩", funny: "😂", serious: "🧐", sad: "😢", angry: "😠", surprised: "😮", question: "❓", hype: "🔥", calm: "😌" };

interface Props {
  doc: CaptionDoc;
  pages: Page[];
  currentPageId: string | null;
  selectedId: string | null;
  onSelect: (wordId: string | null) => void;
  onSeek: (ms: number) => void;
  edit: (fn: (d: CaptionDoc) => CaptionDoc, opts?: { coalesceKey?: string }) => void;
}

export const CaptionsPanel: React.FC<Props> = ({ doc, pages, currentPageId, selectedId, onSelect, onSeek, edit }) => {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const selected = useMemo(() => doc.words.find((w) => w.id === selectedId) ?? null, [doc, selectedId]);
  const matchIds = useMemo(() => new Set(findMatches(doc, find)), [doc, find]);
  const hidden = useMemo(() => doc.words.filter((w) => w.hidden), [doc.words]);
  const lowConfidence = (c?: number) => c !== undefined && c < 0.5;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-white/10 p-3">
        <div className="flex gap-2">
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find" className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#1f1f1f] px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with" className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#1f1f1f] px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        {find ? (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{matchIds.size} match{matchIds.size === 1 ? "" : "es"}</span>
            <Button disabled={matchIds.size === 0} onClick={() => { edit((d) => findReplace(d, find, replace).doc); setFind(""); setReplace(""); }} className="!py-1 text-xs">
              Replace all
            </Button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pages.length === 0 ? <p className="p-6 text-center text-sm text-white/40">No captions yet.</p> : null}
        {pages.map((page) => (
          <div key={page.id} className={`border-b border-white/5 px-3 py-2.5 ${page.id === currentPageId ? "bg-emerald-500/10" : ""}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <button onClick={() => onSeek(page.startMs)} className="font-mono text-[11px] text-white/40 hover:text-emerald-400">{fmtTime(page.startMs)}</button>
              <select
                value={page.emotion}
                title="Emotion (changes how strongly this card animates)"
                onChange={(e) => edit((d) => setCardEmotion(d, page.id, e.target.value as Emotion))}
                className="rounded bg-transparent text-xs text-white/60 outline-none hover:text-white"
              >
                {EMOTIONS.map((e) => <option key={e} value={e} className="bg-[#1f1f1f]">{EMOJI[e]} {e}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              {page.words.map((w, i) => (
                <button
                  key={w.id}
                  onClick={() => { onSelect(w.id); onSeek(w.startMs + 1); }}
                  className={`rounded-md px-1.5 py-0.5 text-sm transition ${
                    w.id === selectedId ? "bg-emerald-500 text-black" : matchIds.has(w.id) ? "bg-yellow-400/30 text-yellow-100" : "bg-white/5 text-white/90 hover:bg-white/15"
                  } ${i === page.heroIndex ? "font-bold underline decoration-emerald-400 decoration-2 underline-offset-2" : ""} ${lowConfidence(w.confidence) ? "border-b border-dashed border-orange-400" : ""}`}
                  title={lowConfidence(w.confidence) ? "Low confidence: worth double-checking" : undefined}
                >
                  {w.text}
                </button>
              ))}
            </div>
          </div>
        ))}

        {hidden.length > 0 ? (
          <div className="p-3">
            <button onClick={() => setShowHidden((v) => !v)} className="text-xs text-white/50 hover:text-white">{showHidden ? "▾" : "▸"} {hidden.length} hidden word{hidden.length === 1 ? "" : "s"}</button>
            {showHidden ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {hidden.map((w) => (
                  <button key={w.id} onClick={() => edit((d) => setHidden(d, w.id, false))} className="rounded-md bg-white/5 px-1.5 py-0.5 text-sm text-white/40 line-through hover:text-white" title="Click to restore">
                    {w.text}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="space-y-2 border-t border-white/10 bg-[#1a1a1a] p-3">
          <div className="flex items-center gap-2">
            <input
              value={selected.text}
              onChange={(e) => edit((d) => setWordText(d, selected.id, e.target.value || " "), { coalesceKey: `t-${selected.id}` })}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#1f1f1f] px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              aria-label="Edit word"
            />
            <button onClick={() => onSelect(null)} className="text-white/40 hover:text-white" aria-label="Close editor">✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button className="!py-1 text-xs" onClick={() => edit((d) => setEmphasis(d, selected.id, selected.emphasis === "hero" ? "none" : "hero"))}>
              {selected.emphasis === "hero" ? "★ Hero word" : "☆ Make hero"}
            </Button>
            <Button className="!py-1 text-xs" onClick={() => edit((d) => splitCardAt(d, selected.id))}>Split card here</Button>
            <Button className="!py-1 text-xs" onClick={() => edit((d) => mergeWithPrevious(d, selected.id))}>Join previous</Button>
            <Button tone="danger" className="!py-1 text-xs" onClick={() => { edit((d) => setHidden(d, selected.id, true)); onSelect(null); }}>Hide word</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
