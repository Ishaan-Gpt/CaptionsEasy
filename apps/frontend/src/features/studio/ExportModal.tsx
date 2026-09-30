"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CaptionedVideoInput } from "@capseasy/compositions";
import { canExportInBrowser, exportMp4InBrowser, saveBlob } from "./browserExport";
import { ConnectComputer } from "@/features/companion/ConnectComputer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studioService, type ExportKind, type ExportRow } from "@/services/studio";
import { ApiError } from "@/services/api-client";
import { Button, fmtBytes, fmtTime, triggerDownload } from "./controls";

interface Option { kind: ExportKind; title: string; desc: string; needsComputer: boolean }
const OPTIONS: Option[] = [
  { kind: "mp4", title: "Video with captions (MP4)", desc: "Captions burned into your video. Renders right here in your browser.", needsComputer: true },
  { kind: "mov_alpha", title: "Transparent overlay (ProRes .mov)", desc: "Captions only, with transparency, for Premiere, Final Cut and DaVinci.", needsComputer: true },
  { kind: "webm_alpha", title: "Transparent overlay (WebM)", desc: "Captions only with transparency, smaller files for web editors.", needsComputer: true },
  { kind: "srt", title: "Subtitles (.srt)", desc: "Works on YouTube, Facebook, LinkedIn and every editor.", needsComputer: false },
  { kind: "vtt", title: "Subtitles (.vtt)", desc: "For web players and HTML5 video.", needsComputer: false },
  { kind: "ass", title: "Styled subtitles (.ass)", desc: "Keeps font, colors and position for editors that support ASS.", needsComputer: false },
  { kind: "txt", title: "Plain transcript (.txt)", desc: "Just the words, one caption per line.", needsComputer: false },
];

/** wall-clock for "made in …" (kept out of render: only called from event handlers) */
const clock = () => performance.now();

const KIND_LABEL: Record<string, string> = { mp4: "MP4", mov_alpha: "ProRes overlay", webm_alpha: "WebM overlay", srt: "SRT", vtt: "VTT", ass: "ASS", txt: "TXT", json: "JSON" };

interface Props {
  projectId: string;
  title?: string;
  video: { width: number; height: number; durationMs: number; fps: number };
  /** exactly what the preview Player renders; the in-browser export renders the same thing */
  renderInput: CaptionedVideoInput | null;
  companionOnline: boolean;
  saving: boolean;
  onClose: () => void;
  flushSave: () => Promise<void>;
}

