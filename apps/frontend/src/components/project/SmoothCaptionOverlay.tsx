"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCardsFromTimeline,
  buildCardsFromWords,
  CaptionCanvas,
  CaptionStyle,
  EngineWord,
} from "@motion-ai/caption-engine";
import DraggableCaptionWrapper from "@/components/project/DraggableCaptionWrapper";

/**
 * The live caption layer of the studio preview.
 *
 * Renders the SAME CaptionEngine the export pipeline renders — true
 * WYSIWYG — and drives it with its own requestAnimationFrame clock reading
 * `video.currentTime` directly, so caption motion runs at display refresh
 * rate instead of the ~4Hz `timeupdate` event the old overlay used.
 *
 * Wraps the rendered captions in a DraggableCaptionWrapper so the user can
 * grab and reposition or stretch the caption box directly — no toolbar needed.
 */
export default function SmoothCaptionOverlay({
  videoRef,
  motionScript,
  localWords,
  style,
  wordLimit,
  canvasWidth,
  canvasHeight,
  scale,
  fallbackTimeMs,
  onUpdatePosition,
  onUpdateBoxMargins,
  onUpdateFontSize,
  onDragResizeEnd,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  motionScript: any;
  localWords: any[];
  style: CaptionStyle;
  wordLimit: number;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  /** Used when no <video> element exists yet (nothing uploaded). */
  fallbackTimeMs: number;
  onUpdatePosition: (x: number, y: number) => void;
  onUpdateBoxMargins: (left: number, right: number) => void;
  onUpdateFontSize: (size: number) => void;
  onDragResizeEnd: (
    x: number,
    y: number,
    left: number | null,
    right: number | null,
    size: number | null,
  ) => void;
}) {
  const [timeMs, setTimeMs] = useState(fallbackTimeMs);
  const [settled, setSettled] = useState(true);
  const lastRef = useRef(-1);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const t = v ? v.currentTime * 1000 : fallbackTimeMs;
      // Paused/scrubbing renders settle instantly (final layout, no
      // mid-entrance freeze); motion plays only while the video plays.
      const isSettled = !v || v.paused;
      // Skip renders only when truly idle; sub-ms jitter still updates so
      // scrubbing feels immediate.
      if (Math.abs(t - lastRef.current) > 0.5) {
        lastRef.current = t;
        setTimeMs(t);
      }
      setSettled((prev) => (prev === isSettled ? prev : isSettled));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, fallbackTimeMs]);

  const engineWords: EngineWord[] = useMemo(
    () =>
      (localWords || []).map((w: any) => ({
        text: w.text,
        startMs: w.start_ms,
        endMs: w.end_ms,
        highlighted: Boolean(w.highlighted),
      })),
    [localWords],
  );

  const cards = useMemo(() => {
    // Use the planner's timeline only while it was generated for the SAME
    // template the user is previewing. The moment they switch templates the
    // stale timeline's grouping (e.g. one-word cards from word_by_word)
    // would misrender the new layout — segment locally from the transcript
    // instead, and the regenerated motion script takes over on refetch.
    const scriptTemplate = motionScript?.global_settings?.caption_template;
    const scriptMatches = !scriptTemplate || scriptTemplate === style.template;
    if (motionScript?.timeline?.length && scriptMatches) {
      return buildCardsFromTimeline(motionScript.timeline, engineWords);
    }
    return buildCardsFromWords(engineWords, style.template === "word_by_word" ? Math.min(wordLimit, 5) : wordLimit);
  }, [motionScript, engineWords, wordLimit, style.template]);

  if (cards.length === 0) return null;

  // Compute current margin values from the style for the DraggableCaptionWrapper
  const box = style.box;
  const marginLeft = box ? box.left : Math.round(canvasWidth * 0.08);
  const marginRight = box ? box.right : Math.round(canvasWidth * 0.08);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none z-30"
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        pointerEvents: "none",
      }}
    >
      {/* The DraggableCaptionWrapper sits inside the scaled canvas space.
          It positions itself using the same xPercent/yPercent logic as
          boxContainerStyle, then handles drag/resize pointer events. */}
      <DraggableCaptionWrapper
        xPercent={style.xPercent ?? 50}
        yPercent={style.yPercent ?? 75}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        marginLeftPx={marginLeft}
        marginRightPx={marginRight}
        fontSize={style.size}
        onMove={onUpdatePosition}
        onResize={onUpdateBoxMargins}
        onResizeFont={onUpdateFontSize}
        onEnd={onDragResizeEnd}
      >
        <CaptionCanvas
          timeMs={timeMs}
          cards={cards}
          style={style}
          canvas={{ width: canvasWidth, height: canvasHeight }}
          settled={settled}
        />
      </DraggableCaptionWrapper>
    </div>
  );
}
