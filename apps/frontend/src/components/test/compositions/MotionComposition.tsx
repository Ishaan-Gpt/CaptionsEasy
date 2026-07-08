import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";

export type EasingPreset = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic" | "back";
export type ExtrapolateMode = "clamp" | "extend" | "identity";
export type MotionMode = "spring" | "interpolate";

export interface MotionCompositionProps {
  mode: MotionMode;
  // spring() params — identical shape to Subtitles.tsx:153-161 / :225-230
  damping: number;
  stiffness: number;
  mass: number;
  overshootClamping: boolean;
  springDurationInFrames: number;
  // interpolate()/Easing params
  easingPreset: EasingPreset;
  extrapolateLeft: ExtrapolateMode;
  extrapolateRight: ExtrapolateMode;
  animDelay: number;
  animLength: number;
  [key: string]: unknown;
}

function resolveEasing(preset: EasingPreset) {
  switch (preset) {
    case "ease-in":
      return Easing.in(Easing.cubic);
    case "ease-out":
      return Easing.out(Easing.cubic);
    case "ease-in-out":
      return Easing.inOut(Easing.cubic);
    case "bounce":
      return Easing.bounce;
    case "elastic":
      return Easing.elastic(1);
    case "back":
      return Easing.back(1.5);
    default:
      return Easing.linear;
  }
}

/** Real `spring()`/`interpolate()`/`Easing` from the `remotion` package —
 * the exact functions `Subtitles.tsx` calls for the hero-word pop
 * (`heroPopSpring`, `Subtitles.tsx:224-231`) and the active-word bounce
 * (`activeWordSpring`, `:152-161`). Toggling `mode` swaps which primitive
 * drives the box's scale/position so both can be compared like-for-like. */
export const MotionComposition: React.FC<MotionCompositionProps> = ({
  mode,
  damping,
  stiffness,
  mass,
  overshootClamping,
  springDurationInFrames,
  easingPreset,
  extrapolateLeft,
  extrapolateRight,
  animDelay,
  animLength,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let scale = 1;
  let translateY = 0;

  if (mode === "spring") {
    scale = spring({
      frame: frame - animDelay,
      fps,
      config: { damping, stiffness, mass, overshootClamping },
      durationInFrames: springDurationInFrames || undefined,
    });
  } else {
    translateY = interpolate(frame, [animDelay, animDelay + animLength], [120, 0], {
      easing: resolveEasing(easingPreset),
      extrapolateLeft,
      extrapolateRight,
    });
    scale = interpolate(frame, [animDelay, animDelay + Math.min(10, animLength)], [0.6, 1], {
      easing: resolveEasing(easingPreset),
      extrapolateLeft,
      extrapolateRight,
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#07080A", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          width: 220,
          height: 220,
          borderRadius: 28,
          background: "linear-gradient(135deg, #00F5C4, #FFB800)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      />
    </AbsoluteFill>
  );
};
