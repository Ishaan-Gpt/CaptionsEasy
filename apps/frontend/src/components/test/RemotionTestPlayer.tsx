"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";

const ASPECT_RATIO_DIMENSIONS: Record<"9:16" | "16:9" | "1:1", { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

interface RemotionTestPlayerProps<T extends Record<string, unknown>> {
  component: React.ComponentType<T>;
  inputProps: T;
  durationInFrames: number;
  fps?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  loop?: boolean;
  className?: string;
}

/** Real `@remotion/player` `<Player>`, not a CSS approximation — every
 * /test subpage renders through this so frame timing, spring()/interpolate()
 * evaluation, and playback all run the actual Remotion runtime the same way
 * `apps/remotion-pipeline/src/Subtitles.tsx` does in production. Player ships
 * its own scrubber/play-pause/loop controls (the `controls` prop below), so
 * this wrapper doesn't reimplement playback UI — only frame + aspect-ratio
 * bookkeeping. */
export function RemotionTestPlayer<T extends Record<string, unknown>>({
  component,
  inputProps,
  durationInFrames,
  fps = 30,
  aspectRatio = "9:16",
  loop = true,
  className = "",
}: RemotionTestPlayerProps<T>) {
  const { width, height } = ASPECT_RATIO_DIMENSIONS[aspectRatio];

  // Player re-mounts the composition when width/height change identity, so
  // memoize the dimension pair rather than recomputing a fresh object every
  // render (which would restart playback on every keystroke in a sibling
  // control panel).
  const dimensions = useMemo(() => ({ width, height }), [width, height]);

  return (
    <div className={`rounded-xl border border-[#23272F] bg-[#0A0B0D] overflow-hidden ${className}`}>
      <Player
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        style={{ width: "100%", height: "auto" }}
        controls
        loop={loop}
        clickToPlay
        showVolumeControls={false}
      />
    </div>
  );
}
