"use client";

import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_MEDIUM, canEncodeVideo } from "mediabunny";

/**
 * Everything a phone or laptop needs to check BEFORE uploading, so a bad file never reaches the server:
 * - reads codec, audio track, size and duration from the file itself (Mediabunny, no upload);
 * - re-encodes on the device to H.264 when the browser can't play the original (iPhone HEVC, ProRes, MKV)
 *   or when it is bigger than the upload limit (phones record ~15-20 Mbps, so 1 min is 100+ MB).
 */

export interface PreparedVideo {
  file: File;
  durationMs: number;
  width: number;
  height: number;
  rotation: number;
  videoCodec?: string;
  audioCodec?: string;
  hasAudio: boolean;
  /** the file was re-encoded on this device */
  converted: boolean;
}

export type PrepareStage = { stage: "check" } | { stage: "convert"; progress: number; reason: "playback" | "size" };

export class PrepareError extends Error {
  constructor(message: string, public code: "UNREADABLE" | "TOO_LONG" | "TOO_BIG" | "CANT_CONVERT") {
    super(message);
  }
}

/** What every browser plays: H.264 / VP8 / VP9 / AV1 video in MP4 or WebM. */
const PLAYABLE = new Set(["avc", "vp8", "vp9", "av1"]);
/** Aim well under the limit so audio + container overhead never tip it over. */
const TARGET_FRACTION = 0.85;

function playsInThisBrowser(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (ok: boolean) => {
      clearTimeout(t);
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      resolve(ok);
    };
    // HEVC on many Android/Windows browsers: metadata loads but no frame size, or an error
    v.onloadedmetadata = () => done(v.videoWidth > 0 && v.videoHeight > 0);
    v.onerror = () => done(false);
    const t = setTimeout(() => done(false), 8000);
    v.src = url;
  });
}

const mp4Name = (name: string) => `${name.replace(/\.[^.]+$/, "") || "video"}.mp4`;

export async function prepareVideo(
  file: File,
  limits: { maxBytes: number; maxDurationSec: number },
  onStage: (s: PrepareStage) => void,
  signal?: AbortSignal,
): Promise<PreparedVideo> {
  onStage({ stage: "check" });
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  let video, audio, durationS: number;
  try {
    [video, audio] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    durationS = await input.computeDuration();
  } catch {
    throw new PrepareError("We couldn't read this file. It may be damaged or not a video. Try exporting it again from your camera or editor.", "UNREADABLE");
  }
  if (!video) throw new PrepareError("This file has no video in it. Choose a video file.", "UNREADABLE");
  if (durationS > limits.maxDurationSec) {
    throw new PrepareError(`This video is ${Math.ceil(durationS / 60)} minutes long. Videos can be up to ${Math.round(limits.maxDurationSec / 60)} minutes for now. Trim it and try again.`, "TOO_LONG");
  }

  const base = {
    durationMs: Math.round(durationS * 1000),
    width: video.displayWidth,
    height: video.displayHeight,
    rotation: video.rotation,
    videoCodec: video.codec ?? undefined,
    audioCodec: audio?.codec ?? undefined,
    hasAudio: !!audio,
  };

  const codecOk = !!video.codec && PLAYABLE.has(video.codec);
  const playable = codecOk && (await playsInThisBrowser(file));
  const tooBig = file.size > limits.maxBytes;
  if (playable && !tooBig) return { ...base, file, converted: false };

  // re-encode on this device: 720p on the short edge is plenty for captions and small enough to upload fast
  if (!(await canEncodeVideo("avc").catch(() => false))) {
    throw new PrepareError(
      tooBig
        ? `This video is ${Math.round(file.size / 1048576)} MB and this browser can't shrink it. Use Chrome, Edge or Safari, or export it at 720p.`
        : "This browser can't play this video format (often iPhone HEVC). Open CaptionsEasy in Chrome, Edge or Safari, or set your camera to \"Most Compatible\".",
      "CANT_CONVERT",
    );
  }
  const reason = playable ? "size" : "playback";
  onStage({ stage: "convert", progress: 0, reason });
  const portrait = base.height >= base.width;
  const shortEdge = Math.min(base.width, base.height);
  const edge = Math.min(720, shortEdge - (shortEdge % 2));
  // bitrate that fits the limit for this duration, capped at a good 720p rate
  const budgetBps = ((limits.maxBytes * TARGET_FRACTION * 8) / Math.max(1, durationS)) - 128_000;
  const bitrate = Math.max(600_000, Math.min(3_500_000, budgetBps));

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const conversion = await Conversion.init({
    input,
    output,
    video: { ...(portrait ? { width: edge } : { height: edge }), codec: "avc", bitrate: budgetBps > 0 ? bitrate : QUALITY_MEDIUM, forceTranscode: true },
    audio: { codec: "aac", bitrate: 128_000 },
    showWarnings: false,
  });
  // a browser that can't decode the picture (HEVC on many Androids) "converts" audio only: never upload that
  const videoDropped = conversion.discardedTracks.some((d) => d.track.type === "video") || !conversion.utilizedTracks.some((t) => t.type === "video");
  if (!conversion.isValid || videoDropped) {
    throw new PrepareError(
      "This browser can't read this video's format (usually iPhone HEVC). Open CaptionsEasy in Safari or on a computer, or set your camera to \"Most Compatible\" (Settings → Camera → Formats) and record again.",
      "CANT_CONVERT",
    );
  }
  conversion.onProgress = (p) => onStage({ stage: "convert", progress: p, reason });
  const stop = () => void conversion.cancel();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    await conversion.execute();
  } catch (e) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    throw new PrepareError(`We couldn't convert this video on your device (${e instanceof Error ? e.message : "unknown error"}). Try a shorter clip or another browser.`, "CANT_CONVERT");
  } finally {
    signal?.removeEventListener("abort", stop);
  }
  const buf = target.buffer;
  if (!buf) throw new PrepareError("The converted video came out empty. Please try again.", "CANT_CONVERT");
  const out = new File([buf], mp4Name(file.name), { type: "video/mp4" });
  if (out.size > limits.maxBytes) {
    throw new PrepareError(`Even after shrinking, this video is ${Math.round(out.size / 1048576)} MB (limit ${Math.round(limits.maxBytes / 1048576)} MB). Trim it to a shorter clip.`, "TOO_BIG");
  }
  const outVideo = await new Input({ source: new BlobSource(out), formats: ALL_FORMATS }).getPrimaryVideoTrack();
  return {
    ...base,
    file: out,
    width: outVideo?.displayWidth ?? base.width,
    height: outVideo?.displayHeight ?? base.height,
    rotation: 0,
    videoCodec: "avc",
    audioCodec: audio ? "aac" : undefined,
    converted: true,
  };
}
