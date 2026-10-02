import "server-only";
import { CaptionDocSchema, planFor, type TranscribeJob } from "@capseasy/shared";
import { fromGroqVerbose } from "@motion-ai/caption-engine/core";
import { getAdmin } from "../supabase/admin";
import { logJobEvent, setProjectStatus } from "./jobs";
import { signedGet } from "./storage";
import { saveTranscription } from "./transcripts";

/** Groq accepts these containers directly (no ffmpeg needed on Vercel). */
const CLOUD_MIME = new Set(["video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"]);
const MAX_BYTES = Number(process.env.GROQ_MAX_BYTES ?? 25 * 1024 * 1024);
const BASE = () => (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
const MODEL = () => process.env.GROQ_ASR_MODEL ?? "whisper-large-v3-turbo";
/** Every configured key: GROQ_API_KEYS (comma separated) plus the older single-key vars. Tried in a rotating order. */
const keys = () => {
  const all = [...(process.env.GROQ_API_KEYS ?? "").split(","), process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));
  const unique = [...new Set(all)];
  const start = unique.length ? Math.floor(Math.random() * unique.length) : 0; // spread load across keys
  return [...unique.slice(start), ...unique.slice(0, start)];
};

/**
 * TRANSCRIPTION_MODE switches the whole product:
 *   browser (default) - captions are made in the user's tab (Whisper on WebGPU/WASM); Groq is never called.
 *   cloud             - Groq first when the file qualifies; any cloud failure falls back to the browser.
 * The Companion still takes jobs when one is online, in both modes.
 */
export const transcriptionMode = (): "browser" | "cloud" => (process.env.TRANSCRIPTION_MODE === "cloud" ? "cloud" : "browser");

export const cloudConfigured = () => transcriptionMode() === "cloud" && keys().length > 0;

export interface CloudEligibility { ok: boolean; reason?: string }

/** Can this video be transcribed in the cloud for this user right now? */
export async function cloudEligibility(ownerId: string, video: { mime_type: string | null; file_size: number | null; storage_path: string }): Promise<CloudEligibility> {
  if (!cloudConfigured()) return { ok: false, reason: "Cloud transcription isn't set up on this server." };
  if (video.storage_path.startsWith("local:")) return { ok: false, reason: "This video is only on your device." };
  const mime = video.mime_type ?? (video.storage_path.endsWith(".mp4") ? "video/mp4" : null);
  if (!mime || !CLOUD_MIME.has(mime)) return { ok: false, reason: "Cloud transcription supports MP4 and WebM. Use your computer for this file." };
  if (video.file_size && video.file_size > MAX_BYTES) return { ok: false, reason: `Cloud transcription is limited to ${Math.round(MAX_BYTES / 1048576)} MB files. Use your computer for bigger videos.` };
  const admin = getAdmin();
  const [{ data: profile }, { data: used }] = await Promise.all([
    admin.from("profiles").select("plan").eq("id", ownerId).maybeSingle(),
    admin.from("usage_month").select("total").eq("owner_id", ownerId).eq("kind", "cloud_transcribe_s").maybeSingle(),
  ]);
  const quotaS = planFor(profile?.plan).cloudAsrMinutesPerMonth * 60;
  if (Number(used?.total ?? 0) >= quotaS) return { ok: false, reason: "You've used this month's cloud minutes. Use your computer, or upgrade." };
  return { ok: true };
}

