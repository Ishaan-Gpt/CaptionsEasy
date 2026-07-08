import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";

export interface SequenceLayer {
  id: string;
  label: string;
  from: number;
  durationInFrames: number;
  color: string;
  top: number;
}

export interface SequencingCompositionProps {
  layers: SequenceLayer[];
  [key: string]: unknown;
}

function LayerCard({ label, color, durationInFrames }: { label: string; color: string; durationInFrames: number }) {
  // useCurrentFrame() inside a <Sequence> is LOCAL to that sequence — frame 0
  // here is the sequence's own `from`, not the composition's frame 0. This is
  // the exact mechanic that would let Subtitles.tsx swap its manual
  // start_ms/end_ms window-checking (TimelineEvent lookups via .find(), see
  // Subtitles.tsx:112-117) for real <Sequence> mounting.
  const localFrame = useCurrentFrame();
  const opacity = interpolate(localFrame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        background: color,
        borderRadius: 12,
        padding: "14px 22px",
        color: "#0A0B0D",
        fontWeight: 800,
        fontSize: 22,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>local frame {Math.round(localFrame)}</span>
    </div>
  );
}

/** Real `<Sequence>` from `remotion` — each layer only mounts (and its
 * `useCurrentFrame()` only starts counting) for its own `from`/
 * `durationInFrames` window, exactly how Remotion timelines are meant to be
 * composed. */
export const SequencingComposition: React.FC<SequencingCompositionProps> = ({ layers }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07080A" }}>
      {layers.map((layer) => (
        <Sequence key={layer.id} from={layer.from} durationInFrames={layer.durationInFrames}>
          <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: layer.top }}>
            <LayerCard label={layer.label} color={layer.color} durationInFrames={layer.durationInFrames} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
