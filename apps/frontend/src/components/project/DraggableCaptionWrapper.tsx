"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * DraggableCaptionWrapper — direct manipulation of the caption right on the
 * video, like a standard video editor. No toolbar:
 *
 *   - The selection box hugs the ACTUAL rendered caption (measured from the
 *     DOM every frame), however deeply nested the template's markup is.
 *   - Drag the body ................ move (xPercent / yPercent)
 *   - Drag a corner handle ......... scale the text (font size)
 *   - Drag a side handle ........... stretch the box width (margins)
 *   - Two-finger pinch on touch .... scale the text
 *
 * All geometry is computed in canvas-space (e.g. 1080×1920); the measured
 * on-screen scale converts pointer deltas back into canvas pixels, so it
 * stays correct under player zoom and window resizes.
 */

interface CaptionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DraggableCaptionWrapperProps {
  xPercent: number;
  yPercent: number;
  canvasWidth: number;
  canvasHeight: number;
  marginLeftPx: number;
  marginRightPx: number;
  fontSize: number;
  onMove: (xPercent: number, yPercent: number) => void;
  onResize: (marginLeft: number, marginRight: number) => void;
  onResizeFont: (size: number) => void;
  onEnd: (
    xPercent: number,
    yPercent: number,
    marginLeft: number | null,
    marginRight: number | null,
    fontSize: number | null,
  ) => void;
  children: React.ReactNode;
}

type InteractionMode =
  | "idle"
  | "drag"
  | "resize-left"
  | "resize-right"
  | "scale-nw"
  | "scale-ne"
  | "scale-sw"
  | "scale-se"
  | "pinch";

const MIN_FONT = 12;
const MAX_FONT = 200;

const touchDistance = (t: TouchList) =>
  Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

/**
 * Tight bounding box of the rendered glyphs inside `el`, via Range rects —
 * unlike `el.getBoundingClientRect()`, this ignores an ancestor's own fixed
 * CSS width (every template's box container is deliberately as wide as the
 * caption's margins, for centering multi-line/splash layouts) and instead
 * hugs the actual painted text, including absolutely-positioned children.
 */
function measureContentRect(el: HTMLElement): DOMRect | null {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width === 0 && r.height === 0) continue;
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    if (left === Infinity) return null;
    return new DOMRect(left, top, right - left, bottom - top);
  } catch {
    return null;
  }
}

