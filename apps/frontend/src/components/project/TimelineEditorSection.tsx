"use client";

import React from "react";

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
}) => {

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

  return (
    <div className="h-56 bg-[#111317] border-t border-[#23272F] flex flex-col shrink-0 overflow-hidden shadow-md text-left">
      {/* 1. Timeline Top Control Bar */}
      <div className="h-12 border-b border-[#23272F] px-4 flex items-center justify-between bg-[#0E1013]/60 shrink-0">
        
        {/* Playback & Frame Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.1);
                setCurrentTimeMs(videoRef.current.currentTime * 1000);
              }
            }}
            className="p-1.5 bg-[#1C2027] border border-[#23272F] text-white hover:text-[#FFB800] transition-colors rounded cursor-pointer"
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
            className="w-7 h-7 bg-[#FFB800] hover:bg-[#DE9E00] text-[#0A0B0D] rounded-full flex items-center justify-center transition-all cursor-pointer shadow hover:scale-105"
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
            className="p-1.5 bg-[#1C2027] border border-[#23272F] text-white hover:text-[#FFB800] transition-colors rounded cursor-pointer"
            title="Next frame"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
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

          <div className="h-4 w-[1px] bg-[#23272F]" />

          <div className="flex border border-[#23272F] rounded bg-[#181B21] overflow-hidden p-0.5">
            <button
              onClick={() => setWordDisplayMode("word")}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                wordDisplayMode === "word" ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/40 hover:text-white"
              }`}
            >
              Word
            </button>
            <button
              onClick={() => setWordDisplayMode("line")}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                wordDisplayMode === "line" ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/40 hover:text-white"
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Time display & Zoom */}
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono font-bold text-[#FFB800] bg-[#181B21] px-2.5 py-1 rounded border border-[#23272F]">
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

          <div className="h-4 w-[1px] bg-[#23272F]" />

          <div className="flex items-center gap-2">
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
              className="w-20 h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
            />
            <span className="text-[8px] font-mono text-white/40">{Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </div>

      {/* 2. Timeline Track Area (Word Boxes & Waveform) */}
      <div 
        className="flex-1 overflow-x-auto relative py-3 px-4 scrollbar-thin bg-[#0A0B0D]"
        onWheel={(e) => {
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
        >
          {wordDisplayMode === "word" ? (
            <div className="absolute top-1 inset-x-0 h-14 z-10">
              {localWords.map((word, idx) => {
                const startX = word.start_ms * PX_PER_MS;
                const width = (word.end_ms - word.start_ms) * PX_PER_MS;
                const isActive = currentTimeMs >= word.start_ms && currentTimeMs <= word.end_ms;

                return (
                  <div
                    key={idx}
                    className={`absolute h-11 rounded border flex flex-col items-center justify-center px-1 text-center transition-all cursor-pointer shadow-sm select-none ${
                      isActive
                        ? "bg-[#FFB800] border-[#E5A500] text-[#0A0B0D] scale-102 z-20"
                        : word.highlighted
                        ? "bg-[#FFEAA7]/80 border-[#FFB800]/50 text-[#2D3436]"
                        : "bg-[#DECEB0] border-[#C2B294] text-[#2E2514] hover:bg-[#E8DFCA] hover:border-white/40"
                    }`}
                    style={{
                      left: `${startX}px`,
                      width: `${Math.max(28, width)}px`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.currentTime = word.start_ms / 1000;
                        setCurrentTimeMs(word.start_ms);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingWordIndex(idx);
                      setEditingWordText(word.text);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleToggleHighlight(idx);
                    }}
                    title="Double-click to edit, right-click to highlight"
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
                        className="bg-[#111317] border border-[#FFB800] text-[9px] font-bold text-center w-full focus:outline-none text-white rounded p-0.5"
                      />
                    ) : (
                      <>
                        <span className="text-[9px] font-black truncate w-full block">
                          {word.text}
                        </span>
                        <span className={`text-[6px] tracking-tighter opacity-60 font-medium w-full truncate block mt-0.5 ${isActive ? "text-[#0A0B0D]/80" : "text-[#2E2514]/70"}`}>
                          ♩ Text
                        </span>
                      </>
                    )}
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

                return (
                  <div
                    key={lineIdx}
                    className={`absolute h-11 rounded border flex items-center justify-center px-2 text-center transition-all cursor-pointer shadow-sm select-none ${
                      isActive
                        ? "bg-[#FFB800] border-[#E5A500] text-[#0A0B0D] scale-102 z-20"
                        : "bg-[#DECEB0] border-[#C2B294] text-[#2E2514] hover:bg-[#E8DFCA] hover:border-white/40"
                    }`}
                    style={{
                      left: `${startX}px`,
                      width: `${Math.max(60, width)}px`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.currentTime = lineStart / 1000;
                        setCurrentTimeMs(lineStart);
                      }
                    }}
                    title={lineText}
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

          {/* Playhead vertical line cursor */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#FFB800] z-20 pointer-events-none"
            style={{ left: `${currentTimeMs * PX_PER_MS}px` }}
          >
            <div className="w-3 h-3 rounded-full bg-[#FFB800] -ml-[5px] -mt-[2px] border border-[#0A0B0D] shadow shadow-[#FFB800]/50 cursor-ew-resize" />
          </div>
        </div>
      </div>
    </div>
  );
};
