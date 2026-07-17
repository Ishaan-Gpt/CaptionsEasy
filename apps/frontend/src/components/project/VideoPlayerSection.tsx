"use client";

import React from "react";
import { Project } from "@/services/types";
import { CaptionBoxEditor, BoxMargins } from "@/components/CaptionBoxEditor";
import SmoothCaptionOverlay from "@/components/project/SmoothCaptionOverlay";
import { CaptionStyle } from "@/remotion/CaptionEngine";

interface VideoPlayerSectionProps {
  // State
  selectedRatio: "original" | "9:16" | "16:9" | "1:1" | "4:5";
  setSelectedRatio: (r: "original" | "9:16" | "16:9" | "1:1" | "4:5") => void;
  playerZoom: number;
  setPlayerZoom: (z: number) => void;
  showSafetyGrid: boolean;
  setShowSafetyGrid: (v: boolean) => void;
  naturalAspectRatio: number;
  setNaturalAspectRatio: (r: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (t: number) => void;
  durationMs: number;
  setDurationMs: (d: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  activeExportId: string | null;
  setActiveExportId: (id: string | null) => void;
  boxEditMode: boolean;
  setBoxEditMode: (v: boolean) => void;
  pendingBoxCommit: { top: number; bottom: number; left: number; right: number } | null;
  setPendingBoxCommit: (v: { top: number; bottom: number; left: number; right: number } | null) => void;
  liveDragBox: { top: number; bottom: number; left: number; right: number } | null;
  setLiveDragBox: (v: { top: number; bottom: number; left: number; right: number } | null) => void;
  isSavingBox: boolean;

  // Refs & Element binders
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  playerWidth: number;
  setPlayerWidth: (w: number) => void;
  wavesurfer: React.MutableRefObject<any>;

  // Data Objects
  project: Project | null | undefined;
  projectVideo: any;
  exports: any[] | undefined;
  motionScript: any;
  localWords: any[];

  // Styling inputs
  customCaptionTemplate: string;
  customSize: number;
  customFont: string;
  customFontFace: string;
  customColor: string;
  customColor2: string;
  customColorMode: "solid" | "gradient";
  customHighlightColor: string;
  customAlignment: "left" | "center" | "right";
  customCasing: "none" | "uppercase" | "lowercase" | "capitalize";
  customUnderline: boolean;
  customLetterSpacing: number;
  customWordSpacing: number;
  customLineSpacing: number;
  shadowEnabled: boolean;
  strokeEnabled: boolean;
  backgroundEnabled: boolean;
  selectedBackgroundStyle: "pill" | "shadow-box";
  customShadow: number;
  customOutline: number;
  customYPositionPercent: number;
  customXPositionPercent: number;
  customStaggeredLayout: "splash" | "centre";
  
  // Custom Box margins
  customBoxTop: number;
  customBoxBottom: number;
  customBoxLeft: number;
  customBoxRight: number;

  // Action methods
  applyBoxToFragment: (startMs: number, box: { top: number; bottom: number; left: number; right: number }) => Promise<void>;
  applyBoxToAll: (box: { top: number; bottom: number; left: number; right: number }) => Promise<void>;
  handleUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  pickKeywordIndex: (words: any[]) => number;
  getActiveSegmentAndIndex: () => { words: any[]; absoluteStartIndex: number; relativeActiveIdx: number } | null;

  // The one style object the shared CaptionEngine renders — built by the
  // page from every control's live state, so preview updates are instant.
  captionStyle: CaptionStyle;
  captionWordLimit: number;
}

const maxWeight = (a: string, b: string): string => {
  const toInt = (w: string) => (/^\d+$/.test(w) ? parseInt(w, 10) : w.toLowerCase() === "bold" ? 700 : 400);
  return toInt(a) >= toInt(b) ? a : b;
};

export const VideoPlayerSection: React.FC<VideoPlayerSectionProps> = ({
  selectedRatio, setSelectedRatio,
  playerZoom, setPlayerZoom,
  showSafetyGrid, setShowSafetyGrid,
  naturalAspectRatio, setNaturalAspectRatio,
  isPlaying, setIsPlaying,
  currentTimeMs, setCurrentTimeMs,
  durationMs, setDurationMs,
  volume, setVolume,
  isMuted, setIsMuted,
  activeExportId, setActiveExportId,
  boxEditMode, setBoxEditMode,
  pendingBoxCommit, setPendingBoxCommit,
  liveDragBox, setLiveDragBox,
  isSavingBox,
  videoRef, playerContainerRef, playerWidth, setPlayerWidth, wavesurfer,
  project, projectVideo, exports, motionScript, localWords,
  customCaptionTemplate, customSize, customFont, customFontFace,
  customColor, customColor2, customColorMode, customHighlightColor,
  customAlignment, customCasing, customUnderline,
  customLetterSpacing, customWordSpacing, customLineSpacing,
  shadowEnabled, strokeEnabled, backgroundEnabled, selectedBackgroundStyle,
  customShadow, customOutline, customYPositionPercent, customXPositionPercent,
  customStaggeredLayout,
  customBoxTop, customBoxBottom, customBoxLeft, customBoxRight,
  applyBoxToFragment, applyBoxToAll, handleUploadFile,
  pickKeywordIndex, getActiveSegmentAndIndex,
  captionStyle, captionWordLimit,
}) => {

  return (
    <section className="flex-1 flex flex-col bg-[#171208] overflow-hidden relative min-h-0 text-left">
      {/* 1. Media Control Bar (Aspect Ratio, Zoom, Safety Grid, Fullscreen) */}
      <div className="h-10 bg-[#1E170D] border-b border-[#3B301C] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-[#171208] border border-[#3B301C] p-0.5 rounded-full">
          {(["original", "9:16", "16:9", "1:1", "4:5"] as const).map((r) => {
            const isActive = selectedRatio === r;
            const displayLabel = r === "original" ? "Original" : r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRatio(r)}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#DCC8A4] text-[#171208] shadow-sm"
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlayerZoom(Math.max(50, playerZoom - 10))}
              className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
              </svg>
            </button>
            <button
              onClick={() => setPlayerZoom(100)}
              className="text-[9px] font-mono font-bold text-[#DCC8A4] bg-[#171208] border border-[#3B301C] px-2 py-0.5 rounded"
              title="Reset Zoom"
            >
              {playerZoom}%
            </button>
            <button
              onClick={() => setPlayerZoom(Math.min(200, playerZoom + 10))}
              className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#3B301C]" />

          <button
            onClick={() => setShowSafetyGrid(!showSafetyGrid)}
            className={`p-1.5 transition-colors rounded cursor-pointer ${
              showSafetyGrid ? "text-[#DCC8A4] bg-[#DCC8A4]/10" : "text-white/50 hover:text-white"
            }`}
            title="Toggle Safe Area Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (videoRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoRef.current.requestFullscreen().catch((err) => console.error(err));
                }
              }
            }}
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen Toggle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0l-5.25-5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Top Video Preview Player Container */}
      <div className="flex-1 flex items-center justify-center p-6 relative bg-[#1A140B] min-h-0 overflow-hidden">
        
        <div 
          ref={playerContainerRef}
          className="relative h-full max-h-[calc(100vh-420px)] w-auto max-w-full bg-[#1E170D] border border-[#3B301C] shadow-2xl flex flex-col justify-center items-center overflow-hidden transition-all duration-200"
          style={{
            aspectRatio: selectedRatio === "original" ? naturalAspectRatio : selectedRatio === "9:16" ? 9/16 : selectedRatio === "16:9" ? 16/9 : selectedRatio === "1:1" ? 1 : 4/5,
            transform: `scale(${playerZoom / 100})`,
          }}
        >
          {showSafetyGrid && (
            <div className="absolute inset-0 border border-dashed border-[#DCC8A4]/25 pointer-events-none z-10 m-[10%]">
              <div className="absolute inset-0 border border-dashed border-[#DCC8A4]/15 m-[5%]" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#DCC8A4]/10" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#DCC8A4]/10" />
            </div>
          )}
          
          {(() => {
            const completedExports = (exports || []).filter((e: any) => e.status === "completed" && e.download_url);
            const activeExport = activeExportId ? completedExports.find((e: any) => e.id === activeExportId) : null;
            const previewSrc = activeExport?.download_url || projectVideo?.download_url || completedExports[0]?.download_url;
            const isViewingExport = Boolean(activeExport);

            if (!previewSrc) {
              return (
                <label className="flex flex-col items-center justify-center p-6 text-center space-y-4 cursor-pointer hover:bg-[#281F10]/50 transition-colors w-full h-full absolute inset-0">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full border border-dashed border-[#DCC8A4] flex items-center justify-center text-[#DCC8A4] hover:scale-105 transition-transform duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white uppercase font-black tracking-wider block">
                      Upload Media
                    </span>
                    <span className="text-[7px] text-white/40 uppercase tracking-widest block">
                      Drag & drop or click to upload
                    </span>
                  </div>
                </label>
              );
            }

            return (
              <>
                {isViewingExport && (
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-[#171208]/80 border border-[#DCC8A4]/40 rounded-full pl-3 pr-1 py-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#DCC8A4]">
                      Viewing Rendered Export
                    </span>
                    <button
                      onClick={() => setActiveExportId(null)}
                      className="text-[8px] font-bold uppercase tracking-wider text-white/80 bg-white/10 hover:bg-white/20 rounded-full px-2 py-0.5 cursor-pointer"
                    >
                      Back to Live Preview
                    </button>
                  </div>
                )}
                <video
                  key={previewSrc}
                  ref={videoRef}
                  src={previewSrc}
                  className="w-full h-full object-cover"
                  poster={project?.thumbnail_url || undefined}
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
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      const timeMs = videoRef.current.currentTime * 1000;
                      setCurrentTimeMs(timeMs);
                      if (wavesurfer.current && videoRef.current.duration) {
                        wavesurfer.current.setTime(videoRef.current.currentTime);
                      }
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDurationMs(videoRef.current.duration * 1000);
                      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                        setNaturalAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
                      }
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                />
              </>
            );
          })()}

          {/* Live caption layer — the shared CaptionEngine (same component the
              export renders), driven by a 60fps rAF clock. */}
          {!activeExportId && (() => {
            // Canvas must match what's actually displayed: the export burns
            // onto the real video dimensions, so the preview does too. The
            // planner's global_settings.canvas is a fixed 1080x1920 that has
            // nothing to do with this video — trusting it put captions
            // outside the visible frame for any non-9:16 upload.
            const getCanvasDimensions = () => {
              const width = 1080;
              const ratio = selectedRatio === "original"
                ? naturalAspectRatio
                : selectedRatio === "9:16" ? 9 / 16
                : selectedRatio === "16:9" ? 16 / 9
                : selectedRatio === "1:1" ? 1
                : 4 / 5;
              return { width, height: width / ratio };
            };
            const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions();
            return (
              <SmoothCaptionOverlay
                videoRef={videoRef}
                motionScript={motionScript}
                localWords={localWords}
                style={captionStyle}
                wordLimit={captionWordLimit}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                scale={playerWidth / canvasWidth}
                fallbackTimeMs={currentTimeMs}
              />
            );
          })()}

          {/* Safe-Box constraints Editor Overlay */}
          {boxEditMode && !activeExportId && (() => {
            // Same real-display canvas as the caption layer above — the box
            // must sit on the same coordinate system the captions render in.
            const getCanvasDims = () => {
              const width = 1080;
              const ratio = selectedRatio === "original"
                ? naturalAspectRatio
                : selectedRatio === "9:16" ? 9 / 16
                : selectedRatio === "16:9" ? 16 / 9
                : selectedRatio === "1:1" ? 1
                : 4 / 5;
              return { width, height: width / ratio };
            };
            const { width: canvasWidth, height: canvasHeight } = getCanvasDims();
            const S = playerWidth / canvasWidth;

            const activeCaption = motionScript?.timeline?.find(
              (e: any) => e.type === "caption" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
            );
            const resolvedBox: BoxMargins = activeCaption?.payload?.box ?? {
              top: customBoxTop, bottom: customBoxBottom, left: customBoxLeft, right: customBoxRight,
            };
            const displayBox = liveDragBox ?? resolvedBox;

            return (
              <CaptionBoxEditor
                box={displayBox}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                scale={S}
                template={captionStyle.template}
                yPercent={captionStyle.yPercent}
                onChange={setLiveDragBox}
                onCommit={(box) => {
                  setLiveDragBox(null);
                  setPendingBoxCommit(box);
                }}
              />
            );
          })()}

          {/* Progress bottom-bar line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#3B301C]">
            <div
              className="h-full bg-[#6FBF8F] transition-all duration-75"
              style={{ width: `${durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0}%` }}
            />
          </div>

          {/* Bounding Box Apply Dialog overlay */}
          {pendingBoxCommit && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#171208]/95 border border-[#DCC8A4]/40 rounded-full pl-4 pr-1.5 py-1.5 shadow-xl text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-white/70">Apply box to</span>
              <button
                disabled={isSavingBox}
                onClick={() => {
                  const activeCaption = motionScript?.timeline?.find(
                    (e: any) => e.type === "caption" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
                  );
                  if (activeCaption && pendingBoxCommit) {
                    applyBoxToFragment(activeCaption.start_ms, pendingBoxCommit);
                  } else {
                    setPendingBoxCommit(null);
                  }
                }}
                className="text-[9px] font-bold uppercase tracking-wider text-[#171208] bg-[#DCC8A4] hover:bg-[#C9AF83] rounded-full px-3 py-1 cursor-pointer disabled:opacity-50"
              >
                This Caption
              </button>
              <button
                disabled={isSavingBox}
                onClick={() => pendingBoxCommit && applyBoxToAll(pendingBoxCommit)}
                className="text-[9px] font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 cursor-pointer disabled:opacity-50"
              >
                All Captions
              </button>
              <button
                disabled={isSavingBox}
                onClick={() => setPendingBoxCommit(null)}
                className="text-[9px] font-bold uppercase tracking-wider text-white/50 hover:text-white/80 rounded-full px-2 py-1 cursor-pointer disabled:opacity-50"
                title="Discard"
              >
                ✕
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="h-12 bg-[#1E170D] border-t border-[#3B301C] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
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
            className="p-1 text-white hover:text-[#6FBF8F] transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  const newMute = !isMuted;
                  videoRef.current.muted = newMute;
                  setIsMuted(newMute);
                }
              }}
              className="text-white hover:text-[#6FBF8F] transition-colors cursor-pointer"
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                  setIsMuted(v === 0);
                }
              }}
              className="w-16 h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="text-[10px] font-mono text-white">
          {(() => {
            const formatTime = (ms: number) => {
              const sec = Math.floor(ms / 1000) % 60;
              const min = Math.floor(ms / 60000);
              return `${min}:${sec < 10 ? "0" : ""}${sec}`;
            };
            return `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`;
          })()}
        </div>

        <button
          onClick={() => {
            setBoxEditMode(!boxEditMode);
            setPendingBoxCommit(null);
            setLiveDragBox(null);
            setActiveExportId(null);
          }}
          className={`text-[9px] font-black uppercase tracking-wider rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
            boxEditMode
              ? "bg-[#DCC8A4] text-[#171208]"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          }`}
          title="Drag/resize the caption's bounding box"
        >
          {boxEditMode ? "Editing Box" : "Edit Box"}
        </button>
      </div>
    </section>
  );
};
