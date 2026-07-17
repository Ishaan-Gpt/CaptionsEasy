import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, getInputProps } from "remotion";
import { ensureFontsLoaded } from "./fonts";
import {
  buildCardsFromTimeline,
  styleFromMotionScript,
  CaptionCardView,
  CaptionCard,
} from "./CaptionEngine";

/**
 * Export composition: a transparent overlay of animated captions, burned
 * over the source video by FFmpeg (app/render/engine.py render_remotion).
 *
 * All layout/animation/styling lives in CaptionEngine — the exact same
 * component the studio preview renders — so what the user saw is what
 * ships. This wrapper only:
 *   1. parses the MotionScript input props into cards + a style,
 *   2. mounts each card in its own <Sequence> (Remotion-native gating —
 *      exclusive windows, no overlap, cheap frames outside the window).
 */

const CardSequence: React.FC<{
  card: CaptionCard;
  style: ReturnType<typeof styleFromMotionScript>;
  width: number;
  height: number;
}> = ({ card, style, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The sequence starts at the card's own start frame, so absolute time is
  // the card start plus local elapsed time.
  const timeMs = card.startMs + (frame / fps) * 1000;
  return <CaptionCardView card={card} timeMs={timeMs} style={style} canvas={{ width, height }} />;
};

export const Subtitles: React.FC = () => {
  ensureFontsLoaded();
  const inputProps = getInputProps() as any;
  const { fps, width, height } = useVideoConfig();

  const { cards, style } = useMemo(() => {
    const timeline = inputProps?.timeline ?? [];
    return {
      cards: buildCardsFromTimeline(timeline),
      style: styleFromMotionScript(inputProps),
    };
  }, [inputProps]);

  return (
    <AbsoluteFill>
      {cards.map((card) => {
        const from = Math.floor((card.startMs / 1000) * fps);
        const durationInFrames = Math.max(1, Math.ceil(((card.endMs - card.startMs) / 1000) * fps));
        return (
          <Sequence key={card.id} from={from} durationInFrames={durationInFrames}>
            <CardSequence card={card} style={style} width={width} height={height} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
