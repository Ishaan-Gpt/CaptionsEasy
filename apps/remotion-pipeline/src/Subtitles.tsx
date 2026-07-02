import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

export interface TimelineEvent {
  id: string;
  start_ms: number;
  end_ms: number;
  layer: string;
  type: "caption" | "highlight";
  payload: {
    text?: string;
    font?: string;
    size?: number;
    weight?: string;
    color?: string;
    alignment?: string;
    animation?: string;
    indices?: number[];
    is_keyword?: boolean;
    size_scale?: number;
    background_style?: string;
    y_position_percent?: number;
  };
}

export interface SubtitlesProps {
  timeline: TimelineEvent[];
}

export const Subtitles: React.FC<SubtitlesProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // Find the active caption card
  const activeCaption = timeline.find(
    (evt) =>
      evt.type === "caption" &&
      currentTimeMs >= evt.start_ms &&
      currentTimeMs <= evt.end_ms
  );

  if (!activeCaption || !activeCaption.payload.text) {
    return null;
  }

  const {
    text,
    font = "Outfit",
    size = 48,
    weight = "800",
    color = "#FFFFFF",
    alignment = "center",
    animation = "pop",
  } = activeCaption.payload;

  // Find the active highlight event overlapping this caption's timeframe
  const activeHighlight = timeline.find(
    (evt) =>
      evt.type === "highlight" &&
      currentTimeMs >= evt.start_ms &&
      currentTimeMs <= evt.end_ms &&
      evt.start_ms >= activeCaption.start_ms &&
      evt.end_ms <= activeCaption.end_ms
  );

  // Split text by space to render word-by-word
  const rawWords = text.split(/\s+/);
  const highlightedIndex = activeHighlight?.payload.indices?.[0] ?? -1;

  // Spring animation for the active word pop
  let activeWordSpring = 1;
  if (activeHighlight) {
    const highlightStartFrame = (activeHighlight.start_ms / 1000) * fps;
    const elapsedFrames = Math.max(0, frame - highlightStartFrame);
    activeWordSpring = spring({
      frame: elapsedFrames,
      fps,
      config: {
        damping: 10,
        stiffness: 120,
        mass: 0.4,
      },
    });
  }

  // Load custom CSS font-face linking if needed, or rely on pre-loaded head links
  const fontStyle: React.CSSProperties = {
    fontFamily: font,
    fontWeight: weight,
  };

  // Renders a stylized container based on the background styles
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: `${activeCaption.payload.y_position_percent ?? 71.4}%`,
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
    justifyContent: "center",
    textAlign: alignment as any,
  };

  // Determine line/layout templates
  const lines = text.split("\n");

  return (
    <div style={containerStyle}>
      <div
        className="caption-content-wrapper"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
          gap: "10px 16px",
          width: "90%",
          maxWidth: "800px",
          ...fontStyle,
        }}
      >
        {rawWords.map((word, idx) => {
          const isActive = idx === highlightedIndex;
          const isKeyword = isActive && activeHighlight?.payload.is_keyword;

          // Compute font styling for this specific word
          let wordColor = color;
          let wordSize = size;
          let wordWeight = weight;
          let wordTransform = "scale(1)";
          let wordRotate = "0deg";
          let wordTextShadow = "none";
          let wordBorder = "none";
          let textDecoration = "none";

          // Active Word Spring scaling and rotation
          if (isActive) {
            wordColor = activeHighlight?.payload.color ?? "#FFEA00";
            const scale = 1 + (activeWordSpring - 1) * 0.25; // Scale up to 1.25x
            wordTransform = `scale(${scale})`;
            
            if (isKeyword) {
              wordRotate = "-4deg"; // Rotate active hero word slightly
              wordWeight = activeHighlight?.payload.weight ?? "900";
              const scaleFactor = activeHighlight?.payload.size_scale ?? 1.3;
              wordSize = size * scaleFactor;
            }
          }

          // Template styling overrides
          const isGlowStack = animation === "glow_stack";
          const isCartoonStack = animation === "cartoon_stack";
          const isSerifPop = animation === "serif_pop";

          if (isGlowStack) {
            if (isActive) {
              wordTextShadow = `0 0 10px ${wordColor}, 0 0 20px ${wordColor}`;
            } else {
              wordTextShadow = "0 0 5px rgba(255, 255, 255, 0.3)";
            }
          }

          if (isCartoonStack) {
            // High contrast text borders using standard text shadow hacks
            wordTextShadow = "3px 3px 0px #000000, -3px -3px 0px #000000, 3px -3px 0px #000000, -3px 3px 0px #000000";
          }

          if (isSerifPop) {
            wordWeight = "400"; // Elegant serif weight
            textDecoration = "italic";
          }

          return (
            <span
              key={`${idx}-${word}`}
              style={{
                display: "inline-block",
                color: wordColor,
                fontSize: `${wordSize}px`,
                fontWeight: wordWeight,
                fontStyle: isSerifPop ? "italic" : "normal",
                transform: `${wordTransform} rotate(${wordRotate})`,
                textShadow: wordTextShadow,
                textDecoration: textDecoration,
                transition: "color 0.15s ease, text-shadow 0.15s ease",
                padding: "2px 4px",
                position: "relative",
              }}
            >
              {word}
              {/* Serif Pop dynamic dot suffix */}
              {isSerifPop && isActive && isKeyword && (
                <span
                  style={{
                    position: "absolute",
                    right: "-8px",
                    bottom: "10px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: wordColor,
                    transform: `scale(${activeWordSpring})`,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
