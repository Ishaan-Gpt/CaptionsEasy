import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@remotion/transitions",
    "remotion",
    "@remotion/player",
    "@remotion/media",
    "@motion-ai/caption-engine",
  ],
};

export default nextConfig;
