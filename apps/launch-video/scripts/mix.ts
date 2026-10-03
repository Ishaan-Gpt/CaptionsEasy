/**
 * Final master: picture + score -> out/CaptionsEasy-Launch.mp4 (H.264 High, 1080p60, AAC 320k, fast start).
 *   pnpm exec tsx scripts/mix.ts
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const r = spawnSync(
  "ffmpeg",
  [
    "-v", "error", "-y",
    "-i", resolve("out/picture.mp4"),
    "-i", resolve("out/score.wav"),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "320k",
    "-shortest",
    "-movflags", "+faststart",
    "-metadata", "title=CaptionsEasy — Launch",
    resolve("out/CaptionsEasy-Launch.mp4"),
  ],
  { stdio: "inherit" },
);
console.log(r.status === 0 ? "master -> out/CaptionsEasy-Launch.mp4" : "mix failed");
