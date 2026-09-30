/// <reference lib="webworker" />
/**
 * Whisper in a Web Worker (transformers.js + onnxruntime-web). WebGPU with fp16 weights when the GPU supports it,
 * otherwise WASM with 8-bit weights. The model downloads once and is cached by the browser (Cache Storage).
 *
 * The audio is cut into ~28 s windows at the quietest moment near each boundary (so no word is split), silent
 * windows are skipped (Whisper hallucinates on silence), and word timestamps are shifted back onto the clip's clock.
 */
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;

export const MODEL = "onnx-community/whisper-base_timestamped";
const SR = 16_000;
const WINDOW_S = 28;
const SEARCH_S = 2.5;

type In = { type: "run"; audio: Float32Array; language: string | null };
export type Out =
  | { type: "status"; stage: "download" | "load" | "transcribe"; progress: number; device?: string }
  | { type: "done"; words: { text: string; startMs: number; endMs: number }[]; device: string }
  | { type: "error"; message: string };

const post = (m: Out) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let device = "wasm";

async function load() {
  if (asr) return asr;
  let gpuF16 = false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    gpuF16 = !!adapter?.features.has("shader-f16");
  } catch {
    gpuF16 = false;
  }
  device = gpuF16 ? "webgpu" : "wasm";
  // per-file byte progress -> one overall download percentage
  const files = new Map<string, { loaded: number; total: number }>();
  const onProgress = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file || !p.total) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let l = 0, t = 0;
    files.forEach((f) => { l += f.loaded; t += f.total; });
    post({ type: "status", stage: "download", progress: t ? l / t : 0, device });
  };
  const make = (dev: "webgpu" | "wasm") =>
    pipeline("automatic-speech-recognition", MODEL, {
      device: dev,
      dtype: dev === "webgpu" ? { encoder_model: "fp16", decoder_model_merged: "q4f16" } : { encoder_model: "q8", decoder_model_merged: "q8" },
      progress_callback: onProgress,
    }) as Promise<AutomaticSpeechRecognitionPipeline>;
  try {
    asr = await make(device as "webgpu" | "wasm");
  } catch (e) {
    if (device !== "webgpu") throw e;
    device = "wasm"; // some GPUs advertise f16 but fail to compile the graph
    asr = await make("wasm");
  }
  post({ type: "status", stage: "load", progress: 1, device });
  return asr;
}

const rms = (a: Float32Array, s: number, e: number) => {
  let sum = 0;
  for (let i = s; i < e; i++) sum += a[i]! * a[i]!;
  return Math.sqrt(sum / Math.max(1, e - s));
};

/** Window boundaries (sample indices), each cut at the quietest 50 ms near the nominal boundary. */
function windows(audio: Float32Array): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(audio.length, start + WINDOW_S * SR);
    if (end < audio.length) {
      const from = Math.max(start + SR * 10, end - SEARCH_S * SR);
      const step = SR * 0.05;
      let best = end, bestE = Infinity;
      for (let i = from; i + step <= end; i += step) {
        const e = rms(audio, i, i + step);
        if (e < bestE) { bestE = e; best = i + step / 2; }
      }
      end = Math.round(best);
    }
    out.push([start, end]);
    start = end;
  }
  return out;
}

self.onmessage = async (e: MessageEvent<In>) => {
  if (e.data.type !== "run") return;
  try {
    const model = await load();
    const { audio, language } = e.data;
    const wins = windows(audio);
    const words: { text: string; startMs: number; endMs: number }[] = [];
    for (let w = 0; w < wins.length; w++) {
      const [s, t] = wins[w]!;
      post({ type: "status", stage: "transcribe", progress: w / wins.length, device });
      if (rms(audio, s, t) < 0.004) continue; // near-silence: nothing to say, and Whisper would invent text
      const out = (await model(audio.subarray(s, t), {
        return_timestamps: "word",
        task: "transcribe",
        ...(language ? { language } : {}),
      })) as { chunks?: { text: string; timestamp: [number, number | null] }[] };
      const offset = (s / SR) * 1000;
      for (const c of out.chunks ?? []) {
        const [a, b] = c.timestamp;
        if (!c.text.trim()) continue;
        const startMs = offset + a * 1000;
        words.push({ text: c.text, startMs, endMs: offset + (b ?? a + 0.3) * 1000 });
      }
    }
    post({ type: "status", stage: "transcribe", progress: 1, device });
    post({ type: "done", words, device });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
