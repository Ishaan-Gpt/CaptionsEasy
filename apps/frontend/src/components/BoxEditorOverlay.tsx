"use client";

import { useCallback, useRef, useState } from "react";

export interface BoxMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

type HandleKind =
  | "move"
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

interface Props {
  /** Pixel margins from each canvas edge, in canvas space (e.g. 1080x1920),
   * same convention as GlobalSettings.safe_area / CaptionPayload.box. */
  box: BoxMargins;
  canvasWidth: number;
  canvasHeight: number;
  /** canvas-px -> on-screen-px, same factor page.tsx already computes for
   * the caption preview overlay (`S = playerWidth / canvasWidth`). */
  scale: number;
  /** Fired continuously while dragging, for live visual feedback only —
   * does not persist anything. */
  onChange: (box: BoxMargins) => void;
  /** Fired once on drag-end with the final box — the caller decides
   * whether/how to persist it (e.g. prompting This Caption vs All
   * Captions). */
  onCommit: (box: BoxMargins) => void;
}

const MIN_SIZE_PX = 60; // canvas-space px; keeps the box from being dragged/resized into nothing.
const HANDLE_SIZE = 12; // on-screen px

function marginsToRect(box: BoxMargins, canvasWidth: number, canvasHeight: number) {
  return {
    x: box.left,
    y: box.top,
    width: canvasWidth - box.left - box.right,
    height: canvasHeight - box.top - box.bottom,
  };
}

function rectToMargins(rect: { x: number; y: number; width: number; height: number }, canvasWidth: number, canvasHeight: number): BoxMargins {
  return {
    left: rect.x,
    top: rect.y,
    right: canvasWidth - rect.x - rect.width,
    bottom: canvasHeight - rect.y - rect.height,
  };
}

/** Draggable/resizable overlay for editing a caption box (Phase C). Renders
 * a dashed rectangle with 8 resize handles + a center move area, on top of
 * the video preview. Position/size are expressed as canvas-space pixel
 * margins throughout (never on-screen px) — the caller is the only place
 * that needs the `scale` factor, purely for rendering. */
export function BoxEditorOverlay({ box, canvasWidth, canvasHeight, scale, onChange, onCommit }: Props) {
  const [dragBox, setDragBox] = useState<BoxMargins | null>(null);
  const dragState = useRef<{
    kind: HandleKind;
    startX: number;
    startY: number;
    startRect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  // handleUp (attached once per pointerdown) needs the box as of the most
  // recent pointermove, but it closes over the `dragBox` React state from
  // the render at pointerdown time — state updates from handleMove don't
  // reach that closure. Track the live value in a ref instead.
  const latestBoxRef = useRef<BoxMargins | null>(null);

  const activeBox = dragBox ?? box;
  const rect = marginsToRect(activeBox, canvasWidth, canvasHeight);

  const handlePointerDown = useCallback(
    (kind: HandleKind) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startRect = marginsToRect(box, canvasWidth, canvasHeight);
      dragState.current = { kind, startX: e.clientX, startY: e.clientY, startRect };

      const handleMove = (moveEvent: PointerEvent) => {
        const state = dragState.current;
        if (!state) return;
        const dxScreen = moveEvent.clientX - state.startX;
        const dyScreen = moveEvent.clientY - state.startY;
        const dx = dxScreen / scale;
        const dy = dyScreen / scale;

        let { x, y, width, height } = state.startRect;

        if (state.kind === "move") {
          x = state.startRect.x + dx;
          y = state.startRect.y + dy;
        } else {
          if (state.kind.includes("e")) {
            width = Math.max(MIN_SIZE_PX, state.startRect.width + dx);
          }
          if (state.kind.includes("s")) {
            height = Math.max(MIN_SIZE_PX, state.startRect.height + dy);
          }
          if (state.kind.includes("w")) {
            const newWidth = Math.max(MIN_SIZE_PX, state.startRect.width - dx);
            x = state.startRect.x + (state.startRect.width - newWidth);
            width = newWidth;
          }
          if (state.kind.includes("n")) {
            const newHeight = Math.max(MIN_SIZE_PX, state.startRect.height - dy);
            y = state.startRect.y + (state.startRect.height - newHeight);
            height = newHeight;
          }
        }

        // Clamp to canvas bounds so the box can never be dragged/resized
        // fully off-screen.
        x = Math.max(0, Math.min(x, canvasWidth - MIN_SIZE_PX));
        y = Math.max(0, Math.min(y, canvasHeight - MIN_SIZE_PX));
        width = Math.min(width, canvasWidth - x);
        height = Math.min(height, canvasHeight - y);

        const nextBox = rectToMargins({ x, y, width, height }, canvasWidth, canvasHeight);
        latestBoxRef.current = nextBox;
        setDragBox(nextBox);
        onChange(nextBox);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        const finalBox = latestBoxRef.current;
        dragState.current = null;
        latestBoxRef.current = null;
        setDragBox(null);
        if (finalBox) {
          onCommit(finalBox);
        }
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box, canvasWidth, canvasHeight, scale, onChange, onCommit]
  );

  const screenLeft = rect.x * scale;
  const screenTop = rect.y * scale;
  const screenWidth = rect.width * scale;
  const screenHeight = rect.height * scale;

  const edgeHandleStyle = (kind: HandleKind): React.CSSProperties => {
    const half = HANDLE_SIZE / 2;
    const base: React.CSSProperties = {
      position: "absolute",
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      background: "#00F5C4",
      border: "1.5px solid #0A0B0D",
      borderRadius: 3,
      pointerEvents: "auto",
    };
    const positions: Record<string, React.CSSProperties> = {
      nw: { left: -half, top: -half, cursor: "nwse-resize" },
      n: { left: screenWidth / 2 - half, top: -half, cursor: "ns-resize" },
      ne: { left: screenWidth - half, top: -half, cursor: "nesw-resize" },
      e: { left: screenWidth - half, top: screenHeight / 2 - half, cursor: "ew-resize" },
      se: { left: screenWidth - half, top: screenHeight - half, cursor: "nwse-resize" },
      s: { left: screenWidth / 2 - half, top: screenHeight - half, cursor: "ns-resize" },
      sw: { left: -half, top: screenHeight - half, cursor: "nesw-resize" },
      w: { left: -half, top: screenHeight / 2 - half, cursor: "ew-resize" },
    };
    return { ...base, ...positions[kind] };
  };

  return (
    <div
      className="absolute z-30"
      style={{
        left: screenLeft,
        top: screenTop,
        width: screenWidth,
        height: screenHeight,
        border: "2px dashed #00F5C4",
        background: "rgba(0,245,196,0.06)",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {/* Move handle — the whole box interior drags the box's position. */}
      <div
        onPointerDown={handlePointerDown("move")}
        className="absolute inset-0"
        style={{ cursor: "move", pointerEvents: "auto" }}
        title="Drag to reposition"
      />
      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleKind[]).map((kind) => (
        <div key={kind} onPointerDown={handlePointerDown(kind)} style={edgeHandleStyle(kind)} title="Drag to resize" />
      ))}
    </div>
  );
}