export default function DraggableCaptionWrapper({
  xPercent,
  yPercent,
  canvasWidth,
  canvasHeight,
  marginLeftPx,
  marginRightPx,
  fontSize,
  onMove,
  onResize,
  onResizeFont,
  onEnd,
  children,
}: DraggableCaptionWrapperProps) {
  const contentWrapRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [hovered, setHovered] = useState(false);

  // The caption's real on-screen box, converted to canvas-space.
  const [rect, setRect] = useState<CaptionRect | null>(null);
  // Actual canvas→screen scale (includes overlay scale AND player zoom).
  const [uiScale, setUiScale] = useState(1);
  const uiScaleRef = useRef(1);

  // Mutable drag state — avoids re-renders during pointer moves.
  const ds = useRef({
    startMouseX: 0,
    startMouseY: 0,
    startXPercent: xPercent,
    startYPercent: yPercent,
    startMarginLeft: marginLeftPx,
    startMarginRight: marginRightPx,
    startFontSize: fontSize,
    // Screen-space box center + start distance, for corner scaling.
    centerScreenX: 0,
    centerScreenY: 0,
    startDist: 1,
    startPinchDist: 1,
    curXPercent: xPercent,
    curYPercent: yPercent,
    curMarginLeft: marginLeftPx,
    curMarginRight: marginRightPx,
    curFontSize: fontSize,
    didResize: false,
    didScale: false,
    mode: "idle" as InteractionMode,
  });

  useEffect(() => {
    if (mode === "idle") {
      ds.current.curXPercent = xPercent;
      ds.current.curYPercent = yPercent;
      ds.current.curMarginLeft = marginLeftPx;
      ds.current.curMarginRight = marginRightPx;
      ds.current.curFontSize = fontSize;
    }
  }, [xPercent, yPercent, marginLeftPx, marginRightPx, fontSize, mode]);

  /* ——— Measure the real caption box every frame ——— */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const wrap = contentWrapRef.current;
      const target = wrap?.firstElementChild as HTMLElement | null;
      if (wrap && target) {
        const wr = wrap.getBoundingClientRect();
        const tr = measureContentRect(target) ?? target.getBoundingClientRect();
        const s = wr.width > 0 ? wr.width / canvasWidth : 1;
        uiScaleRef.current = s;
        setUiScale((prev) => (Math.abs(prev - s) / s > 0.02 ? s : prev));
        if (tr.width > 0 && tr.height > 0) {
          const next: CaptionRect = {
            left: (tr.left - wr.left) / s,
            top: (tr.top - wr.top) / s,
            width: tr.width / s,
            height: tr.height / s,
          };
          setRect((prev) =>
            prev &&
            Math.abs(prev.left - next.left) < 1 &&
            Math.abs(prev.top - next.top) < 1 &&
            Math.abs(prev.width - next.width) < 1 &&
            Math.abs(prev.height - next.height) < 1
              ? prev
              : next,
          );
        } else {
          setRect((prev) => (prev === null ? prev : null));
        }
      } else {
        setRect((prev) => (prev === null ? prev : null));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvasWidth]);

  /* ——— Begin an interaction ——— */
  const beginInteraction = useCallback(
    (m: InteractionMode, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isTouch = "touches" in e;
      // Two fingers anywhere on the caption = pinch-to-scale.
      if (isTouch && (e as React.TouchEvent).touches.length >= 2) {
        m = "pinch";
      }
      const t = isTouch ? (e as React.TouchEvent).touches[0] : (e as React.MouseEvent);
      const clientX = t.clientX;
      const clientY = t.clientY;

      const wrap = contentWrapRef.current;
      const target = wrap?.firstElementChild as HTMLElement | null;
      const tr = target ? (measureContentRect(target) ?? target.getBoundingClientRect()) : undefined;

      const d = ds.current;
      d.startMouseX = clientX;
      d.startMouseY = clientY;
      d.startXPercent = xPercent;
      d.startYPercent = yPercent;
      d.startMarginLeft = marginLeftPx;
      d.startMarginRight = marginRightPx;
      d.startFontSize = fontSize;
      d.curXPercent = xPercent;
      d.curYPercent = yPercent;
      d.curMarginLeft = marginLeftPx;
      d.curMarginRight = marginRightPx;
      d.curFontSize = fontSize;
      d.didResize = false;
      d.didScale = false;
      d.mode = m;

      if (tr) {
        d.centerScreenX = tr.left + tr.width / 2;
        d.centerScreenY = tr.top + tr.height / 2;
        d.startDist = Math.max(8, Math.hypot(clientX - d.centerScreenX, clientY - d.centerScreenY));
      }
      if (m === "pinch" && isTouch) {
        d.startPinchDist = Math.max(8, touchDistance((e as React.TouchEvent).touches as any));
      }
      setMode(m);
    },
    [xPercent, yPercent, marginLeftPx, marginRightPx, fontSize],
  );

  /* ——— Global move / up handlers while interacting ——— */
  useEffect(() => {
    if (mode === "idle") return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const d = ds.current;
      const s = uiScaleRef.current || 1;

      if (d.mode === "pinch") {
        const te = e as TouchEvent;
        if (te.touches && te.touches.length >= 2) {
          const factor = touchDistance(te.touches) / d.startPinchDist;
          const newSize = Math.max(MIN_FONT, Math.min(MAX_FONT, d.startFontSize * factor));
          d.curFontSize = newSize;
          d.didScale = true;
          onResizeFont(newSize);
        }
        return;
      }

      const t = "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      if (!t) return;
      const clientX = t.clientX;
      const clientY = t.clientY;
      const dx = (clientX - d.startMouseX) / s;
      const dy = (clientY - d.startMouseY) / s;

      if (d.mode === "drag") {
        const newX = Math.max(2, Math.min(98, d.startXPercent + (dx / canvasWidth) * 100));
        const newY = Math.max(2, Math.min(98, d.startYPercent + (dy / canvasHeight) * 100));
        d.curXPercent = newX;
        d.curYPercent = newY;
        onMove(newX, newY);
      } else if (d.mode === "resize-left" || d.mode === "resize-right") {
        // Keep at least 20% of the canvas width for text — the engine's
        // sanitizer discards boxes thinner than 15%.
        const minWidth = canvasWidth * 0.2;
        if (d.mode === "resize-left") {
          const maxLeft = canvasWidth - d.curMarginRight - minWidth;
          d.curMarginLeft = Math.max(0, Math.min(maxLeft, d.startMarginLeft + dx));
        } else {
          const maxRight = canvasWidth - d.curMarginLeft - minWidth;
          d.curMarginRight = Math.max(0, Math.min(maxRight, d.startMarginRight - dx));
        }
        d.didResize = true;
        onResize(d.curMarginLeft, d.curMarginRight);
      } else {
        // Corner scale: text size follows the pointer's distance from the
        // box center, exactly like scaling a layer in a video editor.
        const dist = Math.hypot(clientX - d.centerScreenX, clientY - d.centerScreenY);
        const factor = dist / d.startDist;
        const newSize = Math.max(MIN_FONT, Math.min(MAX_FONT, d.startFontSize * factor));
        d.curFontSize = newSize;
        d.didScale = true;
        onResizeFont(newSize);
      }
    };

    const handleUp = () => {
      const d = ds.current;
      onEnd(
        d.curXPercent,
        d.curYPercent,
        d.didResize ? d.curMarginLeft : null,
        d.didResize ? d.curMarginRight : null,
        d.didScale ? d.curFontSize : null,
      );
      setMode("idle");
    };

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [mode, canvasWidth, canvasHeight, onMove, onResize, onResizeFont, onEnd]);

  const isActive = mode !== "idle";
  const showHandles = hovered || isActive;

  // Handle/border sizes are authored in SCREEN pixels then converted into
  // canvas-space, so they look identical at any zoom level.
  const px = (n: number) => n / (uiScale || 1);
  const handleSize = px(11);
  const hitPad = px(8); // extra invisible touch padding around each handle

  const cornerDefs: { m: InteractionMode; x: "left" | "right"; y: "top" | "bottom"; cursor: string }[] = [
    { m: "scale-nw", x: "left", y: "top", cursor: "nwse-resize" },
    { m: "scale-ne", x: "right", y: "top", cursor: "nesw-resize" },
    { m: "scale-sw", x: "left", y: "bottom", cursor: "nesw-resize" },
    { m: "scale-se", x: "right", y: "bottom", cursor: "nwse-resize" },
  ];

  const handleFill = (active: boolean) => ({
    background: active ? "#4FC3F7" : "#FFFFFF",
    border: `${px(1.5)}px solid rgba(0,0,0,0.35)`,
    boxShadow: `0 ${px(1)}px ${px(4)}px rgba(0,0,0,0.4)`,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {/* The real caption render — measured, never intercepted. */}
      <div ref={contentWrapRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {children}
      </div>

      {/* Selection box tracking the measured caption rect */}
      {rect && (
        <div
          onMouseDown={(e) => beginInteraction("drag", e)}
          onTouchStart={(e) => beginInteraction("drag", e)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            if (!isActive) setHovered(false);
          }}
          style={{
            position: "absolute",
            left: `${rect.left - px(6)}px`,
            top: `${rect.top - px(6)}px`,
            width: `${rect.width + px(12)}px`,
            height: `${rect.height + px(12)}px`,
            cursor: mode === "drag" ? "grabbing" : "grab",
            pointerEvents: "auto",
            userSelect: "none",
            touchAction: "none",
            zIndex: 40,
          }}
        >
          {/* Outline — dashed on hover, solid while interacting */}
          {showHandles && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: `${px(1.5)}px ${isActive ? "solid" : "dashed"} rgba(255,255,255,${isActive ? 0.9 : 0.55})`,
                borderRadius: px(6),
                pointerEvents: "none",
              }}
            />
          )}

          {/* Corner handles — scale text size */}
          {showHandles &&
            cornerDefs.map((c) => (
              <div
                key={c.m}
                onMouseDown={(e) => beginInteraction(c.m, e)}
                onTouchStart={(e) => beginInteraction(c.m, e)}
                style={{
                  position: "absolute",
                  [c.x]: `${-handleSize / 2 - hitPad}px`,
                  [c.y]: `${-handleSize / 2 - hitPad}px`,
                  width: `${handleSize + hitPad * 2}px`,
                  height: `${handleSize + hitPad * 2}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: c.cursor,
                  pointerEvents: "auto",
                  touchAction: "none",
                }}
              >
                <div
                  style={{
                    width: `${handleSize}px`,
                    height: `${handleSize}px`,
                    borderRadius: px(2.5),
                    ...handleFill(isActive && mode === c.m),
                  }}
                />
              </div>
            ))}

          {/* Side handles — stretch box width */}
          {showHandles &&
            (["resize-left", "resize-right"] as const).map((m) => (
              <div
                key={m}
                onMouseDown={(e) => beginInteraction(m, e)}
                onTouchStart={(e) => beginInteraction(m, e)}
                style={{
                  position: "absolute",
                  [m === "resize-left" ? "left" : "right"]: `${-handleSize / 2 - hitPad}px`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: `${handleSize + hitPad * 2}px`,
                  height: `${px(30) + hitPad * 2}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                  touchAction: "none",
                }}
              >
                <div
                  style={{
                    width: `${px(5)}px`,
                    height: `${px(30)}px`,
                    borderRadius: px(3),
                    ...handleFill(isActive && mode === m),
                  }}
                />
              </div>
            ))}

          {/* Live size badge while scaling */}
          {isActive && (mode === "pinch" || mode.startsWith("scale")) && (
            <div
              style={{
                position: "absolute",
                top: `${-px(30)}px`,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: `${px(11)}px`,
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#FFFFFF",
                background: "rgba(0,0,0,0.75)",
                borderRadius: px(4),
                padding: `${px(2)}px ${px(7)}px`,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {Math.round(ds.current.curFontSize)}px
            </div>
          )}
        </div>
      )}
    </div>
  );
}
