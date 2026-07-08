import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@remotion/transitions", "remotion", "@remotion/player", "@remotion/media"],
};

export default nextConfig;
