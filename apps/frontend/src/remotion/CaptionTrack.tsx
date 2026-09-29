import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import type { TikTokPage } from "@remotion/captions";
import { CaptionStyleSettings } from "./CaptionComposition";
import { Interactive } from "remotion";

export const CaptionTrack: React.FC<{
  page: TikTokPage;
  styleSettings: CaptionStyleSettings;
}> = ({ page, styleSettings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Current time relative to the sequence start
  const currentTimeMs = (frame / fps) * 1000;
  const absoluteTimeMs = page.startMs + currentTimeMs;

  const getEntranceAnim = () => {
    switch (styleSettings.entranceAnim) {
      case "rise":
        return {
          translateY: interpolate(frame, [0, 15], [50, 0], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
          }),
        };
      case "pop":
        return {
          scale: spring({ frame, fps, config: { damping: 12, stiffness: 200 } }),
          opacity: interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" }),
        };
      case "fade":
        return {
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        };
      case "none":
      default:
        return { opacity: 1, scale: 1, translateY: 0 };
    }
  };

  const anim = getEntranceAnim();

  // Apply text transform
  let textTransform = "none";
  if (styleSettings.casing === "uppercase") textTransform = "uppercase";
  if (styleSettings.casing === "lowercase") textTransform = "lowercase";
  if (styleSettings.casing === "capitalize") textTransform = "capitalize";

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: "5%",
        width: "90%",
        top: `${styleSettings.yPositionPercent}%`,
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: styleSettings.alignment === "center" ? "center" : styleSettings.alignment === "right" ? "flex-end" : "flex-start",
        alignItems: "center",
        gap: "10px",
        scale: anim.scale ?? 1,
        translate: `0px ${anim.translateY ?? 0}px`,
        opacity: anim.opacity ?? 1,
      }}
    >
      {page.tokens.map((token, i) => {
        const isActive = absoluteTimeMs >= token.fromMs && absoluteTimeMs < token.toMs;
        const isPast = absoluteTimeMs > token.toMs;

        // Active animation
        const activeScale = isActive && styleSettings.highlightAnim === "pop" ? 1.15 : 1;
        const color = isActive ? styleSettings.highlightColor : styleSettings.color;

        const spanStyle: React.CSSProperties = {
          fontFamily: styleSettings.fontFamily,
          fontWeight: styleSettings.fontFace === "Extra Bold" || styleSettings.fontFace === "Bold" ? 800 : 400,
          fontSize: styleSettings.fontSize,
          color: isActive && styleSettings.backgroundEnabled ? "black" : color,
          textTransform: textTransform as React.CSSProperties["textTransform"],
          whiteSpace: "pre",
          scale: activeScale,
          textShadow: styleSettings.shadowEnabled && !styleSettings.backgroundEnabled ? "0px 4px 10px rgba(0,0,0,0.5)" : "none",
          WebkitTextStroke: styleSettings.strokeEnabled ? "3px black" : "none",
          backgroundColor: isActive && styleSettings.backgroundEnabled ? styleSettings.highlightColor : "transparent",
          padding: isActive && styleSettings.backgroundEnabled ? "4px 12px" : "0",
          borderRadius: "8px",
        };

        return (
          <span key={i} style={spanStyle}>
            {token.text}
          </span>
        );
      })}
    </Interactive.Div>
  );
};
