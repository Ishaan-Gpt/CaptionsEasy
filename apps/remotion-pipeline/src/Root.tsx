import React from "react";
import { Composition } from "remotion";
import { Subtitles } from "./Subtitles";

export const Root: React.FC = () => {
  return (
    <Composition
      id="Subtitles"
      component={Subtitles as any}
      durationInFrames={150} // Will be dynamically adjusted or overridden via input props
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        timeline: [] as any[],
        stylePreset: {} as any,
      }}
    />
  );
};
