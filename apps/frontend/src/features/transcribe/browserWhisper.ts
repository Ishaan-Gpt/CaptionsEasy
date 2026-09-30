"use client";

import { fromWhisperCaptions } from "@motion-ai/caption-engine/core";
import type { Word } from "@capseasy/shared";
import { apiClient } from "@/services/api-client";
import type { Out } from "./whisper.worker";

/**
 * Captions with no Companion and no cloud: Whisper runs in this tab (whisper.worker.ts), the words are normalized by
 * the same caption-engine code the Companion uses, and the result is saved through the regular transcribe job.
 */

export const BROWSER_MODEL = "whisper-base (browser)";

export type BrowserStatus = { stage: "audio" | "download" | "load" | "transcribe" | "save"; progress: number; device?: string };

const SR = 16_000;

/** Whole audio track -> 16 kHz mono Float32Array (the browser's own decoder; works for MP4/MOV/WebM). */
export async function decodeAudio(url: string, signal?: AbortSignal): Promise<Float32Array> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Couldn't read the video (HTTP ${res.status}).`);
  const buf = await res.arrayBuffer();
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate: SR });
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(buf);
  } catch {
    throw Object.assign(new Error("This video has no audio track the browser can read."), { code: "NO_AUDIO" });
  }
  if (audio.numberOfChannels === 1) return audio.getChannelData(0);
  const out = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i]! += ch[i]! / audio.numberOfChannels;
  }
  return out;
}

/** Runs Whisper in a worker. Resolves to normalized, id-stamped words on the clip's clock. */
export function transcribeAudio(audio: Float32Array, language: string | null, onStatus: (s: BrowserStatus) => void, signal?: AbortSignal): Promise<{ words: Word[]; device: string }> {
  // measured BEFORE the samples are transferred to the worker (the transfer empties this array)
  const durationMs = (audio.length / SR) * 1000;
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    const stop = () => {
      worker.terminate();
      reject(Object.assign(new Error("Stopped."), { name: "AbortError" }));
    };
    signal?.addEventListener("abort", stop, { once: true });
    worker.onmessage = (e: MessageEvent<Out>) => {
      const m = e.data;
      if (m.type === "status") onStatus({ stage: m.stage, progress: m.progress, device: m.device });
      else if (m.type === "error") {
        worker.terminate();
        reject(new Error(m.message));
      } else {
        worker.terminate();
        signal?.removeEventListener("abort", stop);
        resolve({ words: fromWhisperCaptions(m.words, { durationMs }), device: m.device });
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "The speech model crashed in this browser."));
    };
    // transfer the samples (no copy); the caller doesn't need them afterwards
    worker.postMessage({ type: "run", audio, language }, [audio.buffer]);
  });
}

/** Can this browser run it at all? (Web Workers + WebAssembly + Web Audio.) */
export const canTranscribeInBrowser = () =>
  typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof OfflineAudioContext !== "undefined";

/**
 * Drives a queued transcribe job from this tab: claim -> decode -> transcribe (progress keeps the lease alive) ->
 * submit. On failure or cancel the job goes back to the queue for a Companion (or another try).
 */
export async function runBrowserTranscription(opts: {
  jobId: string;
  videoUrl: string;
  language: string | null;
  onStatus: (s: BrowserStatus) => void;
  signal?: AbortSignal;
}): Promise<{ words: number; device: string }> {
  const { jobId, videoUrl, onStatus, signal } = opts;
  const language = opts.language && opts.language !== "auto" ? opts.language.split("-")[0]! : null;
  const call = (body: Record<string, unknown>) => apiClient.post(`/jobs/${jobId}/browser`, { json: body });
  await call({ action: "claim" });
  let last = 0;
  const report = (s: BrowserStatus) => {
    onStatus(s);
    const now = Date.now();
    if (now - last < 4000) return;
    last = now;
    const overall = s.stage === "audio" ? 3 : s.stage === "download" || s.stage === "load" ? 5 + s.progress * 25 : s.stage === "transcribe" ? 30 + s.progress * 65 : 97;
    void call({ action: "progress", stage: s.stage, progress: overall }).catch(() => {});
  };
  try {
    report({ stage: "audio", progress: 0 });
    const audio = await decodeAudio(videoUrl, signal);
    const durationMs = (audio.length / SR) * 1000;
    const { words, device } = await transcribeAudio(audio, language, report, signal);
    onStatus({ stage: "save", progress: 1, device });
    await call({ action: "complete", language: language ?? "en", model: BROWSER_MODEL, durationMs, words });
    return { words: words.length, device };
  } catch (e) {
    await call({ action: "release", reason: e instanceof Error ? e.message.slice(0, 280) : "failed" }).catch(() => {});
    throw e;
  }
}
