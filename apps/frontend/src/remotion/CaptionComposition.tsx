import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useVideoConfig, Video } from "remotion";
import { createTikTokStyleCaptions, Caption } from "@remotion/captions";
import { CaptionTrack } from "./CaptionTrack";

export type CaptionStyleSettings = {
  fontFamily: string;
  fontFace: string;
  fontSize: number;
  secondaryFontFamily: string;
  secondaryFontFace: string;
  secondaryFontSize: number;
  color: string;
  highlightColor: string;
  casing: "none" | "uppercase" | "lowercase" | "capitalize";
  alignment: "left" | "center" | "right";
  yPositionPercent: number;
  entranceAnim: "none" | "rise" | "pop" | "fade";
  highlightAnim: "pop" | "flash" | "underline" | "glow";
  shadowEnabled: boolean;
  strokeEnabled: boolean;
  backgroundEnabled: boolean;
};

export type CaptionCompositionProps = {
  videoUrl: string | null;
  captions: Caption[];
  styleSettings: CaptionStyleSettings;
};

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  videoUrl,
  captions,
  styleSettings,
}) => {
  const { fps } = useVideoConfig();

  // Combine into pages (TikTok style)
  const { pages } = useMemo(() => {
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: 1400, // standard chunking
    });
  }, [captions]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoUrl && <Video src={videoUrl} style={{ objectFit: "contain" }} />}
      <AbsoluteFill>
        {pages.map((page, index) => {
          const nextPage = pages[index + 1] ?? null;
          const startFrame = Math.round((page.startMs / 1000) * fps);
          
          let endFrame = Infinity;
          if (nextPage) {
            endFrame = Math.round((nextPage.startMs / 1000) * fps);
          } else {
            // Last page ends slightly after its last token
            const lastToken = page.tokens[page.tokens.length - 1];
            if (lastToken) {
              endFrame = Math.round(((lastToken.toMs + 300) / 1000) * fps);
            }
          }
          const durationInFrames = Math.max(1, endFrame - startFrame);

          if (durationInFrames <= 0) return null;

          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={durationInFrames}
              layout="none"
            >
              <CaptionTrack page={page} styleSettings={styleSettings} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
