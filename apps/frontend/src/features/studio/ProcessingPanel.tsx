"use client";

import React, { useState } from "react";
import Link from "next/link";
import { studioService, type StudioJob } from "@/services/studio";
import { Button } from "./controls";

interface Props {
  projectId: string;
  job: StudioJob | null;
  companionOnline: boolean;
  canTranscribe: boolean;
  onChanged: () => void;
  onReplaceVideo: () => void;
}

export const ProcessingPanel: React.FC<Props> = ({ projectId, job, companionOnline, canTranscribe, onChanged, onReplaceVideo }) => {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  if (job?.status === "failed") {
    return (
      <Center>
        <div className="mb-2 text-3xl">⚠️</div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{job.error_message ?? "The job failed."}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button tone="primary" disabled={busy} onClick={() => act(() => studioService.retryJob(job.id))}>Try again</Button>
          <Button onClick={onReplaceVideo}>Upload a different video</Button>
        </div>
      </Center>
    );
  }

  if (job?.status === "queued" && !companionOnline) {
    return (
      <Center>
        <div className="mb-2 text-3xl">💻</div>
        <h2 className="text-lg font-semibold">Waiting for your computer</h2>
        <p className="mt-2 text-sm text-white/60">
          Captions are made privately on your own computer, so nothing heavy runs in the cloud. Your video is uploaded and safe. Start the CapsEasy Companion and it will pick this up automatically.
        </p>
        <div className="mt-4 space-y-2 rounded-xl bg-white/5 p-4 text-left text-sm">
          <p className="font-medium text-white">First time?</p>
          <ol className="list-decimal space-y-1 pl-5 text-white/70">
            <li>Install the Companion (one command, see Settings).</li>
            <li>Run <code className="rounded bg-black/40 px-1.5 py-0.5 text-emerald-300">capseasy login</code> and approve it in the browser.</li>
            <li>Run <code className="rounded bg-black/40 px-1.5 py-0.5 text-emerald-300">capseasy start</code> and leave it running.</li>
          </ol>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href="/settings" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400">Set up Companion</Link>
          <Button disabled={busy} onClick={() => act(() => studioService.cancelJob(job.id))}>Cancel</Button>
        </div>
        <p className="mt-4 text-xs text-white/40">This page updates by itself the moment your computer connects.</p>
      </Center>
    );
  }

  if (job) {
    const pct = Math.max(2, Math.min(100, job.progress ?? 0));
    return (
      <Center>
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
        <h2 className="text-lg font-semibold">{job.status === "queued" ? "Starting…" : job.stage ?? "Working…"}</h2>
        <p className="mt-1 text-sm text-white/50">
          {job.kind === "transcribe" ? "Listening to your video and writing the captions." : "This can take a moment."}
        </p>
        <div className="mx-auto mt-5 h-2 w-72 max-w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums text-white/40">{Math.round(job.progress ?? 0)}%</p>
        <Button className="mt-4" disabled={busy} onClick={() => act(() => studioService.cancelJob(job.id))}>Cancel</Button>
      </Center>
    );
  }

  if (canTranscribe) {
    return (
      <Center>
        <div className="mb-2 text-3xl">🎙️</div>
        <h2 className="text-lg font-semibold">Your video is ready for captions</h2>
        <p className="mt-2 text-sm text-white/60">This project doesn't have captions yet. Generate them on your computer, privately.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button tone="primary" disabled={busy} onClick={() => act(() => studioService.transcribe(projectId))}>Generate captions</Button>
          <Button onClick={onReplaceVideo}>Upload a different video</Button>
        </div>
      </Center>
    );
  }

  return (
    <Center>
      <h2 className="text-lg font-semibold">Your video is uploaded</h2>
      <p className="mt-2 text-sm text-white/50">Captions will appear here as soon as they are ready.</p>
    </Center>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="w-full max-w-md text-center">{children}</div>
  </div>
);
