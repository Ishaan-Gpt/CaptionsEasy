import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type Language, type WhisperModel } from "@remotion/install-whisper-cpp";
import { fromWhisperCaptions, type NormalizeOptions } from "@motion-ai/caption-engine/core";
import type { Word } from "@capseasy/shared";
import { dirs } from "./config";
import { log } from "./log";

// pinned: newer whisper.cpp releases change the CLI flags Remotion relies on
export const WHISPER_CPP_VERSION = "1.5.5";
export const whisperDir = () => join(dirs.data, "whisper");

let installing: Promise<void> | null = null;

/** Installs whisper.cpp once (prebuilt on Windows, built from source elsewhere). Concurrent callers share the same install. */
export function ensureWhisperBinary(): Promise<void> {
  installing ??= (async () => {
    mkdirSync(whisperDir(), { recursive: true });
    const r = await installWhisperCpp({ to: whisperDir(), version: WHISPER_CPP_VERSION, printOutput: false });
    log.info(r.alreadyExisted ? "whisper.cpp already installed" : "whisper.cpp installed");
  })().catch((e) => {
    installing = null; // allow a retry on the next job
    throw new Error(
      `Could not set up whisper.cpp: ${e instanceof Error ? e.message : e}. ` +
        (process.platform === "win32" ? "Check your internet connection and free disk space." : "On macOS install Xcode command line tools (xcode-select --install); on Linux install build-essential + cmake."),
    );
  });
  return installing;
}

export async function ensureModel(model: WhisperModel, onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  mkdirSync(whisperDir(), { recursive: true });
  const r = await downloadWhisperModel({ model, folder: whisperDir(), printOutput: false, signal, onProgress: (downloaded, total) => onProgress?.(total ? downloaded / total : 0) });
  if (!r.alreadyExisted) log.info(`whisper model ${model} downloaded`);
}

export function installedModels(): string[] {
  try {
    return readdirSync(whisperDir())
      .filter((f) => /^ggml-.*\.bin$/.test(f))
      .map((f) => f.replace(/^ggml-/, "").replace(/\.bin$/, ""));
  } catch {
    return [];
  }
}

export const whisperInstalled = () => {
  try {
    return readdirSync(whisperDir()).length > 0;
  } catch {
    return false;
  }
};

export interface TranscribeOptions {
  wavPath: string;
  model: WhisperModel;
  /** BCP-47-ish code or "auto" */
  language: string;
  normalize?: NormalizeOptions;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** WAV -> id-stamped Words (word-level timestamps, cleaned + monotonic). */
export async function transcribeWav(o: TranscribeOptions): Promise<{ words: Word[]; language: string }> {
  await ensureWhisperBinary();
  const englishOnly = o.model.endsWith(".en");
  const json = await transcribe({
    inputPath: o.wavPath,
    whisperPath: whisperDir(),
    whisperCppVersion: WHISPER_CPP_VERSION,
    model: o.model,
    modelFolder: whisperDir(),
    tokenLevelTimestamps: true,
    splitOnWord: true,
    language: (englishOnly ? "en" : o.language) as Language,
    printOutput: false,
    signal: o.signal,
    onProgress: (p) => o.onProgress?.(p),
  });
  const { captions } = toCaptions({ whisperCppOutput: json });
  return { words: fromWhisperCaptions(captions, o.normalize), language: json.result?.language ?? (englishOnly ? "en" : o.language) };
}
