import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/** This machine's LAN addresses: lets a phone on the same Wi-Fi open the dev server (Next blocks unknown dev origins). */
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