export const ExportModal: React.FC<Props> = ({ projectId, title, video, renderInput, companionOnline, saving, onClose, flushSave }) => {
  const qc = useQueryClient();
  const [busyKind, setBusyKind] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<"high" | "balanced" | "small">("high");
  const [res, setRes] = useState<"source" | "1080" | "720">("source");
  const [trim, setTrim] = useState(false);
  const [startS, setStartS] = useState(0);
  const [endS, setEndS] = useState(Math.round(video.durationMs / 100) / 10);
  const totalS = Math.round(video.durationMs / 100) / 10;
  const short = Math.min(video.width, video.height);
  // scale by the SHORT edge so portrait and landscape both mean "720p/1080p"; keep even dimensions for H.264
  const dims = (): { width: number; height: number } | undefined => {
    if (res === "source" || short <= Number(res)) return undefined;
    const k = Number(res) / short;
    const even = (n: number) => Math.max(2, Math.round((n * k) / 2) * 2);
    return { width: even(video.width), height: even(video.height) };
  };
  const trimValid = !trim || (endS - startS >= 0.5 && startS >= 0 && endS <= totalS + 0.05);

  // MP4 in this tab: no Companion needed
  const [web, setWeb] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [webProgress, setWebProgress] = useState<number | null>(null);
  const [webDone, setWebDone] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    let alive = true;
    void canExportInBrowser(video.width, video.height).then((r) => alive && setWeb(r));
    return () => {
      alive = false;
      abort.current?.abort();
    };
  }, [video.width, video.height]);
  const webReady = !!web?.ok && !!renderInput?.src;

  const exportHere = async () => {
    if (!renderInput) return;
    setError(null);
    setWebDone(null);
    setWebProgress(0);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      await flushSave();
      const d = dims();
      const started = clock();
      const blob = await exportMp4InBrowser({
        input: renderInput,
        width: video.width,
        height: video.height,
        fps: video.fps,
        durationMs: video.durationMs,
        scale: d ? d.width / video.width : 1,
        range: trim ? { startMs: Math.round(startS * 1000), endMs: Math.round(endS * 1000) } : undefined,
        quality,
        signal: ctrl.signal,
        onProgress: (f) => setWebProgress(f),
      });
      const name = `${(title || "captionseasy").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "captionseasy"}.mp4`;
      saveBlob(blob, name);
      setWebDone(`${fmtBytes(blob.size)} · made in ${fmtTime(clock() - started)}`);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? `Couldn't render in the browser: ${e.message}` : "Couldn't render in the browser.");
    } finally {
      setWebProgress(null);
      abort.current = null;
    }
  };

  const exportsQ = useQuery({
    queryKey: ["exports", projectId],
    queryFn: () => studioService.listExports(projectId),
    refetchInterval: (q) => ((q.state.data as ExportRow[] | undefined)?.some((e) => e.status_v2 === "queued" || e.status_v2 === "rendering") ? 2500 : false),
  });

  const download = async (id: string) => {
    try {
      triggerDownload(await studioService.exportDownloadUrl(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download.");
    }
  };

  const start = async (o: Option) => {
    if (o.kind === "mp4" && webReady) return exportHere();
    setError(null);
    setBusyKind(o.kind);
    try {
      await flushSave(); // never export stale captions
      const body = {
        kind: o.kind,
        crf: quality === "high" ? 20 : quality === "balanced" ? 24 : 29,
        ...(o.needsComputer ? dims() ?? {} : {}),
        ...(o.needsComputer && trim ? { range: { startMs: Math.round(startS * 1000), endMs: Math.round(endS * 1000) } } : {}),
      };
      const created = await studioService.createExport(projectId, body);
      if (created.ready && created.downloadUrl) triggerDownload(created.downloadUrl);
      await qc.invalidateQueries({ queryKey: ["exports", projectId] });
      await qc.invalidateQueries({ queryKey: ["studio", projectId] });
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusyKind(null);
    }
  };

  const rows = exportsQ.data ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label="Export" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-st-line bg-st-panel pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-st-line px-5 py-4">
          <h2 className="text-lg font-semibold">Export</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-st-muted hover:bg-st-raised hover:text-st-text">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {saving ? <p className="mb-3 rounded-lg bg-st-raised/70 px-3 py-2 text-xs text-st-muted">Saving your latest edits first…</p> : null}
          {!companionOnline ? (
            <div className="mb-4 rounded-xl bg-st-raised/60 px-3 py-3 text-sm text-st-text">
              <p>
                {webReady ? "MP4 and subtitles export right here in your browser." : "Subtitles download right away."} Transparent overlays{webReady ? "" : " and MP4"} are made on your computer with the free CaptionsEasy app.
              </p>
              <div className="mt-2.5"><ConnectComputer compact /></div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-col gap-1.5 text-sm text-st-text/80 sm:flex-row sm:items-center sm:justify-between">
            <span>Video quality</span>
            <div className="grid grid-cols-3 rounded-lg border border-st-line bg-st-raised p-0.5 sm:inline-flex">
              {(["high", "balanced", "small"] as const).map((q) => (
                <button key={q} onClick={() => setQuality(q)} className={`rounded-md px-2.5 py-2 text-xs capitalize sm:py-1 ${quality === q ? "bg-st-lav text-obsidian" : "text-st-text/80"}`}>{q}</button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-1.5 text-sm text-st-text/80 sm:flex-row sm:items-center sm:justify-between">
            <span>Resolution</span>
            <div className="grid grid-cols-3 rounded-lg border border-st-line bg-st-raised p-0.5 sm:inline-flex">
              {([["source", `Original (${short}p)`], ["1080", "1080p"], ["720", "720p"]] as const).map(([v, label]) => (
                <button key={v} disabled={v !== "source" && short <= Number(v)} onClick={() => setRes(v)} className={`whitespace-nowrap rounded-md px-2.5 py-2 text-xs disabled:opacity-30 sm:py-1 ${res === v ? "bg-st-lav text-obsidian" : "text-st-text/80"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl bg-st-raised/50 p-3 text-sm text-st-text/80">
            <label className="flex min-h-8 cursor-pointer items-center gap-2">
              <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} className="accent-[#34D399]" />
              Only export part of the video
            </label>
            {trim ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span>From</span>
                <input type="number" min={0} max={totalS} step={0.1} value={startS} onChange={(e) => setStartS(Number(e.target.value))} className="w-20 rounded border border-st-line bg-st-raised px-2 py-1" aria-label="Trim start (seconds)" />
                <span>to</span>
                <input type="number" min={0} max={totalS} step={0.1} value={endS} onChange={(e) => setEndS(Number(e.target.value))} className="w-20 rounded border border-st-line bg-st-raised px-2 py-1" aria-label="Trim end (seconds)" />
                <span className="text-st-faint">seconds of {totalS}s</span>
                {!trimValid ? <span className="text-st-text">Pick a range of at least 0.5 s</span> : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {OPTIONS.map((o) => (
              <button
                key={o.kind}
                disabled={busyKind !== null || webProgress !== null || (o.needsComputer && !trimValid)}
                onClick={() => void start(o)}
                className="rounded-xl border border-st-line bg-st-raised/50 p-3 text-left transition hover:border-st-ink/30 hover:bg-st-lav/30 disabled:opacity-50"
              >
                <div className="text-sm font-medium text-st-text">{busyKind === o.kind ? "Working…" : o.title}</div>
                <div className="mt-0.5 text-xs text-st-muted">{o.desc}</div>
              </button>
            ))}
          </div>
          {webProgress !== null ? (
            <div className="mt-3 rounded-xl border border-st-line bg-st-raised/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-st-text">Rendering your MP4 in this tab… {Math.round(webProgress * 100)}%</span>
                <Button className="!px-2 !py-1 text-xs" onClick={() => abort.current?.abort()}>Cancel</Button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-st-line">
                <div className="h-full rounded-full bg-st-em transition-[width] duration-300" style={{ width: `${Math.max(2, webProgress * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-st-muted">Keep this tab open. Nothing is uploaded: the video is made on this device.</p>
            </div>
          ) : webDone ? (
            <p className="mt-3 rounded-lg bg-st-em/15 px-3 py-2 text-sm text-st-text">✓ Your MP4 is downloading ({webDone}).</p>
          ) : null}
          {web && !web.ok ? <p className="mt-3 text-xs text-st-muted">{web.reason} MP4 exports will use your computer instead.</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-lg border border-st-or/60 bg-st-or/15 px-3 py-2 text-sm text-st-text">{error}</p> : null}

          {rows.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-st-muted">Your exports</h3>
              <ul className="divide-y divide-white/5 rounded-xl border border-st-line">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-st-text">{KIND_LABEL[r.kind ?? ""] ?? r.kind}{r.resolution ? <span className="text-st-faint"> · {r.resolution}</span> : null}</div>
                      <div className="text-xs text-st-faint">{new Date(r.created_at).toLocaleString()}{r.file_size ? ` · ${fmtBytes(r.file_size)}` : ""}{r.render_duration_ms ? ` · rendered in ${fmtTime(r.render_duration_ms)}` : ""}</div>
                    </div>
                    {r.status_v2 === "ready" ? (
                      <Button tone="primary" onClick={() => void download(r.id)}>Download</Button>
                    ) : r.status_v2 === "queued" || r.status_v2 === "rendering" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-st-text">{companionOnline ? "Rendering…" : "Waiting for computer"}</span>
                        {r.job_id ? <Button className="!px-2 !py-1 text-xs" onClick={() => void studioService.cancelJob(r.job_id!).then(() => exportsQ.refetch())}>Cancel</Button> : null}
                      </div>
                    ) : r.status_v2 === "failed" || r.status_v2 === "cancelled" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-st-text capitalize">{r.status_v2}</span>
                        {r.job_id ? <Button className="!px-2 !py-1 text-xs" onClick={() => void studioService.retryJob(r.job_id!).then(() => exportsQ.refetch())}>Retry</Button> : null}
                      </div>
                    ) : (
                      <span className="text-xs text-st-faint">Expired</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
