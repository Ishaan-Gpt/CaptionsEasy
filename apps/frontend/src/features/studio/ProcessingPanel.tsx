"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { canTranscribeInBrowser, runBrowserTranscription, type BrowserStatus } from "@/features/transcribe/browserWhisper";
import { ConnectComputer } from "@/features/companion/ConnectComputer";
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
  /** signed URL of the uploaded video (the browser reads its audio) */
  videoUrl?: string | null;
  language?: string | null;
}

export const ProcessingPanel: React.FC<Props> = ({ projectId, job, companionOnline, pairedComputers, canTranscribe, cloudAvailable, onChanged, onReplaceVideo, videoUrl, language }) => {
  const [busy, setBusy] = useState(false);
  // phones can't run the Companion: they drive a computer the user already paired
  const isPhone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(max-width: 767px), (pointer: coarse) and (hover: none)").matches,
    () => false,
  );
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  // no computer online: make the captions right here, in the browser (Whisper on WebGPU / WebAssembly)
  const browserJob =
    job?.kind === "transcribe" && !companionOnline && !!videoUrl && canTranscribeInBrowser() &&
    (job.status === "queued" || (job.status === "processing" && (job.stage ?? "").startsWith("browser")));
  if (browserJob && job && videoUrl) {
    return <BrowserCaptions key={job.id} jobId={job.id} videoUrl={videoUrl} language={language ?? null} auto={!isPhone} onDone={onChanged} fallback={<ConnectComputer compact />} />;
  }

  if (job?.status === "failed") {
    return (
      <Center>
        <div className="mb-2 text-3xl">⚠️</div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 rounded-lg border border-st-or/60 bg-st-or/15 px-3 py-2 text-sm text-st-text">{job.error_message ?? "The job failed."}</p>
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
                <code className="mt-2 block rounded bg-st-raised px-2 py-1.5 text-st-text">capseasy start</code>
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
              Captions are made on your own computer. Your video is uploaded and safe. Open CaptionsEasy on your Windows, Mac or Linux computer and click <b>Connect this computer</b>: this page continues by itself.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Waiting for your computer</h2>
            <p className="mt-2 text-sm text-st-muted">
              Captions are made privately on your own computer with the free CaptionsEasy app. Your video is uploaded and safe, and this continues by itself once the computer is connected.
            </p>
            <div className="mt-4 rounded-xl bg-st-raised/70 p-4 text-left text-sm">
              <ConnectComputer />
            </div>
          </>
        )}
        <div className="mt-5 flex justify-center gap-2">
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
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-st-line border-t-st-ink" />
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
        <p className="mt-2 text-sm text-st-muted">This project doesn&apos;t have captions yet. Generate them on your computer, privately.</p>
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

const STAGE_TEXT: Record<BrowserStatus["stage"], string> = {
  audio: "Getting the audio ready…",
  download: "Downloading the speech model (one time, about 80 MB)…",
  load: "Loading the speech model…",
  transcribe: "Listening and writing your captions…",
  save: "Saving your captions…",
};
const overall = (s: BrowserStatus) =>
  s.stage === "audio" ? 3 : s.stage === "download" ? 5 + s.progress * 25 : s.stage === "load" ? 30 : s.stage === "transcribe" ? 30 + s.progress * 67 : 99;

/** Captions made in this tab. Nothing is installed and the audio never leaves the device. */
const BrowserCaptions: React.FC<{ jobId: string; videoUrl: string; language: string | null; auto: boolean; onDone: () => void; fallback: React.ReactNode }> = ({ jobId, videoUrl, language, auto, onDone, fallback }) => {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const start = async () => {
    if (started.current) return;
    started.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      await runBrowserTranscription({ jobId, videoUrl, language, onStatus: setStatus, signal: ctrl.signal });
      onDone();
    } catch (e) {
      started.current = false;
      setStatus(null);
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't make captions in this browser.");
      onDone();
    }
  };

  useEffect(() => {
    const t = auto ? setTimeout(() => void start(), 0) : undefined;
    return () => {
      clearTimeout(t);
      abort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error || (!auto && !status)) {
    return (
      <Center>
        <div className="mb-2 text-3xl">🎙️</div>
        <h2 className="text-lg font-semibold">{error ? "Couldn't finish in this browser" : "Make your captions"}</h2>
        <p className="mt-2 text-sm text-st-muted">
          {error ?? "Captions are made right here on this device. Free and private: your audio never leaves it."}
        </p>
        <div className="mt-5 flex justify-center">
          <Button tone="primary" onClick={() => { setError(null); void start(); }}>{error ? "Try again" : "Make captions here"}</Button>
        </div>
        <div className="mt-6 rounded-xl bg-st-raised/70 p-4 text-left text-sm">
          <p className="mb-2 text-st-text/80">Or let your computer do it (more accurate, any length):</p>
          {fallback}
        </div>
      </Center>
    );
  }

  const pct = status ? Math.max(2, Math.round(overall(status))) : 2;
  return (
    <Center>
      <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-st-line border-t-st-ink" />
      <h2 className="text-lg font-semibold">{status ? STAGE_TEXT[status.stage] : "Starting…"}</h2>
      <p className="mt-1 text-sm text-st-muted">Made right here in your browser: free, private, nothing to install.</p>
      <div className="mx-auto mt-5 h-2 w-72 max-w-full overflow-hidden rounded-full bg-st-raised">
        <div className="h-full rounded-full bg-st-em transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs tabular-nums text-st-faint">
        {pct}%{status?.device ? ` · ${status.device === "webgpu" ? "using your graphics card" : "using your processor"}` : ""}
      </p>
      <p className="mt-1 text-xs text-st-faint">Keep this tab open.</p>
      <Button className="mt-4" onClick={() => abort.current?.abort()}>Stop</Button>
    </Center>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="w-full max-w-md text-center">{children}</div>
  </div>
);
