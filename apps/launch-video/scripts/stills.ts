/**
 * Quick look at chosen frames: bundles once, renders stills, and tiles them into one contact sheet.
 *   pnpm exec tsx scripts/stills.ts --frames 0,60,120 [--comp Launch] [--out out/stills] [--scale 0.5]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1]! : d;
};
const frames = arg("frames", "0")!.split(",").map(Number);
const comp = arg("comp", "Launch")!;
const out = resolve(arg("out", "out/stills")!);
const scale = Number(arg("scale", "0.5"));
mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), onProgress: () => undefined, publicDir: resolve("public") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser, chromiumOptions: { gl: "angle" } });
const files: string[] = [];
for (const frame of frames) {
  const file = join(out, `${comp}-${frame}.jpg`);
  const t = Date.now();
  await renderStill({ composition, serveUrl, frame, output: file, imageFormat: "jpeg", jpegQuality: 85, scale, puppeteerInstance: browser, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 120000 });
  console.log(`frame ${frame} -> ${file} (${Date.now() - t} ms)`);
  files.push(file);
}
await browser.close({ silent: true });
// bundles are ~130 MB each and the disk is tight: never leave one behind
rmSync(serveUrl, { recursive: true, force: true });
if (files.length > 1) {
  const cols = Math.min(3, files.length);
  const rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap((f) => ["-i", f]);
  const blank = cols * rows - files.length;
  const pads = Array.from({ length: blank }, () => ["-f", "lavfi", "-i", `color=c=black:s=${Math.round(1920 * scale)}x${Math.round(1080 * scale)}`]).flat();
  const n = cols * rows;
  const layout = Array.from({ length: n }, (_, i) => `${(i % cols) === 0 ? "0" : Array.from({ length: i % cols }, () => "w0").join("+")}_${Math.floor(i / cols) === 0 ? "0" : Array.from({ length: Math.floor(i / cols) }, () => "h0").join("+")}`).join("|");
  const sheet = join(out, `sheet-${comp}-${frames[0]}.jpg`);
  spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, ...pads, "-filter_complex", `${Array.from({ length: n }, (_, i) => `[${i}:v]`).join("")}xstack=inputs=${n}:layout=${layout}`, "-frames:v", "1", "-q:v", "3", sheet], { stdio: "inherit" });
  console.log(`sheet -> ${sheet}`);
}
