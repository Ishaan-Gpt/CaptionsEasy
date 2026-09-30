"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { studioService, type StudioJob } from "@/services/studio";
import { Button } from "./controls";

interface Props {
  projectId: string;
  job: StudioJob | null;
  companionOnline: boolean;
  pairedComputers: string[];
  canTranscribe: boolean;
  cloudAvailable: boolean;
  onChanged: () => void;
  onReplaceVideo: () => void;
}

export const ProcessingPanel: React.FC<Props> = ({ projectId, job, companionOnline, pairedComputers, canTranscribe, cloudAvailable, onChanged, onReplaceVideo }) => {
  const [busy, setBusy] = useState(false);
  // phones can't run the Companion: they drive a computer the user already paired
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => setIsPhone(window.matchMedia("(max-width: 767px), (pointer: coarse) and (hover: none)").matches), []);
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
    const returning = pairedComputers.length > 0;
    const name = pairedComputers[0];
    return (
      <Center>
        <div className="mb-2 text-3xl">{returning ? "👋" : "💻"}</div>
        {returning ? (
          <>
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="mt-2 text-sm text-st-muted">
              Turn on <span className="font-semibold text-st-text">{name}</span> and this starts by itself. Nothing to install again.
            </p>
            {!isPhone ? (
              <div className="mt-4 rounded-xl bg-st-raised/70 p-4 text-left text-sm">
                <p className="text-st-text/80">If it doesn&apos;t connect on its own, run this once in a terminal on that computer:</p>
                <code className="mt-2 block rounded bg-black/40 px-2 py-1.5 text-st-lav">capseasy start</code>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-st-raised/70 p-4 text-sm text-st-text/80">
                Your phone uses your computer to make captions. Wake {name} (with the Companion running) and this page continues automatically.
              </p>
            )}
          </>
        ) : isPhone ? (
          <>
            <h2 className="text-lg font-semibold">Connect a computer to continue</h2>
            <p className="mt-2 text-sm text-st-muted">
              Captions are made on your own computer. Your video is uploaded and safe. On a Windows, Mac or Linux computer, open CapsEasy Settings, run the one-line install command, then come back here.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Waiting for your computer</h2>
            <p className="mt-2 text-sm text-st-muted">
              Captions are made privately on your own computer, so nothing heavy runs in the cloud. Your video is uploaded and safe. Start the CapsEasy Companion and it will pick this up automatically.
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-st-raised/70 p-4 text-left text-sm">
              <p className="font-medium text-st-text">First time?</p>
              <ol className="list-decimal space-y-1 pl-5 text-st-text/80">
                <li>Copy the one-line install command from Settings.</li>
                <li>Paste it into a terminal and approve the computer in the browser.</li>
                <li>That&apos;s it: it starts by itself from now on.</li>
              </ol>
            </div>
          </>
        )}
        <div className="mt-5 flex justify-center gap-2">
          {!returning && !isPhone ? <Link href="/settings" className="rounded-lg bg-st-lav px-4 py-2 text-sm font-semibold text-obsidian hover:bg-st-lav-strong">Set up Companion</Link> : null}
          <Button disabled={busy} onClick={() => act(() => studioService.cancelJob(job.id))}>Cancel</Button>
        </div>
        {cloudAvailable && !isPhone ? (
          <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
            <p className="text-sky-100">In a hurry? Transcribe this video in the cloud instead (uses your monthly cloud minutes).</p>
            <Button className="mt-2" disabled={busy} onClick={() => act(() => studioService.transcribe(projectId, "cloud"))}>☁ Use the cloud instead</Button>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-st-faint">This page updates by itself the moment your computer connects.</p>
      </Center>
    );
  }

  if (job) {
    const pct = Math.max(2, Math.min(100, job.progress ?? 0));
    return (
      <Center>
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-st-line border-t-st-lav" />
        <h2 className="text-lg font-semibold">{job.status === "queued" ? "Starting…" : job.stage ?? "Working…"}</h2>
        <p className="mt-1 text-sm text-st-muted">
          {job.kind === "transcribe" ? "Listening to your video and writing the captions." : "This can take a moment."}
        </p>
        <div className="mx-auto mt-5 h-2 w-72 max-w-full overflow-hidden rounded-full bg-st-raised">
          <div className="h-full rounded-full bg-st-em transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums text-st-faint">{Math.round(job.progress ?? 0)}%</p>
        <Button className="mt-4" disabled={busy} onClick={() => act(() => studioService.cancelJob(job.id))}>Cancel</Button>
      </Center>
    );
  }

  if (canTranscribe) {
    return (
      <Center>
        <div className="mb-2 text-3xl">🎙️</div>
        <h2 className="text-lg font-semibold">Your video is ready for captions</h2>
        <p className="mt-2 text-sm text-st-muted">This project doesn't have captions yet. Generate them on your computer, privately.</p>
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
      <p className="mt-2 text-sm text-st-muted">Captions will appear here as soon as they are ready.</p>
    </Center>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="w-full max-w-md text-center">{children}</div>
  </div>
);
