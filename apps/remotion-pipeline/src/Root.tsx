import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { Subtitles } from "./Subtitles";

interface SubtitlesProps {
  timeline: { end_ms?: number }[];
  global_settings?: Record<string, unknown>;
  duration_frames?: number;
  fps?: number;
  [key: string]: unknown;
}

// engine.py renders with `--frames=0-{duration_frames}`, which can exceed the
// composition's own durationInFrames (150 = 5s @ 30fps was hardcoded here).
// Remotion validates the requested frame range against the composition's
// metadata and throws "frame range is not inbetween 0-149" for anything
// longer than 5 seconds. calculateMetadata lets duration come from the
// actual props (duration_frames, or the timeline's own last end_ms) instead.
const calculateMetadata: CalculateMetadataFunction<SubtitlesProps> = ({ props }) => {
  const fps = props.fps ?? 30;
  const lastEventEndMs = (props.timeline ?? []).reduce(
    (max, evt) => Math.max(max, evt.end_ms ?? 0),
    0
  );
  const durationInFrames = Math.max(
    1,
    props.duration_frames ?? Math.ceil((lastEventEndMs / 1000) * fps)
  );
  return { durationInFrames, fps };
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="Subtitles"
      component={Subtitles as any}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        timeline: [] as any[],
        global_settings: {} as any,
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
