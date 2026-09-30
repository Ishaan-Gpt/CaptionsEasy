"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Page, Word } from "@capseasy/shared";
import { fmtTime } from "./controls";
import { PEAKS_PER_SECOND } from "./useWaveform";

interface Props {
  pages: Page[];
  words: Word[];
  durationMs: number;
  timeMs: number;
  selectedId: string | null;
  peaks: Float32Array | null;
  waveState: "idle" | "loading" | "ready" | "unavailable";
  onSeek: (ms: number) => void;
  onSelect: (wordId: string | null) => void;
  /** commit a word's new timing (called once, on pointer up) */
  onRetime: (wordId: string, startMs: number, endMs: number) => void;
  /** editing actions shown at the left of the timeline header */
  toolbar?: React.ReactNode;
  /** true on phones: the timeline is the whole panel */
  fill?: boolean;
}

const LABEL_W = 88;
const MIN_WORD_MS = 40;
type Drag = { id: string; mode: "move" | "start" | "end"; x0: number; s0: number; e0: number; min: number; max: number; s: number; e: number };

/** Multi-track editor: ruler, caption cards, per-word blocks (drag edges or body to retime), video bar, audio waveform. */
export const Timeline: React.FC<Props> = ({ pages, words, durationMs, timeMs, selectedId, peaks, waveState, onSeek, onSelect, onRetime, toolbar }) => {
  const total = Math.max(1000, durationMs);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [viewW, setViewW] = useState(800);
  const [drag, setDrag] = useState<Drag | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth - LABEL_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // zoom 1 = whole video fits; zoom up to 40x for word-level work
  const pxPerMs = (Math.max(200, viewW) / total) * zoom;
  const width = Math.ceil(total * pxPerMs);
  const x = (ms: number) => ms * pxPerMs;

  // keep the playhead in view while playing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || drag) return;
    const px = x(timeMs);
    if (px < el.scrollLeft || px > el.scrollLeft + el.clientWidth - LABEL_W - 40) el.scrollLeft = Math.max(0, px - 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeMs, pxPerMs]);

  const ticks = useMemo(() => {
    const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000];
    const step = steps.find((s) => s * pxPerMs >= 70) ?? 120000;
    const out: number[] = [];
    for (let t = 0; t <= total; t += step) out.push(t);
    return out;
  }, [pxPerMs, total]);

  const visible = useMemo(() => words.filter((w) => !w.hidden), [words]);

  const beginDrag = (e: React.PointerEvent, w: Word, mode: Drag["mode"]) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const i = visible.findIndex((v) => v.id === w.id);
    const prev = visible[i - 1];
    const next = visible[i + 1];
    onSelect(w.id);
    setDrag({ id: w.id, mode, x0: e.clientX, s0: w.startMs, e0: w.endMs, min: prev ? prev.endMs : 0, max: next ? next.startMs : total, s: w.startMs, e: w.endMs });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = (e.clientX - drag.x0) / pxPerMs;
    let s = drag.s0;
    let en = drag.e0;
    if (drag.mode === "start") s = Math.min(drag.e0 - MIN_WORD_MS, Math.max(drag.min, drag.s0 + d));
    else if (drag.mode === "end") en = Math.max(drag.s0 + MIN_WORD_MS, Math.min(drag.max, drag.e0 + d));
    else {
      const len = drag.e0 - drag.s0;
      s = Math.min(drag.max - len, Math.max(drag.min, drag.s0 + d));
      en = s + len;
    }
    setDrag({ ...drag, s: Math.round(s), e: Math.round(en) });
  };
  const endDrag = () => {
    if (drag && (drag.s !== drag.s0 || drag.e !== drag.e0)) onRetime(drag.id, drag.s, drag.e);
    setDrag(null);
  };

  const seekFromEvent = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onSeek(Math.max(0, Math.min(total, (e.clientX - r.left) / pxPerMs)));
  };

  const trackRow = "relative h-full border-b border-st-line/60";
  return (
    <div role="region" aria-label="Timeline" className="flex h-full min-h-0 flex-col bg-st-bg select-none">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-st-line bg-st-panel px-3 py-1.5 text-xs text-st-muted">
        {toolbar}
        <span className="ml-auto rounded-md bg-st-raised px-2 py-1 font-mono tabular-nums text-st-text">{fmtTime(timeMs)} <span className="text-st-faint">/ {fmtTime(total)}</span></span>
        <span className="hidden sm:inline">Zoom</span>
        <button onClick={() => setZoom((z) => Math.max(1, z / 1.6))} className="rounded px-1.5 hover:bg-st-hover" aria-label="Zoom out">−</button>
        <input type="range" min={0} max={100} value={Math.round((Math.log(zoom) / Math.log(40)) * 100)} onChange={(e) => setZoom(Math.pow(40, Number(e.target.value) / 100))} className="w-32 accent-[#34D399]" aria-label="Timeline zoom" />
        <button onClick={() => setZoom((z) => Math.min(40, z * 1.6))} className="rounded px-1.5 hover:bg-st-hover" aria-label="Zoom in">+</button>
        <button onClick={() => setZoom(1)} className="rounded px-2 py-0.5 hover:bg-st-hover">Fit</button>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="grid h-full" style={{ gridTemplateColumns: `${LABEL_W}px ${width}px`, gridTemplateRows: "24px minmax(34px,0.9fr) minmax(40px,1.2fr) minmax(24px,0.6fr) minmax(40px,1.1fr)" }}>
          {/* labels (sticky) */}
          <div className="sticky left-0 z-20 row-span-5 grid border-r border-st-line bg-st-panel text-[11px] text-st-muted" style={{ gridTemplateRows: "24px minmax(34px,0.9fr) minmax(40px,1.2fr) minmax(24px,0.6fr) minmax(40px,1.1fr)" }}>
            <div />
            <div className="flex items-center gap-1.5 border-b border-st-line/60 px-2">▭ Cards</div>
            <div className="flex items-center gap-1.5 border-b border-st-line/60 px-2 text-st-or">𝐈 Words</div>
            <div className="flex items-center gap-1.5 border-b border-st-line/60 px-2 text-st-text/80">▶ Video</div>
            <div className="flex items-center gap-1.5 px-2 text-st-lav/80">♫ Audio</div>
          </div>

          {/* ruler */}
          <div className="relative cursor-pointer border-b border-st-line" onClick={seekFromEvent}>
            {ticks.map((t) => (
              <div key={t} className="absolute top-0 h-full border-l border-st-line pl-1 text-[10px] tabular-nums text-st-faint" style={{ left: x(t) }}>{fmtTime(t)}</div>
            ))}
          </div>

          {/* cards */}
          <div className={trackRow} onClick={seekFromEvent}>
            {pages.map((p) => (
              <div key={p.id} className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded px-1 text-[10px] leading-5 ${timeMs >= p.startMs && timeMs < p.endMs ? "bg-st-em/85 text-obsidian" : "bg-st-raised text-st-muted"}`} style={{ left: x(p.startMs), width: Math.max(2, x(p.endMs) - x(p.startMs) - 1) }} title={p.words.map((w) => w.text).join(" ")}>
                <span className="whitespace-nowrap">{p.words.map((w) => w.text).join(" ")}</span>
              </div>
            ))}
          </div>

          {/* words (draggable) */}
          <div className={trackRow} onClick={(e) => { onSelect(null); seekFromEvent(e); }}>
            {visible.map((w) => {
              const live = drag?.id === w.id ? { s: drag.s, e: drag.e } : { s: w.startMs, e: w.endMs };
              const wpx = Math.max(3, x(live.e) - x(live.s) - 1);
              const sel = w.id === selectedId;
              return (
                <div
                  key={w.id}
                  onPointerDown={(e) => beginDrag(e, w, "move")}
                  onClick={(e) => { e.stopPropagation(); onSelect(w.id); onSeek(w.startMs + 1); }}
                  title={`${w.text}  ${fmtTime(live.s)} – ${fmtTime(live.e)}`}
                  className={`absolute top-2 bottom-2 cursor-grab overflow-hidden rounded text-[11px] leading-7 ${sel ? "bg-st-lav text-obsidian ring-2 ring-st-lav/40" : "bg-st-or/85 text-obsidian hover:bg-st-or"}`}
                  style={{ left: x(live.s), width: wpx }}
                >
                  {wpx > 18 ? <span className="px-1.5 whitespace-nowrap">{w.text}</span> : null}
                  {wpx > 10 ? (
                    <>
                      <span onPointerDown={(e) => beginDrag(e, w, "start")} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-black/20 hover:bg-black/50" aria-label={`Move start of ${w.text}`} />
                      <span onPointerDown={(e) => beginDrag(e, w, "end")} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-black/20 hover:bg-black/50" aria-label={`Move end of ${w.text}`} />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* video */}
          <div className={trackRow} onClick={seekFromEvent}>
            <div className="absolute inset-y-1 left-0 rounded-md bg-[#0F3D2E] px-2 text-[10px] leading-5 text-st-text/90" style={{ width: x(total) }}>Video</div>
          </div>

          {/* audio waveform */}
          <div className="relative" onClick={seekFromEvent}>
            <Waveform peaks={peaks} width={width} />
            {waveState !== "ready" ? <span className="absolute left-2 top-1 text-[10px] text-st-faint">{waveState === "loading" ? "Loading audio…" : waveState === "unavailable" ? "Waveform unavailable for this file" : ""}</span> : null}
          </div>

          {/* playhead across all tracks */}
          <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-st-lav" style={{ left: LABEL_W + x(timeMs) }}>
            <div className="absolute -left-1.5 -top-0.5 h-3 w-3 rotate-45 bg-st-lav" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Waveform: React.FC<{ peaks: Float32Array | null; width: number }> = ({ peaks, width }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !peaks) return;
    const w = Math.min(width, 16000); // canvas size limit; CSS stretches it when zoomed far in
    const h = c.clientHeight || 40;
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(52,211,153,0.7)";
    const per = peaks.length / w;
    for (let px = 0; px < w; px++) {
      let m = 0;
      for (let i = Math.floor(px * per); i < Math.floor((px + 1) * per) || i === Math.floor(px * per); i++) m = Math.max(m, peaks[i] ?? 0);
      const bh = Math.max(1, m * (h - 4));
      g.fillRect(px, (h - bh) / 2, 1, bh);
    }
  }, [peaks, width]);
  return <canvas ref={ref} className="absolute inset-0 h-full" style={{ width }} aria-hidden />;
};

export { PEAKS_PER_SECOND };
