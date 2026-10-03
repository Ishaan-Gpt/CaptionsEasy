/**
 * Step 3: burn a viral look into every act-4 feed clip with the real caption engine (Remotion renderMedia),
 * so the 3D wall can use them as plain video textures.
 *   pnpm exec tsx scripts/capclips.ts [--filter id]
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { CAP_LOOKS } from "../src/caplooks";

const only = process.argv.includes("--filter") ? process.argv[process.argv.indexOf("--filter") + 1] : undefined;
const out = resolve("public/footage");
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), onProgress: () => undefined, publicDir: resolve("public") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
for (const [clipId, look] of Object.entries(CAP_LOOKS)) {
  if (only && clipId !== only) continue;
  const file = join(out, `cap_${clipId}.mp4`);
  if (existsSync(file) && !only) continue;
  const hero = !clipId.startsWith("f_");
  const inputProps = { clipId, look, sizeMul: hero ? 1.5 : 1.7 };
  const composition = await selectComposition({ serveUrl, id: hero ? "CapClipHero" : "CapClip", inputProps, puppeteerInstance: browser });
  const t = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: hero ? 15 : 19, outputLocation: file, inputProps, puppeteerInstance: browser, muted: true, concurrency: 4, chromiumOptions: { gl: "angle" } });
  spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", "1.5", "-i", file, "-frames:v", "1", "-q:v", "3", join(out, `cap_${clipId}.jpg`)], { stdio: "inherit" });
  console.log(`${clipId} (${look}) ${Math.round((Date.now() - t) / 1000)} s`);
}
await browser.close({ silent: true });
// bundles are ~130 MB each and the disk is tight: never leave one behind
rmSync(serveUrl, { recursive: true, force: true });