async function callGroq(file: Blob, filename: string, job: TranscribeJob): Promise<{ words?: { word: string; start: number; end: number }[]; segments?: { avg_logprob?: number; start: number; end: number }[]; duration?: number; language?: string }> {
  let lastErr = "no API key configured";
  for (const key of keys()) {
    const form = new FormData();
    form.append("file", file, filename);
    form.append("model", MODEL());
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    if (job.language && job.language !== "auto") form.append("language", job.language.slice(0, 2));
    if (job.prompt) form.append("prompt", job.prompt.slice(0, 800));
    const res = await fetch(`${BASE()}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(240_000) });
    if (res.ok) return res.json();
    lastErr = `Groq ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
    // bad request won't get better with the other key; auth/quota/server errors might
    if (res.status === 400 && lastErr.includes("no_audio")) throw Object.assign(new Error("This video has no sound."), { code: "NO_AUDIO" });
    if (res.status === 400 || res.status === 413 || res.status === 415) break;
  }
  throw new Error(lastErr);
}

/**
 * Runs one cloud transcription job to completion. Call inside next/server `after()` so the request returns
 * immediately; the studio polls the job. Every failure ends in a clear, retryable job state.
 */
export async function runCloudTranscribe(jobId: string) {
  const admin = getAdmin();
  const { data: job } = await admin.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job || job.status !== "processing") return;
  const payload = job.payload as TranscribeJob;
  const progress = (stage: string, pct: number) => admin.from("jobs").update({ stage, progress: pct, updated_at: new Date().toISOString() }).eq("id", jobId);
  try {
    const { data: video } = await admin.from("videos").select("storage_path, mime_type, width, height").eq("id", payload.videoId).single();
    await progress("Uploading to cloud", 10);
    const src = await fetch(await signedGet(video!.storage_path, 900));
    if (!src.ok) throw new Error(`Could not read the uploaded video (${src.status})`);
    const blob = await src.blob();
    await progress("Transcribing in the cloud", 35);
    const json = await callGroq(blob, video!.storage_path.split("/").pop() ?? "video.mp4", payload);
    const words = fromGroqVerbose(json, { durationMs: json.duration ? json.duration * 1000 : undefined });
    if (words.length === 0) throw new Error("No speech was found in this video.");
    await progress("Saving captions", 90);
    await saveTranscription(job, {
      engine: "groq", model: MODEL(), language: json.language?.slice(0, 2) || payload.language || "en",
      durationMs: json.duration ? Math.round(json.duration * 1000) : undefined, width: video!.width ?? undefined, height: video!.height ?? undefined, words,
    });
    await admin.from("jobs").update({ status: "completed", progress: 100, stage: "Done", finished_at: new Date().toISOString(), lease_expires_at: null }).eq("id", jobId);
    await logJobEvent(jobId, "completed", 100, "Cloud transcription completed");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if ((e as { code?: string }).code === "NO_AUDIO") {
      await openSilentVideo({ projectId: job.project_id, ownerId: job.owner_id, videoId: payload.videoId });
      await admin.from("jobs").update({ status: "completed", progress: 100, stage: "No audio", message: "NO_AUDIO", finished_at: new Date().toISOString(), lease_expires_at: null }).eq("id", jobId);
      await logJobEvent(jobId, "completed", 100, "No audio track: opened an empty caption document");
      return;
    }
    // never a dead end: hand the job to the user's browser (or Companion), which picks it up by itself
    await admin.from("jobs").update({ status: "queued", engine: "local", stage: null, progress: 0, worker_id: null, lease_expires_at: null, error_code: null, updated_at: new Date().toISOString() }).eq("id", jobId);
    await logJobEvent(jobId, "cloud-fallback", null, `Cloud transcription failed, handed to the browser: ${msg}`.slice(0, 500), "warn");
  }
}

/** A video with no sound: nothing to transcribe, so open the editor with an empty document to type captions in. */
export async function openSilentVideo(o: { projectId: string; ownerId: string; videoId: string }) {
  const admin = getAdmin();
  await admin.from("videos").update({ has_audio: false, status: "ready", updated_at: new Date().toISOString() }).eq("id", o.videoId);
  const doc = CaptionDocSchema.parse({ version: 2, language: "en", words: [], meta: { userEdited: false } });
  await admin.from("caption_documents").upsert({ project_id: o.projectId, owner_id: o.ownerId, doc }, { onConflict: "project_id", ignoreDuplicates: true });
  await setProjectStatus(o.projectId, "ready");
}

/** Marks a cloud job as running (so polling UIs show progress) with a lease the reaper can expire. */
export async function markCloudRunning(jobId: string) {
  await getAdmin().from("jobs").update({ status: "processing", engine: "cloud", started_at: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 330_000).toISOString(), attempts: 1, stage: "Starting", progress: 2 }).eq("id", jobId);
}
