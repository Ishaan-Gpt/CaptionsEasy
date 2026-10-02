"use client";

import * as Sentry from "@sentry/nextjs";
import React, { useCallback, useRef, useState } from "react";
import { studioService } from "@/services/studio";
import { ApiError } from "@/services/api-client";
import { PrepareError, prepareVideo, type PrepareStage } from "@/features/upload/prepareVideo";
import { Button } from "./controls";

interface Props {
  projectId: string;
  onUploaded: () => void;
  note?: string;
  limits?: { maxBytes: number; maxDurationSec: number };
}

const DEFAULT_LIMITS = { maxBytes: 50 * 1024 * 1024, maxDurationSec: 5 * 60 };

/** Drag & drop / pick a video: checked and saved on this device (never uploaded), then captions start. */
export const UploadPanel: React.FC<Props> = ({ projectId, onUploaded, note, limits = DEFAULT_LIMITS }) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [prep, setPrep] = useState<PrepareStage | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null || prep !== null;

  const start = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      const ctrl = new AbortController();
      abortRef.current = () => ctrl.abort();
      try {
        // check (and if needed shrink / convert) on this device first: bad files never get uploaded
        const ready = await prepareVideo(file, limits, setPrep, ctrl.signal);
        setPrep(null);
        setProgress(0);
        await studioService.uploadVideo(projectId, ready, setProgress, (abort) => (abortRef.current = abort));
        setProgress(100);
        onUploaded();
      } catch (e) {
        setPrep(null);
        setProgress(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        // a refused file (too long, unreadable) is the user's file, not our bug: only report the unexpected
        if (!(e instanceof PrepareError) || e.code === "CANT_CONVERT") Sentry.captureException(e, { tags: { area: "upload" } });
        setError(e instanceof PrepareError || e instanceof ApiError || e instanceof Error ? e.message : "Upload failed. Please try again.");
      }
    },
    [projectId, onUploaded, limits],
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
        className={`w-full max-w-xl rounded-2xl border-2 border-dashed p-10 text-center transition ${over ? "border-st-ink bg-st-lav/40" : "border-st-hover bg-st-panel"}`}
      >
        <div className="mb-3 text-4xl">🎬</div>
        <h2 className="text-lg font-semibold">
          {prep?.stage === "check" ? "Checking your video…" : prep?.stage === "convert" ? "Preparing your video…" : busy ? "Saving your video…" : "Drop your video here"}
        </h2>
        <p className="mt-1 text-sm text-st-muted">
          {prep?.stage === "convert"
            ? prep.reason === "size"
              ? "Making it lighter so editing stays smooth. Captions look the same."
              : "Converting it so it plays in every browser. This happens on your device."
            : note ?? `MP4, MOV or WebM, up to ${Math.round(limits.maxDurationSec / 60)} minutes. Your video stays on this device.`}
        </p>

        {prep ? (
          <div className="mx-auto mt-6 max-w-sm">
            <div className="mb-1 flex justify-between text-xs text-st-muted">
              <span className="truncate pr-3">{fileName}</span>
              <span className="tabular-nums">{prep.stage === "convert" ? `${Math.round(prep.progress * 100)}%` : ""}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-st-raised">
              <div className="h-full rounded-full bg-st-lav transition-all" style={{ width: prep.stage === "convert" ? `${Math.max(3, prep.progress * 100)}%` : "8%" }} />
            </div>
            <p className="mt-2 text-xs text-st-faint">Keep this tab open.</p>
            <Button className="mt-4" onClick={() => abortRef.current?.()}>Cancel</Button>
          </div>
        ) : busy ? (
          <div className="mx-auto mt-6 max-w-sm">
            <div className="mb-1 flex justify-between text-xs text-st-muted">
              <span className="truncate pr-3">{fileName}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-st-raised">
              <div className="h-full rounded-full bg-st-em transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Button className="mt-4" onClick={() => abortRef.current?.()}>Cancel</Button>
          </div>
        ) : (
          <>
            <Button tone="primary" className="mt-6 !px-5 !py-2.5" onClick={() => inputRef.current?.click()}>Choose a video</Button>
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void start(f); e.target.value = ""; }} />
          </>
        )}
        {error ? <p role="alert" className="mt-4 rounded-lg border border-st-or/60 bg-st-or/15 px-3 py-2 text-sm text-st-text">{error}</p> : null}
      </div>
    </div>
  );
};
