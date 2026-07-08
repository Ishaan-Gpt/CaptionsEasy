"use client";

import React from "react";
import { Project } from "@/services/types";
import { BoxEditorOverlay, BoxMargins } from "@/components/BoxEditorOverlay";
import { 
  getTemplateStyle, 
  fitFontSizePx, 
  estimateTextWidthPx, 
  lightenHex, 
  darkenHex 
} from "@/config/captionTemplates";

// Safe area bounds for template splitting
const safeAreaLeft = 50;
const safeAreaRight = 50;

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
}) => {

  const getTextStyle = (isHighlighted: boolean) => {
    let fontStyle = "normal";
    if (customFontFace.toLowerCase().includes("italic")) {
      fontStyle = "italic";
    }

    const wMap: Record<string, string> = {
      "thin": "100", "extra light": "200", "light": "300", "regular": "400",
      "medium": "500", "semi bold": "600", "bold": "700", "extra bold": "800", "black": "900"
    };

    let userWeight = "800";
    const lowerFace = customFontFace.toLowerCase();
    for (const key of Object.keys(wMap)) {
      if (lowerFace.includes(key)) {
        userWeight = wMap[key];
        break;
      }
    }

    const templateStyle = getTemplateStyle(customCaptionTemplate);
    const resolvedWeight = maxWeight(
      userWeight,
      isHighlighted ? templateStyle.keywordWeight : templateStyle.baseWeight
    );
    const resolvedFont = isHighlighted && templateStyle.keywordFont ? templateStyle.keywordFont : customFont;

    const baseStyle: any = {
      fontFamily: `"${resolvedFont}", Montserrat, sans-serif`,
      fontWeight: resolvedWeight,
      fontStyle,
      textAlign: customAlignment,
      textTransform: customCasing === "none" ? "none" : customCasing,
      textDecoration: customUnderline ? "underline" : "none",
      letterSpacing: `${customLetterSpacing}px`,
      wordSpacing: `${customWordSpacing}px`,
      lineHeight: customLineSpacing,
      transition: "all 0.1s ease",
    };

    if (customColorMode === "gradient") {
      baseStyle.backgroundImage = `linear-gradient(135deg, ${customColor}, ${customHighlightColor})`;
      baseStyle.WebkitBackgroundClip = "text";
      baseStyle.WebkitTextFillColor = "transparent";
    } else {
      baseStyle.color = isHighlighted ? customHighlightColor : customColor;
    }

    const textShadowParts = [];
    if (strokeEnabled && customOutline > 0) {
      const strokeColor = isHighlighted ? customHighlightColor : "#000000";
      baseStyle.WebkitTextStroke = `${customOutline * 0.5}px ${strokeColor}`;
    }

    if (shadowEnabled && customShadow > 0) {
      textShadowParts.push(`0px ${customShadow}px ${customShadow}px rgba(0,0,0,0.6)`);
    }

    baseStyle.textShadow = textShadowParts.length > 0 ? textShadowParts.join(", ") : "none";

    return baseStyle;
  };

  const bgStyleVal = backgroundEnabled ? selectedBackgroundStyle : "none";
  const containerPadding = bgStyleVal === "pill" ? "10px 20px" : bgStyleVal === "shadow-box" ? "14px 18px" : "0px";
  const containerBg = bgStyleVal === "pill" ? "rgba(17,19,23,0.85)" : bgStyleVal === "shadow-box" ? "rgba(17,19,23,0.95)" : "transparent";
  const containerBorderRadius = bgStyleVal === "pill" ? "9999px" : bgStyleVal === "shadow-box" ? "8px" : "0px";
  const containerBorder = bgStyleVal !== "none" ? "1px solid rgba(255,255,255,0.1)" : "none";

  return (
    <section className="flex-1 flex flex-col bg-[#0A0B0D] overflow-hidden relative min-h-0 text-left">
      {/* 1. Media Control Bar (Aspect Ratio, Zoom, Safety Grid, Fullscreen) */}
      <div className="h-10 bg-[#111317] border-b border-[#23272F] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-[#0A0B0D] border border-[#23272F] p-0.5 rounded-full">
          {(["original", "9:16", "16:9", "1:1", "4:5"] as const).map((r) => {
            const isActive = selectedRatio === r;
            const displayLabel = r === "original" ? "Original" : r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRatio(r)}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#FFB800] text-[#0A0B0D] shadow-sm"
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
              className="text-[9px] font-mono font-bold text-[#FFB800] bg-[#0A0B0D] border border-[#23272F] px-2 py-0.5 rounded"
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

          <div className="h-4 w-[1px] bg-[#23272F]" />

          <button
            onClick={() => setShowSafetyGrid(!showSafetyGrid)}
            className={`p-1.5 transition-colors rounded cursor-pointer ${
              showSafetyGrid ? "text-[#FFB800] bg-[#FFB800]/10" : "text-white/50 hover:text-white"
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
      <div className="flex-1 flex items-center justify-center p-6 relative bg-[#0E1013] min-h-0 overflow-hidden">
        
        <div 
          ref={playerContainerRef}
          className="relative h-full max-h-[calc(100vh-420px)] w-auto max-w-full bg-[#111317] border border-[#23272F] shadow-2xl flex flex-col justify-center items-center overflow-hidden transition-all duration-200"
          style={{
            aspectRatio: selectedRatio === "original" ? naturalAspectRatio : selectedRatio === "9:16" ? 9/16 : selectedRatio === "16:9" ? 16/9 : selectedRatio === "1:1" ? 1 : 4/5,
            transform: `scale(${playerZoom / 100})`,
          }}
        >
          {showSafetyGrid && (
            <div className="absolute inset-0 border border-dashed border-[#FFB800]/25 pointer-events-none z-10 m-[10%]">
              <div className="absolute inset-0 border border-dashed border-[#FFB800]/15 m-[5%]" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#FFB800]/10" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#FFB800]/10" />
            </div>
          )}
          
          {(() => {
            const completedExports = (exports || []).filter((e: any) => e.status === "completed" && e.download_url);
            const activeExport = activeExportId ? completedExports.find((e: any) => e.id === activeExportId) : null;
            const previewSrc = activeExport?.download_url || projectVideo?.download_url || completedExports[0]?.download_url;
            const isViewingExport = Boolean(activeExport);

            if (!previewSrc) {
              return (
                <label className="flex flex-col items-center justify-center p-6 text-center space-y-4 cursor-pointer hover:bg-[#181B21]/50 transition-colors w-full h-full absolute inset-0">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full border border-dashed border-[#FFB800] flex items-center justify-center text-[#FFB800] hover:scale-105 transition-transform duration-200">
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
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-[#0A0B0D]/80 border border-[#FFB800]/40 rounded-full pl-3 pr-1 py-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#FFB800]">
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

          {/* Subtitle Preview Overlay */}
          {!activeExportId && (() => {
            let wordsObj: { text: string }[] = [];
            let revealedMax = 0;
            let k = 0;

            if (motionScript?.timeline) {
              let activeCaption = motionScript.timeline.find(
                (e: any) => e.type === "caption" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
              );
              if (!activeCaption && !isPlaying) {
                const captions = motionScript.timeline.filter(
                  (e: any) => e.type === "caption"
                );
                if (captions.length > 0) {
                  activeCaption = captions.reduce((prev: any, curr: any) => {
                    const prevDiff = Math.abs(currentTimeMs - (prev.start_ms + prev.end_ms) / 2);
                    const currDiff = Math.abs(currentTimeMs - (curr.start_ms + curr.end_ms) / 2);
                    return prevDiff < currDiff ? prev : curr;
                  });
                }
              }
              if (!activeCaption) return null;

              const capHighlights = motionScript.timeline.filter(
                (e: any) => e.type === "highlight" && e.start_ms >= activeCaption.start_ms && e.start_ms < activeCaption.end_ms
              );
              const backendKeywordHighlight = capHighlights.find((h: any) => h.payload?.is_keyword);

              const capText = activeCaption.payload.text || "";
              const segmentWords = localWords.filter(
                (w: any) => w.start_ms >= activeCaption.start_ms && w.end_ms <= activeCaption.end_ms
              );

              wordsObj = segmentWords.length > 0
                ? segmentWords.map((w: any) => ({ text: w.text }))
                : capText.split(" ").map((t: string) => ({ text: t }));

              revealedMax = segmentWords.findIndex(
                (w: any) => currentTimeMs >= w.start_ms && currentTimeMs <= w.end_ms
              );
              if (revealedMax === -1) {
                const activeHighlight = motionScript.timeline.find(
                  (e: any) => e.type === "highlight" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
                );
                if (activeHighlight?.payload?.indices?.length > 0) {
                  revealedMax = activeHighlight.payload.indices[0];
                } else {
                  revealedMax = isPlaying ? 0 : wordsObj.length - 1;
                }
              }

              k = backendKeywordHighlight?.payload?.indices?.[0] ?? pickKeywordIndex(wordsObj);
            } else {
              const activeSegment = getActiveSegmentAndIndex();
              if (!activeSegment) return null;

              wordsObj = activeSegment.words.map((w: any) => ({ text: w.text }));
              revealedMax = activeSegment.relativeActiveIdx;
              k = pickKeywordIndex(wordsObj);
            }

            const getCanvasDimensions = () => {
              if (motionScript?.global_settings?.canvas) {
                return {
                  width: motionScript.global_settings.canvas.width,
                  height: motionScript.global_settings.canvas.height,
                };
              }
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
            const S = playerWidth / canvasWidth;

            const renderOverlayContent = () => {
              const templateStyle = getTemplateStyle(customCaptionTemplate);
              const boxWidth = canvasWidth - safeAreaLeft - safeAreaRight;

              if (customCaptionTemplate === "staggered_3line") {
                const line1Words = wordsObj.slice(0, k).map(w => w.text);
                const line2Word = wordsObj[k]?.text || "";
                const line3Words = wordsObj[k + 1]?.text ? wordsObj.slice(k + 1).map(w => w.text) : [];
                const visibleL2 = k <= revealedMax ? line2Word : null;

                let sizeL1 = customSize * templateStyle.baseSizeScale;
                let sizeL3 = customSize * templateStyle.baseSizeScale;
                let sizeL2 = customSize * templateStyle.keywordSizeScale;

                let X_l1 = 540;
                let an_l1 = 5;
                let X_l3 = 540;
                let an_l3 = 5;

                const isCentre = customStaggeredLayout === "centre";

                if (!isCentre) {
                  const W2 = estimateTextWidthPx((line2Word || "").toUpperCase(), sizeL2);
                  X_l1 = 540 - W2 / 2;
                  an_l1 = 4; // left-aligned
                  if (X_l1 < safeAreaLeft) {
                    X_l1 = safeAreaLeft;
                  }
                  const fullL1Text = line1Words.join(" ");
                  if (fullL1Text) {
                    const fullL1Width = estimateTextWidthPx(fullL1Text, sizeL1);
                    const availableL1 = (canvasWidth - safeAreaRight) - X_l1;
                    if (availableL1 > 0 && availableL1 < fullL1Width) {
                      sizeL1 = sizeL1 * (availableL1 / fullL1Width);
                    }
                  }

                  X_l3 = 540 + W2 / 2;
                  an_l3 = 6; // right-aligned
                  if (X_l3 > (canvasWidth - safeAreaRight)) {
                    X_l3 = canvasWidth - safeAreaRight;
                  }
                  const fullL3Text = line3Words.join(" ");
                  if (fullL3Text) {
                    const fullL3Width = estimateTextWidthPx(fullL3Text, sizeL3);
                    const availableL3 = X_l3 - safeAreaLeft;
                    if (availableL3 > 0 && availableL3 < fullL3Width) {
                      sizeL3 = sizeL3 * (availableL3 / fullL3Width);
                    }
                  }
                } else {
                  const fullL1Text = line1Words.join(" ");
                  if (fullL1Text) {
                    const fullL1Width = estimateTextWidthPx(fullL1Text, sizeL1);
                    if (fullL1Width > boxWidth) {
                      sizeL1 = sizeL1 * (boxWidth / fullL1Width);
                    }
                  }
                  const fullL3Text = line3Words.join(" ");
                  if (fullL3Text) {
                    const fullL3Width = estimateTextWidthPx(fullL3Text, sizeL3);
                    if (fullL3Width > boxWidth) {
                      sizeL3 = sizeL3 * (boxWidth / fullL3Width);
                    }
                  }
                  if (line2Word) {
                    const fullL2Width = estimateTextWidthPx(line2Word.toUpperCase(), sizeL2);
                    if (fullL2Width > boxWidth) {
                      sizeL2 = sizeL2 * (boxWidth / fullL2Width);
                    }
                  }
                }

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                const lineGap = customSize * 1.1;

                let Y_l1 = baseY - lineGap;
                let Y_l2 = baseY;
                let Y_l3 = baseY + lineGap;

                if (line1Words.length === 0) {
                  Y_l2 = baseY - lineGap / 2;
                  Y_l3 = baseY + lineGap / 2;
                  Y_l1 = Y_l2 - lineGap;
                } else if (line3Words.length === 0) {
                  Y_l1 = baseY - lineGap / 2;
                  Y_l2 = baseY + lineGap / 2;
                  Y_l3 = Y_l2 + lineGap;
                }

                return (
                  <>
                    {line1Words.length > 0 && (
                      <div
                        className="absolute tracking-wide transition-all duration-100 uppercase animate-fade-in-up"
                        style={{
                          ...getTextStyle(false),
                          left: `${X_l1}px`,
                          top: `${Y_l1}px`,
                          transform: an_l1 === 4 ? "translateY(-50%)" : "translate(-50%, -50%)",
                          fontSize: `${sizeL1}px`,
                          opacity: 0.96,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line1Words.map((w, i) => (
                          <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                            {w}{i < line1Words.length - 1 ? " " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {line2Word && (
                      <div
                        className="absolute tracking-tight leading-none select-none transition-all duration-100 uppercase"
                        style={{
                          ...getTextStyle(true),
                          left: "540px",
                          top: `${Y_l2}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL2}px`,
                          visibility: visibleL2 ? "visible" : "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line2Word}
                      </div>
                    )}
                    {line3Words.length > 0 && (
                      <div
                        className="absolute tracking-wide transition-all duration-100 uppercase"
                        style={{
                          ...getTextStyle(false),
                          left: `${X_l3}px`,
                          top: `${Y_l3}px`,
                          transform: an_l3 === 6 ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                          fontSize: `${sizeL3}px`,
                          opacity: 0.96,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line3Words.map((w, i) => (
                          <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                            {i > 0 ? " " : ""}{w}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              } else if (customCaptionTemplate === "word_by_word") {
                const activeWord = wordsObj[revealedMax]?.text || wordsObj[0]?.text || "";
                if (!activeWord) return null;

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                let sizeLarge = customSize * templateStyle.keywordSizeScale;
                
                sizeLarge = fitFontSizePx(sizeLarge, activeWord.toUpperCase(), boxWidth);

                return (
                  <div
                    className="absolute uppercase tracking-wide transition-all duration-100 text-center whitespace-nowrap"
                    style={{
                      ...getTextStyle(true),
                      left: "540px",
                      top: `${baseY}px`,
                      transform: "translate(-50%, -50%)",
                      fontSize: `${sizeLarge}px`,
                    }}
                  >
                    {activeWord}
                  </div>
                );
              } else if (customCaptionTemplate === "glow_stack") {
                const line1Words = wordsObj.slice(0, k).map(w => w.text);
                const line2Word = wordsObj[k]?.text || "";
                const line3Words = wordsObj[k + 1]?.text ? wordsObj.slice(k + 1).map(w => w.text) : [];
                const visibleL2 = k <= revealedMax ? line2Word : null;

                const bodyFont = `"${templateStyle.baseFont}", ${customFont}, sans-serif`;
                const bodyShadow = "0px 3px 6px rgba(0,0,0,0.45)";

                const baseSizePx = customSize * templateStyle.baseSizeScale;
                const keywordSizePx = customSize * templateStyle.keywordSizeScale;
                let sizeL1 = fitFontSizePx(baseSizePx, line1Words.join(" "), boxWidth);
                let sizeL3 = fitFontSizePx(baseSizePx, line3Words.join(" "), boxWidth);
                const sizeL2 = fitFontSizePx(keywordSizePx, (line2Word || "").toUpperCase(), boxWidth);

                const W2 = estimateTextWidthPx((line2Word || "").toUpperCase(), sizeL2);
                let X_l1 = 540 - W2 / 2;
                if (X_l1 < safeAreaLeft) X_l1 = safeAreaLeft;
                const fullL1Text = line1Words.join(" ");
                if (fullL1Text) {
                  const fullL1Width = estimateTextWidthPx(fullL1Text, sizeL1);
                  const availableL1 = (canvasWidth - safeAreaRight) - X_l1;
                  if (availableL1 > 0 && availableL1 < fullL1Width) {
                    sizeL1 = sizeL1 * (availableL1 / fullL1Width);
                  }
                }

                let X_l3 = 540 + W2 / 2;
                if (X_l3 > (canvasWidth - safeAreaRight)) X_l3 = canvasWidth - safeAreaRight;
                const fullL3Text = line3Words.join(" ");
                if (fullL3Text) {
                  const fullL3Width = estimateTextWidthPx(fullL3Text, sizeL3);
                  const availableL3 = X_l3 - safeAreaLeft;
                  if (availableL3 > 0 && availableL3 < fullL3Width) {
                    sizeL3 = sizeL3 * (availableL3 / fullL3Width);
                  }
                }

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                const lineGap = baseSizePx * 1.15;

                let Y_l1 = baseY - lineGap;
                let Y_l2 = baseY;
                let Y_l3 = baseY + lineGap;

                if (line1Words.length === 0) {
                  Y_l2 = baseY - lineGap / 2;
                  Y_l3 = baseY + lineGap / 2;
                  Y_l1 = Y_l2 - lineGap;
                } else if (line3Words.length === 0) {
                  Y_l1 = baseY - lineGap / 2;
                  Y_l2 = baseY + lineGap / 2;
                  Y_l3 = Y_l2 + lineGap;
                }

                const widthL2 = estimateTextWidthPx((line2Word || "").toUpperCase(), sizeL2);
                const blobHalfW = Math.min(boxWidth, widthL2 * 1.8 + 60) / 2;
                const blobHalfH = lineGap * 1.7;
                const blobLeft = 540 - blobHalfW;
                const blobTop = Y_l2 - blobHalfH;

                return (
                  <>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${blobLeft}px`,
                        top: `${blobTop}px`,
                        width: `${blobHalfW * 2}px`,
                        height: `${blobHalfH * 2}px`,
                        borderRadius: "40px",
                        filter: "blur(28px)",
                        background: "radial-gradient(ellipse 62% 58% at 50% 50%, rgba(10,16,32,0.55), rgba(10,16,32,0.28) 55%, transparent 78%)",
                      }}
                    />

                    {line1Words.length > 0 && (
                      <div
                        className="absolute whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          left: `${X_l1}px`,
                          top: `${Y_l1}px`,
                          transform: "translateY(-50%)",
                          fontSize: `${sizeL1}px`,
                          textShadow: bodyShadow,
                          textAlign: "left",
                        }}
                      >
                        {line1Words.map((w, i) => (
                          <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                            {w}{i < line1Words.length - 1 ? " " : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {line2Word && (
                      <div
                        className="absolute uppercase leading-none whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: `"${templateStyle.keywordFont}", ${customFont}, sans-serif`,
                          fontWeight: 900,
                          color: customHighlightColor,
                          left: "540px",
                          top: `${Y_l2}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL2}px`,
                          textShadow: "0px 4px 8px rgba(0,0,0,0.45)",
                          visibility: visibleL2 ? "visible" : "hidden",
                        }}
                      >
                        {line2Word}
                      </div>
                    )}

                    {line3Words.length > 0 && (
                      <div
                        className="absolute whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          left: `${X_l3}px`,
                          top: `${Y_l3}px`,
                          transform: "translate(-100%, -50%)",
                          fontSize: `${sizeL3}px`,
                          textShadow: bodyShadow,
                          textAlign: "right",
                        }}
                      >
                        {line3Words.map((w, i) => (
                          <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                            {i > 0 ? " " : ""}{w}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              } else if (customCaptionTemplate === "cartoon_stack") {
                const line1Words = wordsObj.slice(0, k).map(w => w.text);
                const line2Word = wordsObj[k]?.text || "";
                const line3Words = wordsObj[k + 1]?.text ? wordsObj.slice(k + 1).map(w => w.text) : [];
                const visibleL2 = k <= revealedMax ? line2Word : null;

                const bodyFont = `"${templateStyle.baseFont}", cursive`;
                const keywordFont = `"${templateStyle.keywordFont}", sans-serif`;

                let sizeL1 = customSize * templateStyle.baseSizeScale;
                let sizeL3 = customSize * templateStyle.baseSizeScale;
                let sizeL2 = customSize * templateStyle.keywordSizeScale;

                sizeL1 = fitFontSizePx(sizeL1, line1Words.join(" "), boxWidth);
                sizeL3 = fitFontSizePx(sizeL3, line3Words.join(" "), boxWidth);
                sizeL2 = fitFontSizePx(sizeL2, line2Word || "", boxWidth);

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                const lineGap = customSize * 0.8;

                let Y_l1 = baseY - lineGap;
                let Y_l2 = baseY;
                let Y_l3 = baseY + lineGap;

                if (line1Words.length === 0) {
                  Y_l2 = baseY - lineGap / 2;
                  Y_l3 = baseY + lineGap / 2;
                  Y_l1 = Y_l2 - lineGap;
                } else if (line3Words.length === 0) {
                  Y_l1 = baseY - lineGap / 2;
                  Y_l2 = baseY + lineGap / 2;
                  Y_l3 = Y_l2 + lineGap;
                }

                return (
                  <>
                    {line1Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l1}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL1}px`,
                          textShadow: "none",
                          textTransform: "none",
                        }}
                      >
                        {line1Words.map((w, i) => (
                          <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                            {w}{i < line1Words.length - 1 ? " " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {line2Word && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100 lowercase"
                        style={{
                          fontFamily: keywordFont,
                          fontWeight: 700,
                          color: "#EDE0A6",
                          left: "540px",
                          top: `${Y_l2}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL2}px`,
                          WebkitTextStroke: "8px #4E2D1F",
                          paintOrder: "stroke fill",
                          strokeLinejoin: "round",
                          textShadow: "0 5px 0 rgba(0,0,0,0.44)",
                          visibility: visibleL2 ? "visible" : "hidden",
                        }}
                      >
                        {line2Word}
                      </div>
                    )}
                    {line3Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l3}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL3}px`,
                          textShadow: "none",
                          textTransform: "none",
                        }}
                      >
                        {line3Words.map((w, i) => (
                          <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                            {i > 0 ? " " : ""}{w}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              } else if (customCaptionTemplate === "serif_pop") {
                const line1Words = wordsObj.slice(0, k).map(w => w.text);
                const line2Word = wordsObj[k]?.text || "";
                const line3Words = wordsObj[k + 1]?.text ? wordsObj.slice(k + 1).map(w => w.text) : [];
                const visibleL2 = k <= revealedMax ? line2Word : null;

                const bodyFont = `${customFont}, sans-serif`;
                const keywordFont = `"${templateStyle.keywordFont}", Georgia, serif`;

                let sizeL1 = customSize * templateStyle.baseSizeScale;
                let sizeL3 = customSize * templateStyle.baseSizeScale;
                let sizeL2 = customSize * templateStyle.keywordSizeScale;

                sizeL1 = fitFontSizePx(sizeL1, line1Words.join(" "), boxWidth);
                sizeL3 = fitFontSizePx(sizeL3, line3Words.join(" "), boxWidth);
                sizeL2 = fitFontSizePx(sizeL2, line2Word || "", boxWidth);

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                const lineGap = customSize * 1.15;

                let Y_l1 = baseY - lineGap;
                let Y_l2 = baseY;
                let Y_l3 = baseY + lineGap;

                if (line1Words.length === 0) {
                  Y_l2 = baseY - lineGap / 2;
                  Y_l3 = baseY + lineGap / 2;
                  Y_l1 = Y_l2 - lineGap;
                } else if (line3Words.length === 0) {
                  Y_l1 = baseY - lineGap / 2;
                  Y_l2 = baseY + lineGap / 2;
                  Y_l3 = Y_l2 + lineGap;
                }

                const dropShadowStyle = "0px 4px 8px rgba(0,0,0,0.5)";

                return (
                  <>
                    {line1Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l1}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL1}px`,
                          textShadow: dropShadowStyle,
                        }}
                      >
                        {line1Words.map((w, i) => {
                          const isActive = i <= revealedMax;
                          const isCurrent = i === revealedMax;
                          return (
                            <span 
                              key={i} 
                              style={{ 
                                visibility: isActive ? "visible" : "hidden",
                                color: isCurrent ? customHighlightColor : "#FFFFFF" 
                              }}
                            >
                              {w}{i < line1Words.length - 1 ? " " : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {line2Word && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: keywordFont,
                          fontWeight: 400,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l2}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL2}px`,
                          textShadow: dropShadowStyle,
                          visibility: visibleL2 ? "visible" : "hidden",
                        }}
                      >
                        <span>{line2Word}</span>
                        <span style={{ color: customHighlightColor }}>.</span>
                      </div>
                    )}
                    {line3Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l3}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL3}px`,
                          textShadow: dropShadowStyle,
                        }}
                      >
                        {line3Words.map((w, i) => {
                          const absIdx = k + 1 + i;
                          const isActive = absIdx <= revealedMax;
                          const isCurrent = absIdx === revealedMax;
                          return (
                            <span 
                              key={i} 
                              style={{ 
                                visibility: isActive ? "visible" : "hidden",
                                color: isCurrent ? customHighlightColor : "#FFFFFF"
                              }}
                            >
                              {i > 0 ? " " : ""}{w}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              } else if (customCaptionTemplate === "sentence_highlight") {
                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;

                return (
                  <div
                    className="absolute flex flex-wrap justify-center items-center gap-x-[15px] gap-y-[10px] tracking-wide text-center"
                    style={{
                      left: `${safeAreaLeft}px`,
                      width: `${boxWidth}px`,
                      top: `${baseY}px`,
                      transform: "translateY(-50%)",
                      padding: containerPadding,
                      backgroundColor: containerBg,
                      borderRadius: containerBorderRadius,
                      border: containerBorder,
                    }}
                  >
                    {wordsObj.map((word, idx) => {
                      const isActive = idx === revealedMax;
                      return (
                        <span
                          key={idx}
                          className="transition-all duration-100 inline-block"
                          style={{
                            ...getTextStyle(isActive),
                            fontSize: `${customSize * (isActive ? templateStyle.keywordSizeScale : templateStyle.baseSizeScale)}px`,
                            transform: isActive ? "scale(1.05)" : "scale(1)",
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                );
              } else if (customCaptionTemplate === "cinematic_emerald") {
                const line1Words = wordsObj.slice(0, k).map(w => w.text);
                const line2Word = wordsObj[k]?.text || "";
                const line3Words = wordsObj[k + 1]?.text ? wordsObj.slice(k + 1).map(w => w.text) : [];
                const visibleL2 = k <= revealedMax ? line2Word : null;

                const bodyFont = `"${templateStyle.baseFont}", ${customFont}, sans-serif`;
                const bodyShadow = "0px 1px 0px rgba(255,255,255,0.55), 0px -1px 0px rgba(0,0,0,0.18), 0px 6px 16px rgba(0,0,0,0.4)";

                const baseSizePx = customSize * templateStyle.baseSizeScale;
                const keywordSizePx = customSize * templateStyle.keywordSizeScale;
                const sizeL1 = fitFontSizePx(baseSizePx, line1Words.join(" "), boxWidth);
                const sizeL3 = fitFontSizePx(baseSizePx, line3Words.join(" "), boxWidth);
                const sizeL2 = fitFontSizePx(keywordSizePx, line2Word, boxWidth * 1.05);

                const glossDark = darkenHex(customHighlightColor, 0.3);
                const glossLight = lightenHex(customHighlightColor, 0.45);

                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;
                const lineGap = baseSizePx * 1.1;

                let Y_l1 = baseY - lineGap;
                let Y_l2 = baseY;
                let Y_l3 = baseY + lineGap;

                if (line1Words.length === 0) {
                  Y_l2 = baseY - lineGap / 2;
                  Y_l3 = baseY + lineGap / 2;
                  Y_l1 = Y_l2 - lineGap;
                } else if (line3Words.length === 0) {
                  Y_l1 = baseY - lineGap / 2;
                  Y_l2 = baseY + lineGap / 2;
                  Y_l3 = Y_l2 + lineGap;
                }

                return (
                  <>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: "540px",
                        top: `${Y_l2}px`,
                        width: `${sizeL2 * 4}px`,
                        height: `${sizeL2 * 2.2}px`,
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(ellipse at center, ${glossLight}66 0%, ${customHighlightColor}33 45%, transparent 75%)`,
                        filter: "blur(18px)",
                      }}
                    />

                    {line1Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 600,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l1}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL1}px`,
                          textShadow: bodyShadow,
                        }}
                      >
                        {line1Words.map((w, i) => (
                          <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                            {w}{i < line1Words.length - 1 ? " " : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {line2Word && (
                      <div
                        className="absolute italic leading-none whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: `"${templateStyle.keywordFont}", ${customFont}, serif`,
                          fontWeight: 900,
                          left: "540px",
                          top: `${Y_l2}px`,
                          transform: "translate(-50%, -50%) rotate(-4deg)",
                          fontSize: `${sizeL2}px`,
                          letterSpacing: "-0.01em",
                          backgroundImage: `linear-gradient(160deg, ${glossDark} 0%, ${customHighlightColor} 45%, ${glossLight} 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          filter: `drop-shadow(0 0 18px ${glossLight}) drop-shadow(0 0 8px ${customHighlightColor}) drop-shadow(0 8px 12px rgba(0,0,0,0.3))`,
                          visibility: visibleL2 ? "visible" : "hidden",
                        }}
                      >
                        {line2Word}
                      </div>
                    )}

                    {line3Words.length > 0 && (
                      <div
                        className="absolute text-center whitespace-nowrap transition-all duration-100"
                        style={{
                          fontFamily: bodyFont,
                          fontWeight: 600,
                          color: "#FFFFFF",
                          left: "540px",
                          top: `${Y_l3}px`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${sizeL3}px`,
                          textShadow: bodyShadow,
                        }}
                      >
                        {line3Words.map((w, i) => (
                          <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                            {i > 0 ? " " : ""}{w}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              } else {
                const yPct = customYPositionPercent || 71.4;
                const baseY = canvasHeight * yPct / 100.0;

                return (
                  <div
                    className="absolute flex flex-wrap justify-center items-center gap-x-[15px] gap-y-[10px] tracking-wide text-center"
                    style={{
                      left: `${safeAreaLeft}px`,
                      width: `${boxWidth}px`,
                      top: `${baseY}px`,
                      transform: "translateY(-50%)",
                      padding: containerPadding,
                      backgroundColor: containerBg,
                      borderRadius: containerBorderRadius,
                      border: containerBorder,
                    }}
                  >
                    {wordsObj.map((word, idx) => {
                      return (
                        <span
                          key={idx}
                          className="transition-all duration-105 inline-block"
                          style={{
                            ...getTextStyle(false),
                            fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                );
              }
            };

            return (
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30"
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  transform: `scale(${S})`,
                  transformOrigin: "top left",
                  left: customXPositionPercent != null ? "0" : "auto",
                }}
              >
                {renderOverlayContent()}
              </div>
            );
          })()}

          {/* Safe-Box constraints Editor Overlay */}
          {boxEditMode && !activeExportId && (() => {
            const getCanvasDims = () => {
              if (motionScript?.global_settings?.canvas) {
                return {
                  width: motionScript.global_settings.canvas.width,
                  height: motionScript.global_settings.canvas.height,
                };
              }
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
              <BoxEditorOverlay
                box={displayBox}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                scale={S}
                onChange={setLiveDragBox}
                onCommit={(box) => {
                  setLiveDragBox(null);
                  setPendingBoxCommit(box);
                }}
              />
            );
          })()}

          {/* Progress bottom-bar line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#23272F]">
            <div
              className="h-full bg-[#00F5C4] transition-all duration-75"
              style={{ width: `${durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0}%` }}
            />
          </div>

          {/* Bounding Box Apply Dialog overlay */}
          {pendingBoxCommit && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0A0B0D]/95 border border-[#FFB800]/40 rounded-full pl-4 pr-1.5 py-1.5 shadow-xl text-left">
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
                className="text-[9px] font-bold uppercase tracking-wider text-[#0A0B0D] bg-[#FFB800] hover:bg-[#E5A500] rounded-full px-3 py-1 cursor-pointer disabled:opacity-50"
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
      <div className="h-12 bg-[#111317] border-t border-[#23272F] px-4 flex items-center justify-between shrink-0">
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
            className="p-1 text-white hover:text-[#00F5C4] transition-colors cursor-pointer"
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
              className="text-white hover:text-[#00F5C4] transition-colors cursor-pointer"
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
              className="w-16 h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer"
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
              ? "bg-[#FFB800] text-[#0A0B0D]"
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
