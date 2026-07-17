"use client";

import React, { useCallback, useRef, useState } from "react";
import { sanitizeBoxPx, defaultBoxPx } from "@/remotion/CaptionEngine";

export interface BoxMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

type HandleKind = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Props {
  /** Pixel margins from each canvas edge, in canvas space. Sanitized on the
   * way in — stored garbage from another canvas shape can't produce an
   * off-screen or inverted box. */
  box: BoxMargins;
  canvasWidth: number;
  canvasHeight: number;
  /** Which template is active — 3-line templates show the nested hero band. */
  template: string;
  /** The caption's vertical anchor (style.yPercent), drawn as a guide. */
  yPercent: number;
  /** Live drag feedback (not persisted). */
  onChange: (box: BoxMargins) => void;
  /** Final box on release — caller persists. */
  onCommit: (box: BoxMargins) => void;
}

// Fractions of the canvas — resolution-independent by construction.
const MIN_W_FRAC = 0.15;
const MIN_H_FRAC = 0.1;
const SNAP_FRAC = 0.015;

const THREE_LINE = new Set(["staggered_3line", "glow_stack", "cartoon_stack", "serif_pop", "cinematic_emerald"]);

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The caption region editor, rebuilt fraction-first:
 *
 *  - The editor fills its parent (the video frame) and positions everything
 *    in PERCENTAGES, measuring itself live during drags — there is no scale
 *    factor to go stale, so the region is pixel-glued to the video at every
 *    zoom/aspect/resize.
 *  - One clamp step covers every gesture: the region physically cannot
 *    leave the video frame, even mid-drag.
 *  - Nested guides show where text actually sits: the padded content area,
 *    the caption's vertical anchor, and the hero-word band for stacked
 *    templates.
 */
