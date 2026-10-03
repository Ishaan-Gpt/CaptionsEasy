import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ClipAt } from "./components/Phone";
import { LookCaptions } from "./components/LookCaptions";
import { clip } from "./footage";

export type CapClipProps = { clipId: string; look: string; sizeMul: number };

/** One clip with one look burned in, on the product's 1080×1920 canvas (rendered once, used as a 3D texture). */
export const CapClip: React.FC<CapClipProps> = ({ clipId, look, sizeMul }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const c = clip(clipId);
  const t = f / fps;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: "0 0" }}>
        <ClipAt src={c.src} timeSec={t} />
        <LookCaptions lookId={look} words={c.words} timeMs={t * 1000} sizeMul={sizeMul} />
      </div>
    </AbsoluteFill>
  );
};

