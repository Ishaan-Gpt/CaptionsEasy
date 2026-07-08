import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { none } from "@remotion/transitions/none";

export type PresentationName = "fade" | "slide" | "wipe" | "flip" | "clockWipe" | "none";
export type TimingName = "linear" | "spring";

export interface TransitionsCompositionProps {
  presentation: PresentationName;
  timing: TimingName;
  transitionDurationInFrames: number;
  cardDurationInFrames: number;
  [key: string]: unknown;
}

const CARDS = [
  { label: "Caption Card 1", color: "#00F5C4" },
  { label: "Caption Card 2", color: "#FFB800" },
  { label: "Caption Card 3", color: "#4FA8FF" },
];

function resolvePresentation(name: PresentationName) {
  switch (name) {
    case "slide":
      return slide();
    case "wipe":
      return wipe();
    case "flip":
      return flip();
    case "clockWipe":
      return clockWipe({ width: 1920, height: 1080 });
    case "none":
      return none();
    default:
      return fade();
  }
}

function Card({ label, color }: { label: string; color: string }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07080A", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          background: color,
          color: "#0A0B0D",
          fontWeight: 900,
          fontSize: 40,
          padding: "28px 48px",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
}

/** Real `<TransitionSeries>` from `@remotion/transitions` — every
 * presentation/timing combo is the actual library primitive. Production
 * (`Subtitles.tsx:164-169`) currently cuts caption cards instantly with no
 * transition at all; this composition is the working prototype for adding
 * one between caption cards. */
export const TransitionsComposition: React.FC<TransitionsCompositionProps> = ({
  presentation,
  timing,
  transitionDurationInFrames,
  cardDurationInFrames,
}) => {
  const timingFn =
    timing === "spring"
      ? springTiming({ config: { damping: 200 }, durationInFrames: transitionDurationInFrames })
      : linearTiming({ durationInFrames: transitionDurationInFrames });

  return (
    <TransitionSeries>
      {CARDS.map((card, i) => (
        <React.Fragment key={card.label}>
          {i > 0 && <TransitionSeries.Transition presentation={resolvePresentation(presentation) as ReturnType<typeof fade>} timing={timingFn} />}
          <TransitionSeries.Sequence durationInFrames={cardDurationInFrames}>
            <Card label={card.label} color={card.color} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
