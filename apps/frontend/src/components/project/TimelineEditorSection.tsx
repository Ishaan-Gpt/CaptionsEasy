"use client";

import React, { useEffect, useRef, useState } from "react";

// Shortest a word is allowed to stay on screen once dragged — small enough
// to feel unrestricted, large enough that a word can't collapse to zero and
// disappear from the caption entirely. Exported so page.tsx's re-align
// heuristic uses the exact same floor.
export const MIN_WORD_DURATION_MS = 60;

// Below this, a word's ASR confidence is treated as untrustworthy and shown
// amber on the timeline (word mode only) — matches groq_speech_provider's
// FALLBACK_CONFIDENCE (0.5) plus headroom for genuinely low-confidence
// real transcriptions, not just the "no confidence available" fallback.
export const AMBER_CONFIDENCE_THRESHOLD = 0.6;

// Smallest mouse movement (px) before a mousedown-drag counts as a drag
// rather than a click — keeps ordinary clicks (select/seek) from jittering
// into a 1px "move" on an imprecise trackpad/mouse.
const CLICK_DRAG_THRESHOLD_PX = 4;

const isUnverified = (word: any) =>
  typeof word?.confidence === "number" && word.confidence < AMBER_CONFIDENCE_THRESHOLD;

interface TimelineEditorSectionProps {
  currentTimeMs: number;
  setCurrentTimeMs: (v: number) => void;
  durationMs: number;
  zoomLevel: number;
  setZoomLevel: (v: number) => void;
  wordDisplayMode: "word" | "line";
  setWordDisplayMode: (v: "word" | "line") => void;
  localWords: any[];
  editingWordIndex: number | null;
  setEditingWordIndex: (v: number | null) => void;
  editingWordText: string;
  setEditingWordText: (v: string) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;

  // Refs & elements
  videoRef: React.RefObject<HTMLVideoElement | null>;
  waveformRef: React.RefObject<HTMLDivElement | null>;
  wordsHistoryRef: React.MutableRefObject<{ past: any[][]; future: any[][] }>;

  // Action methods
  handleUndo: () => void;
  handleRedo: () => void;
  handleWordEditSave: (idx: number) => void;
  handleToggleHighlight: (idx: number) => void;
  handleWordResizeStart: () => void;
  handleWordResize: (idx: number, newStartMs: number, newEndMs: number, commit: boolean) => void;
  handleWordsMoveStart: () => void;
  handleWordsSetTimes: (entries: { idx: number; start: number; end: number }[], commit: boolean) => void;
  handleRealignWords: (indices: number[]) => void;
}

