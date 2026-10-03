/**
 * Renders the film scene by scene (so one scene can be re-rendered alone), then joins the parts.
 *   pnpm exec tsx scripts/render.ts [--only feed,looks] [--concurrency 4]
 * Output: out/parts/<scene>.mp4 and out/picture.mp4 (silent; scripts/mix.ts adds the score).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { SCENES } from "../src/timeline";

const arg = (n: string) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : undefined);
const only = arg("only")?.split(",");
const concurrency = Number(arg("concurrency") ?? 4);
const parts = resolve("out/parts");
mkdirSync(parts, { recursive: true });

const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), onProgress: () => undefined, publicDir: resolve("public") });
const chromiumOptions = { gl: "angle" as const };
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "Launch", puppeteerInstance: browser, chromiumOptions });

for (const [id, s] of Object.entries(SCENES)) {
  const file = join(parts, `${id}.mp4`);
  if (only ? !only.includes(id) : existsSync(file)) continue;
  const t = Date.now();
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 15,
    x264Preset: "medium",
    pixelFormat: "yuv420p",
    frameRange: [s.from, s.from + s.dur - 1],
    outputLocation: file,
    muted: true,
    concurrency,
    puppeteerInstance: browser,
    chromiumOptions,
    timeoutInMilliseconds: 180000,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        process.stdout.write(`${id} ${p * 10}%  `);
      }
    },
  });
  console.log(`\n${id}: ${s.dur} frames in ${Math.round((Date.now() - t) / 1000)} s`);
}
await browser.close({ silent: true });
// bundles are ~130 MB each and the disk is tight: never leave one behind
rmSync(serveUrl, { recursive: true, force: true });

// join (every part starts on a keyframe with identical settings, so no re-encode)
const list = join(parts, "list.txt");
writeFileSync(list, Object.keys(SCENES).map((id) => `file '${join(parts, `${id}.mp4`).replace(/\\/g, "/")}'`).join("\n"));
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", resolve("out/picture.mp4")], { stdio: "inherit" });
console.log(r.status === 0 ? "picture -> out/picture.mp4" : "concat failed");
