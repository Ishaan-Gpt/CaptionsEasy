/**
 * Renders the Looks gallery previews with the REAL composition: a still (.webp) and a short looping clip (.mp4)
 * per look, into apps/frontend/public/looks/. Re-run after changing templates or looks:
 *   pnpm --filter @capseasy/compositions previews [--filter <lookId>]
 */
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import sharp from "sharp";
import { CaptionDocSchema } from "@capseasy/shared";
import { LOOKS, resolveStyle } from "@capseasy/templates";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const outDir = resolve("../../apps/frontend/public/looks");
const only = arg("filter");

const SIZE = 720; // square canvas; styles scale by the short edge, so captions keep their real proportions
const FPS = 30;
const GAP = 360;
const TEXT = "Stop scrolling and watch this incredible trick".split(" ");
const doc = CaptionDocSchema.parse({
  version: 2,
  language: "en",
  words: TEXT.map((t, i) => ({
    id: `w${i}`, text: t, startMs: 150 + i * GAP, endMs: 150 + i * GAP + GAP - 30,
    ...(t === "incredible" ? { emphasis: "hero", emoji: { char: "🔥", position: "above" } } : {}),
  })),
});
const durationMs = 150 + TEXT.length * GAP + 500;
// a soft "footage" backdrop so light and dark looks both read
const BACKDROP = "radial-gradient(ellipse 55% 60% at 50% 42%, rgba(255,255,255,0.10), transparent 70%), linear-gradient(160deg, #2c3b36 0%, #17201c 55%, #0e1311 100%)";

mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve("src/entry.ts"), onProgress: () => undefined });
const browser = await openBrowser("chrome");
const looks = LOOKS.filter((l) => !only || l.id === only);
const manifest: Record<string, { still: string; clip: string }> = {};

for (const look of looks) {
  // centre the caption in the square preview (looks are authored for the lower part of a 9:16 frame)
  const style = resolveStyle({ ...look.style, fontSize: look.style.fontSize * 1.45, maxWidth: 0.86, safeBox: { top: 0.03, bottom: 0.03, left: 0.03, right: 0.03 }, position: { x: 0.5, y: 0.56 }, emoji: { ...look.style.emoji, enabled: true } });
  const inputProps = {
    src: null, media: { width: SIZE, height: SIZE, fps: FPS, durationMs, rotation: 0 },
    doc, style, settings: look.settings, mode: "burn", backdrop: BACKDROP,
  };
  const composition = await selectComposition({ serveUrl, id: "CaptionedVideo", inputProps, puppeteerInstance: browser });

  // still: the moment the key word is being said (boxes, highlights and emoji are all visible)
  const png = join(outDir, `${look.id}.png`);
  // (later for slow entrances, so a wipe/fade has finished)
  const stillMs = Math.min(150 + 6 * GAP + 200, 150 + 5 * GAP + Math.max(120, style.entrance.durationMs + 40));
  await renderStill({ composition, serveUrl, output: png, frame: Math.round((stillMs / 1000) * FPS), inputProps, puppeteerInstance: browser, imageFormat: "png" });
  await sharp(png).resize(360, 360).webp({ quality: 82 }).toFile(join(outDir, `${look.id}.webp`));
  rmSync(png);

  // clip: the whole line, half resolution, small and silent, loops cleanly
  const mp4 = join(outDir, `${look.id}.mp4`);
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: mp4, inputProps, puppeteerInstance: browser, scale: 0.5, crf: 30, muted: true, pixelFormat: "yuv420p", x264Preset: "slow" });
  manifest[look.id] = { still: `/looks/${look.id}.webp`, clip: `/looks/${look.id}.mp4` };
  console.log(`${look.id}: still ${statSync(join(outDir, `${look.id}.webp`)).size >> 10} KB, clip ${statSync(mp4).size >> 10} KB`);
}
await browser.close({ silent: true });
if (!only) writeFileSync(join(outDir, "index.json"), JSON.stringify(manifest, null, 2));
