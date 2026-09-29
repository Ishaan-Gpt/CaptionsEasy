import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@remotion/transitions",
    "remotion",
    "@remotion/player",
    "@remotion/media",
    "@motion-ai/caption-engine",
    "@capseasy/shared",
    "@capseasy/templates",
    "@capseasy/compositions",
  ],
};

export default nextConfig;
