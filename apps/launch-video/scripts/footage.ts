/**
 * Step 2 of the footage pipeline: cut the chosen moments out of the sources as vertical 9:16 clips, with
 * word timings normalized by caption-engine (the product's own normalizer) and shifted to the clip's clock.
 *   pnpm exec tsx scripts/footage.ts
 * Writes public/footage/<id>.mp4 (+ .jpg poster, + .wav voice where `voice`) and src/footage.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fromWhisperCaptions } from "@motion-ai/caption-engine/core";

type Spec = {
  id: string;
  src: string;
  /** seconds in the source */
  from: number;
  dur: number;
  /** horizontal centre of the face, 0–1 of the source width */
  faceX: number;
  /** "hero" = 1080×1920 for phone close-ups, "feed" = 540×960 for the 3D wall */
  size: "hero" | "feed";
  voice?: boolean;
  /** fix whisper's spelling of names etc. */
  fix?: Record<string, string>;
};

// the moments, chosen from the transcripts (see .sources/*.words.json)
const SPECS: Spec[] = [
  // the film's voice: "when I speak the real deep Patois, most people that I talk to can't even understand what I'm saying"
  { id: "omar_line", src: "omar", from: 43.2, dur: 12.4, faceX: 0.6, size: "hero", voice: true, fix: { Pato: "Patois", "Pato,": "Patois," } },
  // silent scroll victim (S2)
  { id: "jerry_mute", src: "jerry", from: 30, dur: 8, faceX: 0.6, size: "hero" },
  // edit demo (S8)
  { id: "sandra_name", src: "sandra", from: 0, dur: 6.5, faceX: 0.5, size: "hero", voice: true, fix: { Sondra: "Sandra" } },
  { id: "musuweu_lang", src: "musuweu", from: 24.4, dur: 9, faceX: 0.62, size: "hero", voice: true },
  // the feed wall (uncaptioned in act 1, captioned in act 4)
  { id: "f_gereon", src: "gereon", from: 15, dur: 7, faceX: 0.49, size: "feed" },
  { id: "f_gereon2", src: "gereon", from: 60, dur: 7, faceX: 0.49, size: "feed" },
  { id: "f_mckensie", src: "mckensie", from: 12, dur: 7, faceX: 0.5, size: "feed" },
  { id: "f_mckensie2", src: "mckensie", from: 40, dur: 7, faceX: 0.5, size: "feed" },
  { id: "f_sam", src: "sam", from: 12, dur: 7, faceX: 0.55, size: "feed" },
  { id: "f_sam2", src: "sam", from: 50, dur: 7, faceX: 0.55, size: "feed" },
  { id: "f_william", src: "william", from: 15, dur: 7, faceX: 0.5, size: "feed" },
  { id: "f_william2", src: "william", from: 80, dur: 7, faceX: 0.5, size: "feed" },
  { id: "f_omar", src: "omar", from: 17, dur: 7, faceX: 0.6, size: "feed" },
  { id: "f_omar2", src: "omar", from: 95, dur: 7, faceX: 0.6, size: "feed" },
  { id: "f_musuweu", src: "musuweu", from: 2, dur: 7, faceX: 0.62, size: "feed" },
  { id: "f_musuweu2", src: "musuweu", from: 46, dur: 7, faceX: 0.62, size: "feed" },
  { id: "f_sandra", src: "sandra", from: 25, dur: 7, faceX: 0.5, size: "feed" },
  { id: "f_jerry", src: "jerry", from: 60, dur: 7, faceX: 0.6, size: "feed" },
  { id: "f_jerry2", src: "jerry", from: 110, dur: 7, faceX: 0.6, size: "feed" },
];

const src = resolve(".sources");
const out = resolve("public/footage");
mkdirSync(out, { recursive: true });

const ff = (args: string[]) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
};
const size = (file: string) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
  const [w, h] = r.stdout.trim().split(",").map(Number);
  return { w: w!, h: h! };
};

const manifest: Record<string, { src: string; poster: string; voice?: string; durationSec: number; words: { text: string; startMs: number; endMs: number }[] }> = {};
for (const s of SPECS) {
  const file = join(src, `${s.src}.webm`);
  const { w: iw, h: ih } = size(file);
  const cw = Math.round((ih * 9) / 16 / 2) * 2;
  const x = Math.round(Math.max(0, Math.min(iw - cw, iw * s.faceX - cw / 2)));
  const [ow, oh] = s.size === "hero" ? [1080, 1920] : [540, 960];
  const mp4 = join(out, `${s.id}.mp4`);
  if (!existsSync(mp4)) {
    ff(["-ss", String(s.from), "-t", String(s.dur), "-i", file, "-vf", `crop=${cw}:${ih}:${x}:0,scale=${ow}:${oh}:flags=lanczos,setsar=1,fps=30`, "-an", "-c:v", "libx264", "-crf", s.size === "hero" ? "15" : "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-g", "15", mp4]);
    ff(["-ss", "0.5", "-i", mp4, "-frames:v", "1", "-q:v", "3", join(out, `${s.id}.jpg`)]);
  }
  let voice: string | undefined;
  if (s.voice) {
    voice = `footage/${s.id}.wav`;
    if (!existsSync(join(out, `${s.id}.wav`))) ff(["-ss", String(s.from), "-t", String(s.dur), "-i", file, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", join(out, `${s.id}.wav`)]);
  }
  const wordsFile = join(src, `${s.src}.words.json`);
  let words: { text: string; startMs: number; endMs: number }[] = [];
  if (existsSync(wordsFile)) {
    const raw = JSON.parse(readFileSync(wordsFile, "utf8")) as { text: string; startMs: number; endMs: number }[];
    const fromMs = s.from * 1000;
    const toMs = fromMs + s.dur * 1000;
    const norm = fromWhisperCaptions(raw.filter((w) => w.startMs >= fromMs - 50 && w.endMs <= toMs + 50));
    const FIX: Record<string, string> = { ienced: "", Sub: "", Pato: "Patois", "Pato,": "Patois,", Muswell: "Musuweu", "Muswell.": "Musuweu." };
    words = norm
      .map((w) => {
        const t = w.text.trim();
        return { text: s.fix?.[t] ?? FIX[t] ?? t, startMs: Math.max(0, Math.round(w.startMs - fromMs)), endMs: Math.round(w.endMs - fromMs) };
      })
      // a word cut in half by the in-point ("ienced") or a stray "." is not a word
      .filter((w, i) => w.text !== "" && /[A-Za-z0-9]/.test(w.text) && !(i < 2 && w.startMs < 120 && /^[a-z]/.test(w.text) && !["a", "i", "and", "but", "so", "it's", "like", "that", "what", "books", "creative", "events.", "true.", "its"].includes(w.text.toLowerCase())));
  }
  manifest[s.id] = { src: `footage/${s.id}.mp4`, poster: `footage/${s.id}.jpg`, voice, durationSec: s.dur, words };
  console.log(`${s.id}: ${words.map((w) => w.text).join(" ")}`);
}
writeFileSync(resolve("src/footage.json"), JSON.stringify(manifest, null, 1));
