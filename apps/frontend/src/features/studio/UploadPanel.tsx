"use client";

import React, { useCallback, useRef, useState } from "react";
import { studioService } from "@/services/studio";
import { ApiError } from "@/services/api-client";
import { Button } from "./controls";

interface Props {
  projectId: string;
  onUploaded: () => void;
  note?: string;
}

/** Drag & drop / pick a video, upload straight to storage with progress, then queue transcription. */
export const UploadPanel: React.FC<Props> = ({ projectId, onUploaded, note }) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null;

  const start = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setProgress(0);
      try {
        await studioService.uploadVideo(projectId, file, setProgress, (abort) => (abortRef.current = abort));
        setProgress(100);
        onUploaded();
      } catch (e) {
        setProgress(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof ApiError || e instanceof Error ? e.message : "Upload failed. Please try again.");
      }
    },
    [projectId, onUploaded],
  );

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void start(f);
        }}
        className={`w-full max-w-xl rounded-2xl border-2 border-dashed p-10 text-center transition ${over ? "border-emerald-400 bg-emerald-500/10" : "border-white/15 bg-white/[0.03]"}`}
      >
        <div className="mb-3 text-4xl">🎬</div>
        <h2 className="text-lg font-semibold">{busy ? "Uploading your video…" : "Drop your video here"}</h2>
        <p className="mt-1 text-sm text-white/50">{note ?? "MP4, MOV, WebM or MKV. Captions are created automatically on your computer."}</p>

        {busy ? (
          <div className="mx-auto mt-6 max-w-sm">
            <div className="mb-1 flex justify-between text-xs text-white/50">
              <span className="truncate pr-3">{fileName}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Button className="mt-4" onClick={() => abortRef.current?.()}>Cancel upload</Button>
          </div>
        ) : (
          <>
            <Button tone="primary" className="mt-6 !px-5 !py-2.5" onClick={() => inputRef.current?.click()}>Choose a video</Button>
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void start(f); e.target.value = ""; }} />
          </>
        )}
        {error ? <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
};
