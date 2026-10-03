/**
 * Step 1 of the footage pipeline: transcribe the first part of every downloaded source with local whisper.cpp
 * (the Companion's install), so we can pick punchy lines and caption them with real word timings.
 *   pnpm exec tsx scripts/transcribe.ts [--seconds 180] [--filter name]
 * Writes .sources/<name>.words.json  ({ text, startMs, endMs }[] on the source's own clock).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { toCaptions, transcribe } from "@remotion/install-whisper-cpp";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const seconds = Number(arg("seconds") ?? 180);
const only = arg("filter");
const src = resolve(".sources");
const whisperData = join(process.env.LOCALAPPDATA ?? join(homedir(), ".local", "share"), "capseasy", "Data");

for (const f of readdirSync(src).filter((f) => f.endsWith(".webm"))) {
  const name = f.replace(/\.webm$/, "");
  if (only && name !== only) continue;
  const out = join(src, `${name}.words.json`);
  if (existsSync(out)) continue;
  const wav = join(src, `${name}.wav`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(src, f), "-t", String(seconds), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${f}`);
  const json = await transcribe({
    inputPath: wav,
    whisperPath: join(whisperData, "whisper-bin"),
    whisperCppVersion: "1.5.5",
    model: "small",
    modelFolder: join(whisperData, "whisper-models"),
    tokenLevelTimestamps: true,
    language: "en",
    printOutput: false,
  });
  const { captions } = toCaptions({ whisperCppOutput: json });
  const words = captions.map((c) => ({ text: c.text, startMs: c.startMs, endMs: c.endMs }));
  writeFileSync(out, JSON.stringify(words));
  console.log(`${name}: ${words.length} words`);
}
