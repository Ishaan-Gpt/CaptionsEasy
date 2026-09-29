import React from "react";
import { AbsoluteFill, OffthreadVideo, getInputProps } from "remotion";
import { Subtitles } from "./Subtitles";

export const VideoWithCaptions: React.FC = () => {
  const inputProps = getInputProps() as any;
  const videoUrl = inputProps?.videoUrl;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoUrl && (
        <OffthreadVideo 
          src={videoUrl} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
      )}
      <Subtitles />
    </AbsoluteFill>
  );
};