export function CaptionBoxEditor({
  box,
  canvasWidth,
  canvasHeight,
  template,
  yPercent,
  onChange,
  onCommit,
}: Props) {
  const canvas = { width: canvasWidth, height: canvasHeight };
  const safe = sanitizeBoxPx(box, canvas);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const toRect = (m: BoxMargins): Rect => ({
    x: m.left / canvasWidth,
    y: m.top / canvasHeight,
    w: (canvasWidth - m.left - m.right) / canvasWidth,
    h: (canvasHeight - m.top - m.bottom) / canvasHeight,
  });
  const toMargins = (r: Rect): BoxMargins => ({
    left: Math.round(r.x * canvasWidth),
    top: Math.round(r.y * canvasHeight),
    right: Math.round((1 - r.x - r.w) * canvasWidth),
    bottom: Math.round((1 - r.y - r.h) * canvasHeight),
  });

  const [liveRect, setLiveRect] = useState<Rect | null>(null);
  const [snapping, setSnapping] = useState(false);
  const drag = useRef<{ kind: HandleKind; startX: number; startY: number; start: Rect } | null>(null);
  const latest = useRef<Rect | null>(null);

  const rect = liveRect ?? toRect(safe);

  /** One clamp for every gesture: min size, fully inside [0,1]². */
  const clampRect = (r: Rect): Rect => {
    const w = clamp(r.w, MIN_W_FRAC, 1);
    const h = clamp(r.h, MIN_H_FRAC, 1);
    return { w, h, x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h) };
  };

  const down = useCallback(
    (kind: HandleKind) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { kind, startX: e.clientX, startY: e.clientY, start: liveRect ?? toRect(safe) };

      const move = (me: PointerEvent) => {
        const d = drag.current;
        const el = wrapperRef.current;
        if (!d || !el) return;
        // Measure the real on-screen frame LIVE — no stale scale factor.
        const frame = el.getBoundingClientRect();
        if (frame.width < 4 || frame.height < 4) return;
        const dx = (me.clientX - d.startX) / frame.width;
        const dy = (me.clientY - d.startY) / frame.height;
        let { x, y, w, h } = d.start;

        if (d.kind === "move") {
          x += dx;
          y += dy;
        } else {
          if (d.kind.includes("e")) w = d.start.w + dx;
          if (d.kind.includes("s")) h = d.start.h + dy;
          if (d.kind.includes("w")) {
            w = d.start.w - dx;
            x = d.start.x + d.start.w - Math.max(MIN_W_FRAC, w);
          }
          if (d.kind.includes("n")) {
            h = d.start.h - dy;
            y = d.start.y + d.start.h - Math.max(MIN_H_FRAC, h);
          }
        }

        let next = clampRect({ x, y, w, h });

        // Center snap: lock the region's horizontal center to the canvas
        // center when close — the alignment captions want most.
        const cx = next.x + next.w / 2;
        if (Math.abs(cx - 0.5) < SNAP_FRAC && (d.kind === "move" || d.kind.length === 1)) {
          next = { ...next, x: 0.5 - next.w / 2 };
          setSnapping(true);
        } else {
          setSnapping(false);
        }

        latest.current = next;
        setLiveRect(next);
        onChange(toMargins(next));
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const final = latest.current;
        drag.current = null;
        latest.current = null;
        setLiveRect(null);
        setSnapping(false);
        if (final) onCommit(toMargins(clampRect(final)));
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safe.top, safe.bottom, safe.left, safe.right, canvasWidth, canvasHeight, liveRect],
  );

  const pct = (v: number) => `${v * 100}%`;

  // The caption's y anchor as a fraction WITHIN the region (engine clamps
  // the anchor into the box the same way).
  const anchorInBox = rect.h > 0 ? clamp((clamp(yPercent / 100, rect.y, rect.y + rect.h) - rect.y) / rect.h, 0.06, 0.94) : 0.5;
  const isThreeLine = THREE_LINE.has(template);

  const handleDot = (kind: HandleKind): React.CSSProperties => {
    const isCorner = kind.length === 2;
    const size = isCorner ? 12 : undefined;
    const base: React.CSSProperties = {
      position: "absolute",
      background: "#DCC8A4",
      border: "1.5px solid #171208",
      boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
      pointerEvents: "auto",
      width: size,
      height: size,
      borderRadius: isCorner ? "50%" : 4,
      transform: "translate(-50%, -50%)",
    };
    const pos: Record<string, React.CSSProperties> = {
      nw: { left: 0, top: 0, cursor: "nwse-resize" },
      n: { left: "50%", top: 0, width: 28, height: 6, cursor: "ns-resize" },
      ne: { left: "100%", top: 0, cursor: "nesw-resize" },
      e: { left: "100%", top: "50%", width: 6, height: 28, cursor: "ew-resize" },
      se: { left: "100%", top: "100%", cursor: "nwse-resize" },
      s: { left: "50%", top: "100%", width: 28, height: 6, cursor: "ns-resize" },
      sw: { left: 0, top: "100%", cursor: "nesw-resize" },
      w: { left: 0, top: "50%", width: 6, height: 28, cursor: "ew-resize" },
    };
    return { ...base, ...pos[kind] };
  };

  return (
    <div ref={wrapperRef} className="absolute inset-0 z-30" style={{ pointerEvents: "none" }}>
      {/* Dim everything OUTSIDE the caption region. */}
      {[
        { left: 0, top: 0, width: "100%", height: pct(rect.y) },
        { left: 0, top: pct(rect.y + rect.h), width: "100%", bottom: 0 },
        { left: 0, top: pct(rect.y), width: pct(rect.x), height: pct(rect.h) },
        { left: pct(rect.x + rect.w), top: pct(rect.y), right: 0, height: pct(rect.h) },
      ].map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ ...s, background: "rgba(10,8,4,0.45)" } as React.CSSProperties} />
      ))}

      {/* Center snap guide */}
      {snapping && (
        <div
          className="absolute pointer-events-none"
          style={{ left: "50%", top: 0, width: 1, height: "100%", background: "#DCC8A4", opacity: 0.8 }}
        />
      )}

      {/* The caption region */}
      <div
        className="absolute"
        style={{
          left: pct(rect.x),
          top: pct(rect.y),
          width: pct(rect.w),
          height: pct(rect.h),
          border: "1.5px solid #DCC8A4",
          borderRadius: 6,
          boxSizing: "border-box",
          pointerEvents: "none",
          boxShadow: "0 0 0 1px rgba(23,18,8,0.6)",
        }}
      >
        {/* Move surface */}
        <div
          onPointerDown={down("move")}
          className="absolute inset-0"
          style={{ cursor: "move", pointerEvents: "auto" }}
          title="Drag to move the caption region"
        />

        {/* Nested content area — where text actually lays out. */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "4%",
            right: "4%",
            top: "6%",
            bottom: "6%",
            border: "1px dashed rgba(220,200,164,0.35)",
            borderRadius: 4,
          }}
        />

        {/* Caption anchor line */}
        <div
          className="absolute pointer-events-none"
          style={{ left: "4%", right: "4%", top: pct(anchorInBox), height: 1, background: "rgba(220,200,164,0.55)" }}
        />

        {/* Nested hero band for stacked templates */}
        {isThreeLine && (
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: "8%",
              right: "8%",
              top: pct(clamp(anchorInBox - 0.13, 0.06, 0.7)),
              height: "26%",
              border: "1px dashed rgba(220,200,164,0.5)",
              borderRadius: 4,
              background: "rgba(220,200,164,0.06)",
            }}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: "rgba(220,200,164,0.7)" }}>
              hero word
            </span>
          </div>
        )}

        {/* Size chip */}
        <div
          className="absolute pointer-events-none font-mono"
          style={{
            top: -22,
            left: 0,
            fontSize: 10,
            color: "#171208",
            background: "#DCC8A4",
            borderRadius: 4,
            padding: "1px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {Math.round(rect.w * 100)}% × {Math.round(rect.h * 100)}%
        </div>

        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleKind[]).map((k) => (
          <div key={k} onPointerDown={down(k)} style={handleDot(k)} title="Drag to resize" />
        ))}
      </div>
    </div>
  );
}

/** Proportional default region for a canvas — exposed so callers can offer
 * a "reset box" affordance with the same values the engine falls back to. */
export function defaultBoxForCanvas(canvasWidth: number, canvasHeight: number): BoxMargins {
  return defaultBoxPx({ width: canvasWidth, height: canvasHeight });
}
