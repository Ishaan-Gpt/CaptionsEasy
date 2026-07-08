import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ensureProductionFontsLoaded } from "../productionFonts";

export interface TypographyCompositionProps {
  text: string;
  font: string;
  size: number;
  weight: string;
  casing: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  colorMode: "solid" | "gradient";
  color: string;
  color2: string;
  strokeEnabled: boolean;
  strokeThickness: number;
  strokeColor: string;
  shadowEnabled: boolean;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  shadowColor: string;
  [key: string]: unknown;
}

function applyCasing(text: string, casing: TypographyCompositionProps["casing"]) {
  if (casing === "uppercase") return text.toUpperCase();
  if (casing === "lowercase") return text.toLowerCase();
  if (casing === "capitalize") return text.replace(/\b\w/g, (c) => c.toUpperCase());
  return text;
}

/** Real Remotion composition — same font-loading contract
 * (`ensureProductionFontsLoaded`, mirroring production's `ensureFontsLoaded`)
 * and the same `spring()` entrance CaptionsEasy's hero words use
 * (`Subtitles.tsx:224-231`), applied to freely-configurable typography so
 * every Text-tab-style control (casing/spacing/stroke/shadow/gradient —
 * `Subtitles.tsx:926-936`) can be explored against the real render engine. */
export const TypographyComposition: React.FC<TypographyCompositionProps> = ({
  text,
  font,
  size,
  weight,
  casing,
  letterSpacing,
  wordSpacing,
  lineSpacing,
  colorMode,
  color,
  color2,
  strokeEnabled,
  strokeThickness,
  strokeColor,
  shadowEnabled,
  shadowX,
  shadowY,
  shadowBlur,
  shadowColor,
}) => {
  ensureProductionFontsLoaded();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Identical config shape to the hero-word pop in Subtitles.tsx:224-231.
  const entrance = spring({ frame, fps, config: { damping: 16, stiffness: 260, mass: 0.4 }, durationInFrames: 20 });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const style: React.CSSProperties = {
    fontFamily: `"${font}"`,
    fontSize: `${size}px`,
    fontWeight: weight,
    textTransform: casing,
    letterSpacing: `${letterSpacing}px`,
    wordSpacing: `${wordSpacing}px`,
    lineHeight: lineSpacing,
    transform: `scale(${entrance})`,
    opacity,
    textAlign: "center",
    maxWidth: "90%",
  };

  if (strokeEnabled) {
    style.WebkitTextStroke = `${strokeThickness}px ${strokeColor}`;
    style.paintOrder = "stroke fill";
  }
  if (shadowEnabled) {
    style.textShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;
  }
  if (colorMode === "gradient") {
    style.backgroundImage = `linear-gradient(135deg, ${color}, ${color2})`;
    style.WebkitBackgroundClip = "text";
    style.backgroundClip = "text";
    style.color = "transparent";
  } else {
    style.color = color;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#07080A", justifyContent: "center", alignItems: "center" }}>
      <div style={style}>{applyCasing(text, casing)}</div>
    </AbsoluteFill>
  );
};
