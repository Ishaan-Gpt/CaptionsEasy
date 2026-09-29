import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig, Video, useCurrentFrame } from "remotion";
import { 
  CaptionCanvas, 
  CaptionStyle, 
  buildCardsFromWords 
} from "@motion-ai/caption-engine";
import { Caption } from "@remotion/captions";

export type CaptionCompositionProps = {
  videoUrl: string | null;
  captions: Caption[];
  styleSettings: CaptionStyle;
};

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  videoUrl,
  captions,
  styleSettings,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const timeMs = (frame / fps) * 1000;

  // Convert generic Caption[] to EngineWord[]
  const engineWords = useMemo(() => {
    return captions.map((c) => ({
      text: c.text,
      startMs: c.startMs,
      endMs: c.endMs,
      highlighted: false, // Could be mapped if supported
    }));
  }, [captions]);

  // Build perfectly clamped non-overlapping cards for the Engine
  const cards = useMemo(() => {
    return buildCardsFromWords(engineWords, 5); // 5 words limit
  }, [engineWords]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoUrl && <Video src={videoUrl} style={{ objectFit: "contain" }} />}
      <CaptionCanvas 
        timeMs={timeMs}
        cards={cards}
        style={styleSettings}
        canvas={{ width, height }}
        settled={false} // Enable full entrance/exit animations
      />
    </AbsoluteFill>
  );
};

