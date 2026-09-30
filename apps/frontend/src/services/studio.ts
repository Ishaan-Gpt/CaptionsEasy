/**
 * Studio data layer: everything the editor talks to the v2 API for. Kept apart from the legacy
 * projects service so the old dashboard keeps working while the studio moves to the new pipeline.
 */

import type { CaptionDoc, CaptionStyleV2, ProjectSettings } from "@capseasy/shared";
import { apiClient, ApiError } from "./api-client";

export interface StudioJob {
  id: string;
  kind: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number | null;
  stage: string | null;
  message: string | null;
  error_code: string | null;
  error_message: string | null;
  attempts: number;
}

export interface StudioData {
  project: {
    id: string;
    title: string;
    status: string | null;
    language: string | null;
    aspect_ratio: string | null;
    look_id: string | null;
    template_id: string | null;
    style_json: Partial<CaptionStyleV2> | null;
    settings_json: Partial<ProjectSettings> | null;
    platform: string | null;
  };
  video: {
    id: string;
    status: string;
    url: string | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    durationMs: number | null;
    hasAudio: boolean | null;
    filename: string | null;
    size: number | null;
  } | null;
  document: { revision: number; doc: CaptionDoc | null };
  job: StudioJob | null;
  canTranscribe: boolean;
  companionOnline: boolean;
}

export interface ExportRow {
  id: string;
  kind: string | null;
  status_v2: "queued" | "rendering" | "ready" | "failed" | "expired" | "cancelled";
  file_size: number | null;
  created_at: string;
  job_id: string | null;
  expires_at: string | null;
  resolution: string | null;
  render_duration_ms: number | null;
}

export type ExportKind = "mp4" | "mov_alpha" | "webm_alpha" | "srt" | "vtt" | "ass" | "txt" | "json";

export class RevisionConflict extends Error {
  constructor(public server: { revision: number; doc: CaptionDoc }) {
    super("This project was changed somewhere else.");
  }
}

export interface VideoProbe {
  durationMs: number;
  width: number;
  height: number;
  playable: boolean;
}

/** Reads dimensions/duration in the browser before uploading, so the UI (and plan limits) know immediately. */
export function probeVideoFile(file: File): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (fn: () => void) => {
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      fn();
    };
    v.onloadedmetadata = () =>
      done(() =>
        resolve({
          durationMs: Math.round((v.duration || 0) * 1000),
          width: v.videoWidth,
          height: v.videoHeight,
          playable: v.videoWidth > 0 && v.videoHeight > 0,
        }),
      );
    // most often HEVC/ProRes: the browser cannot decode it, so we ask the companion for an H.264 preview
    v.onerror = () => done(() => reject(new Error("unplayable")));
    v.src = url;
  });
}

const ALLOWED = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];

/** PUT to a Supabase signed-upload URL as multipart (same wire format as supabase-js), with progress + abort. */
function putSigned(url: string, file: File, onProgress: (pct: number) => void, onAbortReady?: (abort: () => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file, file.name);
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "true");
    onAbortReady?.(() => xhr.abort());
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.send(form);
  });
}

export const studioService = {
  getStudio(projectId: string) {
    return apiClient.get<StudioData>(`/projects/${projectId}/studio`);
  },

  /** Register, upload (with progress) and complete. Resolves when the transcribe job has been queued. */
  async uploadVideo(
    projectId: string,
    file: File,
    onProgress: (pct: number) => void,
    onAbortReady?: (abort: () => void) => void,
  ): Promise<{ jobId: string; companionOnline: boolean }> {
    const mime = file.type || (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : file.name.toLowerCase().endsWith(".mkv") ? "video/x-matroska" : "");
    if (!ALLOWED.includes(mime)) throw new Error("Unsupported file. Use MP4, MOV, WebM or MKV.");

    let probe: VideoProbe | null = null;
    try {
      probe = await probeVideoFile(file);
    } catch {
      probe = null; // unplayable in this browser: still upload, the companion will make a preview
    }

    const reg = await apiClient.post<{ videoId: string; uploadUrl: string }>(`/projects/${projectId}/videos`, {
      json: {
        filename: file.name,
        size: file.size,
        mime,
        probe: probe ? { durationMs: probe.durationMs, width: probe.width, height: probe.height } : undefined,
      },
    });
    await putSigned(reg.uploadUrl, file, onProgress, onAbortReady);
    return apiClient.post(`/videos/${reg.videoId}/complete`, { json: { needsProxy: probe === null } });
  },

  async saveDocument(projectId: string, expectedRevision: number, doc: CaptionDoc): Promise<number> {
    try {
      const r = await apiClient.put<{ revision: number }>(`/projects/${projectId}/document`, { json: { expectedRevision, doc } });
      return r.revision;
    } catch (e) {
      if (e instanceof ApiError && e.code === "REVISION_CONFLICT" && e.details) {
        throw new RevisionConflict(e.details as unknown as { revision: number; doc: CaptionDoc });
      }
      throw e;
    }
  },

  savePatch(projectId: string, patch: Record<string, unknown>) {
    return apiClient.patch(`/projects/${projectId}`, { json: patch });
  },

  listExports(projectId: string) {
    return apiClient.get<ExportRow[]>(`/projects/${projectId}/exports`);
  },

  createExport(projectId: string, body: { kind: ExportKind; crf?: number; width?: number; height?: number }) {
    return apiClient.post<{ exportId: string; ready: boolean; downloadUrl?: string; jobId?: string; companionOnline?: boolean }>(`/projects/${projectId}/exports`, { json: body });
  },

  async exportDownloadUrl(exportId: string): Promise<string> {
    return (await apiClient.get<{ url: string }>(`/exports/${exportId}/download`)).url;
  },

  transcribe(projectId: string) {
    return apiClient.post<{ jobId: string; companionOnline: boolean }>(`/projects/${projectId}/transcribe`);
  },

  cancelJob(jobId: string) {
    return apiClient.post(`/jobs/${jobId}/cancel`);
  },
  retryJob(jobId: string) {
    return apiClient.post(`/jobs/${jobId}/retry`);
  },
};