export const TimelineEditorSection: React.FC<TimelineEditorSectionProps> = ({
  currentTimeMs, setCurrentTimeMs,
  durationMs,
  zoomLevel, setZoomLevel,
  wordDisplayMode, setWordDisplayMode,
  localWords,
  editingWordIndex, setEditingWordIndex,
  editingWordText, setEditingWordText,
  isPlaying, setIsPlaying,
  videoRef, waveformRef, wordsHistoryRef,
  handleUndo, handleRedo,
  handleWordEditSave, handleToggleHighlight,
  handleWordResizeStart, handleWordResize,
  handleWordsMoveStart, handleWordsSetTimes, handleRealignWords,
}) => {
  // Selection is always a set of underlying WORD indices, even in Line
  // mode (selecting a line selects every word index it contains) — that
  // way Re-align (which operates word-by-word) works the same regardless
  // of which display mode you selected from.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [marquee, setMarquee] = useState<{ x1: number; x2: number } | null>(null);

  // Live drag state for the word-edge trim handles — kept in a ref (not
  // React state) since it's written on every pointermove; the visible
  // feedback comes from handleWordResize driving the parent's localWords,
  // which is what actually re-renders this word's left/width.
  const dragRef = useRef<{
    idx: number;
    side: "left" | "right";
    startClientX: number;
    startMs: number;
    endMs: number;
  } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndices([]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const beginWordResize = (
    e: React.MouseEvent,
    idx: number,
    side: "left" | "right",
    word: any
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleWordResizeStart();
    dragRef.current = {
      idx,
      side,
      startClientX: e.clientX,
      startMs: word.start_ms,
      endMs: word.end_ms,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaMs = (moveEvent.clientX - drag.startClientX) / PX_PER_MS;
      let newStart = drag.startMs;
      let newEnd = drag.endMs;
      if (drag.side === "left") {
        newStart = Math.min(Math.max(0, drag.startMs + deltaMs), drag.endMs - MIN_WORD_DURATION_MS);
      } else {
        newEnd = Math.max(drag.endMs + deltaMs, drag.startMs + MIN_WORD_DURATION_MS);
        if (durationMs) newEnd = Math.min(newEnd, durationMs);
      }
      handleWordResize(drag.idx, newStart, newEnd, false);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const drag = dragRef.current;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (!drag) return;
      const deltaMs = (upEvent.clientX - drag.startClientX) / PX_PER_MS;
      let newStart = drag.startMs;
      let newEnd = drag.endMs;
      if (drag.side === "left") {
        newStart = Math.min(Math.max(0, drag.startMs + deltaMs), drag.endMs - MIN_WORD_DURATION_MS);
      } else {
        newEnd = Math.max(drag.endMs + deltaMs, drag.startMs + MIN_WORD_DURATION_MS);
        if (durationMs) newEnd = Math.min(newEnd, durationMs);
      }
      handleWordResize(drag.idx, newStart, newEnd, true);
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Body-drag on a single word: short movement = click (select + seek),
  // movement past the threshold = move (start/end shift together, duration
  // unchanged — distinct from the edge handles, which resize).
  const beginWordMove = (e: React.MouseEvent, idx: number, word: any) => {
    e.stopPropagation();
    const startClientX = e.clientX;
    const snapStart = word.start_ms;
    const snapEnd = word.end_ms;
    let moved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startClientX;
      if (!moved && Math.abs(dx) > CLICK_DRAG_THRESHOLD_PX) {
        moved = true;
        handleWordsMoveStart();
      }
      if (moved) {
        const deltaMs = dx / PX_PER_MS;
        const newStart = Math.max(0, snapStart + deltaMs);
        const newEnd = newStart + (snapEnd - snapStart);
        handleWordsSetTimes([{ idx, start: newStart, end: newEnd }], false);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (moved) {
        const dx = upEvent.clientX - startClientX;
        const deltaMs = dx / PX_PER_MS;
        const newStart = Math.max(0, snapStart + deltaMs);
        const newEnd = newStart + (snapEnd - snapStart);
        handleWordsSetTimes([{ idx, start: newStart, end: newEnd }], true);
      } else {
        setSelectedIndices([idx]);
        if (videoRef.current) {
          videoRef.current.currentTime = word.start_ms / 1000;
          setCurrentTimeMs(word.start_ms);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Body-drag on a whole line: moves every word in it by the same delta
  // (relative spacing within the line is preserved) — Line mode has no
  // per-word edge-retime, only this whole-caption move.
  const beginLineMove = (e: React.MouseEvent, line: { words: any[]; startIdx: number }) => {
    e.stopPropagation();
    const indices = line.words.map((_: any, i: number) => line.startIdx + i);
    const startClientX = e.clientX;
    const snapshots = line.words.map((w: any, i: number) => ({
      idx: line.startIdx + i,
      start: w.start_ms,
      end: w.end_ms,
    }));
    let moved = false;

    const clampDelta = (deltaMs: number) => {
      const minSnapStart = Math.min(...snapshots.map((s) => s.start));
      return Math.max(deltaMs, -minSnapStart);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startClientX;
      if (!moved && Math.abs(dx) > CLICK_DRAG_THRESHOLD_PX) {
        moved = true;
        handleWordsMoveStart();
      }
      if (moved) {
        const deltaMs = clampDelta(dx / PX_PER_MS);
        const entries = snapshots.map((s) => ({ idx: s.idx, start: s.start + deltaMs, end: s.end + deltaMs }));
        handleWordsSetTimes(entries, false);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (moved) {
        const deltaMs = clampDelta((upEvent.clientX - startClientX) / PX_PER_MS);
        const entries = snapshots.map((s) => ({ idx: s.idx, start: s.start + deltaMs, end: s.end + deltaMs }));
        handleWordsSetTimes(entries, true);
      } else {
        setSelectedIndices(indices);
        if (videoRef.current) {
          videoRef.current.currentTime = line.words[0].start_ms / 1000;
          setCurrentTimeMs(line.words[0].start_ms);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Marquee (rubber-band) multi-select — starts only when the mousedown
  // lands on empty timeline background, since every block and resize
  // handle already stopPropagation()s its own mousedown before this ever
  // sees it. A drag past the click threshold selects every block whose
  // horizontal span intersects the rectangle; anything shorter is treated
  // as a plain click on empty space, which clears the selection.
  const beginMarquee = (e: React.MouseEvent<HTMLDivElement>) => {
    const containerEl = e.currentTarget;
    const containerRect = containerEl.getBoundingClientRect();
    const startX = e.clientX - containerRect.left;
    let moved = false;
    setMarquee({ x1: startX, x2: startX });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const curX = moveEvent.clientX - containerRect.left;
      if (!moved && Math.abs(curX - startX) > CLICK_DRAG_THRESHOLD_PX) moved = true;
      setMarquee({ x1: Math.min(startX, curX), x2: Math.max(startX, curX) });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const curX = upEvent.clientX - containerRect.left;
      const lo = Math.min(startX, curX);
      const hi = Math.max(startX, curX);
      setMarquee(null);

      if (!moved) {
        setSelectedIndices([]);
        return;
      }

      if (wordDisplayMode === "word") {
        const hit: number[] = [];
        localWords.forEach((w, idx) => {
          const wx1 = w.start_ms * PX_PER_MS;
          const wx2 = w.end_ms * PX_PER_MS;
          if (wx2 >= lo && wx1 <= hi) hit.push(idx);
        });
        setSelectedIndices(hit);
      } else {
        const hit: number[] = [];
        (lineGroups || []).forEach((line) => {
          const lx1 = line.words[0].start_ms * PX_PER_MS;
          const lx2 = line.words[line.words.length - 1].end_ms * PX_PER_MS;
          if (lx2 >= lo && lx1 <= hi) {
            line.words.forEach((_: any, i: number) => hit.push(line.startIdx + i));
          }
        });
        setSelectedIndices(hit);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const groupWordsIntoLines = (words: any[]) => {
    const MAX_GROUP_WORDS = 8;
    const PAUSE_GAP_MS = 400;
    const endsSentence = (text: string) => /[.!?]$/.test((text || "").trim());

    const lines: { words: any[]; startIdx: number }[] = [];
    let current: any[] = [];
    let currentStartIdx = 0;

    words.forEach((word, idx) => {
      if (current.length === 0) {
        currentStartIdx = idx;
        current.push(word);
        return;
      }
      const prev = current[current.length - 1];
      const gap = word.start_ms - prev.end_ms;
      if (endsSentence(prev.text) || gap > PAUSE_GAP_MS || current.length >= MAX_GROUP_WORDS) {
        lines.push({ words: current, startIdx: currentStartIdx });
        current = [word];
        currentStartIdx = idx;
      } else {
        current.push(word);
      }
    });
    if (current.length > 0) lines.push({ words: current, startIdx: currentStartIdx });

    return lines;
  };

  const PX_PER_MS = 0.15 * zoomLevel;
  const lineGroups = wordDisplayMode === "line" ? groupWordsIntoLines(localWords) : null;
  const selectionHasUnverified = selectedIndices.some((idx) => isUnverified(localWords[idx]));

  return (
    <div className="h-56 bg-[#1E170D] border-t border-[#3B301C] flex flex-col shrink-0 overflow-hidden shadow-md text-left">
      {/* 1. Timeline Top Control Bar */}
      <div className="h-12 border-b border-[#3B301C] px-4 flex items-center justify-between bg-[#1A140B]/60 shrink-0">

        {/* Playback & Frame Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.1);
                setCurrentTimeMs(videoRef.current.currentTime * 1000);
              }
            }}
            className="p-1.5 bg-[#2C2314] border border-[#3B301C] text-white hover:text-[#DCC8A4] transition-colors rounded cursor-pointer"
            title="Previous frame"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                } else {
                  videoRef.current.play().then(() => setIsPlaying(true));
                }
              }
            }}
            className="w-7 h-7 bg-[#DCC8A4] hover:bg-[#C9AF83] text-[#171208] rounded-full flex items-center justify-center transition-all cursor-pointer shadow hover:scale-105"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 0.1);
                setCurrentTimeMs(videoRef.current.currentTime * 1000);
              }
            }}
            className="p-1.5 bg-[#2C2314] border border-[#3B301C] text-white hover:text-[#DCC8A4] transition-colors rounded cursor-pointer"
            title="Next frame"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {selectedIndices.length > 0 && (
            <>
              <div className="h-4 w-[1px] bg-[#3B301C]" />
              <button
                onClick={() => handleRealignWords(selectedIndices)}
                disabled={!selectionHasUnverified}
                title={
                  selectionHasUnverified
                    ? "Re-align timing for the selected unverified (amber) words"
                    : "No unverified words in this selection"
                }
                className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                  selectionHasUnverified
                    ? "bg-amber-500 text-[#171208] hover:bg-amber-400 cursor-pointer"
                    : "bg-[#2C2314] text-white/25 cursor-not-allowed"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                Re-align ({selectedIndices.length})
              </button>
            </>
          )}
        </div>

        {/* Word/Line view selection and Undo/Redo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={wordsHistoryRef.current.past.length === 0}
              className="p-1.5 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors cursor-pointer disabled:cursor-not-allowed text-[10px] uppercase font-bold"
              title="Undo"
            >
              ↰
            </button>
            <button
              onClick={handleRedo}
              disabled={wordsHistoryRef.current.future.length === 0}
              className="p-1.5 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors cursor-pointer disabled:cursor-not-allowed text-[10px] uppercase font-bold"
              title="Redo"
            >
              ↱
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#3B301C]" />

          <div
            className="flex border border-[#3B301C] rounded bg-[#281F10] overflow-hidden p-0.5"
            title="Line moves whole captions; Word lets you retime, emphasise or move single words"
          >
            <button
              onClick={() => { setWordDisplayMode("word"); setSelectedIndices([]); }}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                wordDisplayMode === "word" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/40 hover:text-white"
              }`}
            >
              Word
            </button>
            <button
              onClick={() => { setWordDisplayMode("line"); setSelectedIndices([]); }}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                wordDisplayMode === "line" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/40 hover:text-white"
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Time display & Zoom */}
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono font-bold text-[#DCC8A4] bg-[#281F10] px-2.5 py-1 rounded border border-[#3B301C]">
            {(() => {
              const formatTime = (ms: number) => {
                const sec = Math.floor(ms / 1000) % 60;
                const min = Math.floor(ms / 60000);
                const millis = Math.floor((ms % 1000) / 10);
                return `${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}:${millis < 10 ? "0" : ""}${millis}`;
              };
              return `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`;
            })()}
          </div>

          <div className="h-4 w-[1px] bg-[#3B301C]" />

          <div className="flex items-center gap-2" title="Ctrl/Cmd + scroll on the timeline also zooms">
            <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-20 h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
            />
            <span className="text-[8px] font-mono text-white/40">{Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </div>

      {/* 2. Timeline Track Area (Word Boxes & Waveform) */}
      <div
        className="flex-1 overflow-x-auto relative py-3 px-4 scrollbar-thin bg-[#171208]"
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const next = Math.min(2.5, Math.max(0.5, zoomLevel - e.deltaY * 0.001));
            setZoomLevel(parseFloat(next.toFixed(2)));
            return;
          }
          const container = e.currentTarget;
          if (e.deltaY !== 0) {
            container.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
      >
        <div
          className="h-full relative"
          style={{ width: `${(durationMs || 10000) * PX_PER_MS}px` }}
          onMouseDown={beginMarquee}
        >
          {wordDisplayMode === "word" ? (
            <div className="absolute top-1 inset-x-0 h-14 z-10">
              {localWords.map((word, idx) => {
                const startX = word.start_ms * PX_PER_MS;
                const width = (word.end_ms - word.start_ms) * PX_PER_MS;
                const isActive = currentTimeMs >= word.start_ms && currentTimeMs <= word.end_ms;
                const unverified = isUnverified(word);
                const isSelected = selectedIndices.includes(idx);

                return (
                  <div
                    key={idx}
                    className={`group absolute h-11 rounded border flex flex-col items-center justify-center px-1 text-center transition-all cursor-grab active:cursor-grabbing shadow-sm select-none ${
                      isSelected ? "ring-2 ring-[#5EC8F2] ring-offset-1 ring-offset-[#171208] z-30" : ""
                    } ${
                      isActive
                        ? "bg-[#DCC8A4] border-[#C9AF83] text-[#171208] scale-102 z-20"
                        : unverified
                        ? "bg-amber-400/80 border-amber-500 text-[#2E2415]"
                        : word.highlighted
                        ? "bg-[#FFEAA7]/80 border-[#DCC8A4]/50 text-[#2E2415]"
                        : "bg-[#DECEB0] border-[#C2B294] text-[#2E2415] hover:bg-[#E8DFCA] hover:border-white/40"
                    }`}
                    style={{
                      left: `${startX}px`,
                      width: `${Math.max(28, width)}px`
                    }}
                    onMouseDown={(e) => beginWordMove(e, idx, word)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingWordIndex(idx);
                      setEditingWordText(word.text);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleToggleHighlight(idx);
                    }}
                    title={
                      unverified
                        ? "Unverified timing — select and hit Re-align. Double-click to edit, right-click to highlight, drag edges to retime, drag body to move."
                        : "Double-click to edit, right-click to highlight, drag edges to retime, drag body to move."
                    }
                  >
                    {editingWordIndex === idx ? (
                      <input
                        type="text"
                        value={editingWordText}
                        onChange={(e) => setEditingWordText(e.target.value)}
                        onBlur={() => handleWordEditSave(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleWordEditSave(idx);
                          if (e.key === "Escape") setEditingWordIndex(null);
                        }}
                        autoFocus
                        className="bg-[#1E170D] border border-[#DCC8A4] text-[9px] font-bold text-center w-full focus:outline-none text-white rounded p-0.5"
                      />
                    ) : (
                      <>
                        <span className="text-[9px] font-black truncate w-full block">
                          {word.text}
                        </span>
                        <span className={`text-[6px] tracking-tighter opacity-60 font-medium w-full truncate block mt-0.5 ${isActive ? "text-[#171208]/80" : "text-[#2E2415]/70"}`}>
                          {Math.round(word.end_ms - word.start_ms)}ms
                        </span>
                      </>
                    )}

                    {/* Trim handles — drag to lengthen/shorten how long this
                        word stays on screen. Free resize: no ripple onto
                        neighbors, so gaps/overlaps are possible on purpose. */}
                    <div
                      onMouseDown={(e) => beginWordResize(e, idx, "left", word)}
                      title="Drag to change when this word appears"
                      className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-[#171208]/40 hover:bg-[#171208]/70 rounded-l"
                    />
                    <div
                      onMouseDown={(e) => beginWordResize(e, idx, "right", word)}
                      title="Drag to change how long this word stays on screen"
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-[#171208]/40 hover:bg-[#171208]/70 rounded-r"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="absolute top-1 inset-x-0 h-14 z-10">
              {(lineGroups || []).map((line, lineIdx) => {
                const lineStart = line.words[0].start_ms;
                const lineEnd = line.words[line.words.length - 1].end_ms;
                const startX = lineStart * PX_PER_MS;
                const width = (lineEnd - lineStart) * PX_PER_MS;
                const isActive = currentTimeMs >= lineStart && currentTimeMs <= lineEnd;
                const lineText = line.words.map((w: any) => w.text).join(" ");
                const lineIndices = line.words.map((_: any, i: number) => line.startIdx + i);
                const isSelected = lineIndices.every((idx) => selectedIndices.includes(idx));
                const lineHasUnverified = line.words.some((w: any) => isUnverified(w));

                return (
                  <div
                    key={lineIdx}
                    className={`absolute h-11 rounded border flex items-center justify-center px-2 text-center transition-all cursor-grab active:cursor-grabbing shadow-sm select-none ${
                      isSelected ? "ring-2 ring-[#5EC8F2] ring-offset-1 ring-offset-[#171208] z-30" : ""
                    } ${
                      isActive
                        ? "bg-[#DCC8A4] border-[#C9AF83] text-[#171208] scale-102 z-20"
                        : "bg-[#DECEB0] border-[#C2B294] text-[#2E2415] hover:bg-[#E8DFCA] hover:border-white/40"
                    } ${lineHasUnverified ? "border-l-4 border-l-amber-500" : ""}`}
                    style={{
                      left: `${startX}px`,
                      width: `${Math.max(60, width)}px`
                    }}
                    onMouseDown={(e) => beginLineMove(e, line)}
                    title={
                      lineHasUnverified
                        ? `${lineText} — contains unverified words; switch to Word mode to re-align them. Drag to move the whole caption.`
                        : `${lineText} — drag to move the whole caption.`
                    }
                  >
                    <span className="text-[9px] font-black truncate w-full block">
                      {lineText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* WaveSurfer canvas container */}
          <div
            ref={waveformRef}
            className="absolute inset-x-0 bottom-1 h-[72px] z-0 opacity-80"
          />

          {/* Marquee (rubber-band) multi-select rectangle */}
          {marquee && (
            <div
              className="absolute top-0 bottom-0 z-40 bg-[#5EC8F2]/10 border border-[#5EC8F2]/60 pointer-events-none"
              style={{ left: `${marquee.x1}px`, width: `${Math.max(1, marquee.x2 - marquee.x1)}px` }}
            />
          )}

          {/* Playhead vertical line cursor */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#DCC8A4] z-20 pointer-events-none"
            style={{ left: `${currentTimeMs * PX_PER_MS}px` }}
          >
            <div className="w-3 h-3 rounded-full bg-[#DCC8A4] -ml-[5px] -mt-[2px] border border-[#171208] shadow shadow-[#DCC8A4]/50" />
          </div>
        </div>
      </div>
    </div>
  );
};
