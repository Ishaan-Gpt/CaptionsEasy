"use client";

import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { CaptionedVideo, type CaptionedVideoInput } from "@capseasy/compositions";

interface Props {
  input: CaptionedVideoInput;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  position: { x: number; y: number };
  onMovePosition: (p: { x: number; y: number }) => void;
  onTime: (ms: number) => void;
}

const clamp = (v: number) => Math.min(0.95, Math.max(0.05, v));

/** The same CaptionedVideo composition that renders the export, plus a drag handle to place the captions. */
export const StudioPlayer = forwardRef<PlayerRef, Props>(function StudioPlayer({ input, width, height, fps, durationMs, position, onMovePosition, onTime }, ref) {
  const innerRef = useRef<PlayerRef | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const durationInFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));

  const setRef = (r: PlayerRef | null) => {
    innerRef.current = r;
    if (typeof ref === "function") ref(r);
    else if (ref) (ref as React.MutableRefObject<PlayerRef | null>).current = r;
  };

  // ~15 Hz time feed so the caption list / timeline follow playback without re-rendering every frame
  useEffect(() => {
    const p = innerRef.current;
    if (!p) return;
    let last = 0;
    const onFrame = (e: { detail: { frame: number } }) => {
      const now = performance.now();
      if (now - last < 66) return;
      last = now;
      onTime((e.detail.frame / fps) * 1000);
    };
    const onSeeked = (e: { detail: { frame: number } }) => onTime((e.detail.frame / fps) * 1000);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onSeeked);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onSeeked);
    };
  }, [fps, onTime]);

  const move = (e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    let x = clamp((e.clientX - r.left) / r.width);
    let y = clamp((e.clientY - r.top) / r.height);
    if (Math.abs(x - 0.5) < 0.02) x = 0.5; // snap to the centre line
    onMovePosition({ x, y });
  };

  const style = useMemo<React.CSSProperties>(() => ({ width: "100%", height: "100%" }), []);
  return (
    <div className="flex h-full w-full items-center justify-center p-3">
      <div ref={boxRef} className="group relative overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-st-line" style={{ aspectRatio: `${width} / ${height}`, height: "100%", maxWidth: "100%" }}>
        <Player
          ref={setRef}
          component={CaptionedVideo as unknown as React.ComponentType<Record<string, unknown>>}
          inputProps={input as unknown as Record<string, unknown>}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={width}
          compositionHeight={height}
          style={style}
          controls
          clickToPlay
          acknowledgeRemotionLicense
          numberOfSharedAudioTags={0}
        />
        {dragging ? <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-st-em/50" /> : null}
        <div
          role="slider"
          aria-label="Caption position (drag)"
          aria-valuenow={Math.round(position.y * 100)}
          tabIndex={0}
          title="Drag to move captions"
          className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-st-lav bg-st-lav/25 shadow-[0_0_0_4px_rgba(0,0,0,0.25)] backdrop-blur transition ${dragging ? "scale-125 cursor-grabbing opacity-100" : "opacity-0 group-hover:opacity-90 focus:opacity-100 [@media(hover:none)]:opacity-60"}`}
          style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); }}
          onPointerMove={(e) => dragging && move(e)}
          onPointerUp={() => setDragging(false)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.05 : 0.01;
            if (e.key === "ArrowUp") onMovePosition({ ...position, y: clamp(position.y - step) });
            if (e.key === "ArrowDown") onMovePosition({ ...position, y: clamp(position.y + step) });
            if (e.key === "ArrowLeft") onMovePosition({ ...position, x: clamp(position.x - step) });
            if (e.key === "ArrowRight") onMovePosition({ ...position, x: clamp(position.x + step) });
          }}
        />
      </div>
    </div>
  );
});
