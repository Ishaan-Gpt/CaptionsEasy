"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studioService, type ExportKind, type ExportRow } from "@/services/studio";
import { ApiError } from "@/services/api-client";
import { Button, fmtBytes, fmtTime, triggerDownload } from "./controls";

interface Option { kind: ExportKind; title: string; desc: string; needsComputer: boolean }
const OPTIONS: Option[] = [
  { kind: "mp4", title: "Video with captions (MP4)", desc: "Captions burned into your video. Ready to post.", needsComputer: true },
  { kind: "mov_alpha", title: "Transparent overlay (ProRes .mov)", desc: "Captions only, with transparency, for Premiere, Final Cut and DaVinci.", needsComputer: true },
  { kind: "webm_alpha", title: "Transparent overlay (WebM)", desc: "Captions only with transparency, smaller files for web editors.", needsComputer: true },
  { kind: "srt", title: "Subtitles (.srt)", desc: "Works on YouTube, Facebook, LinkedIn and every editor.", needsComputer: false },
  { kind: "vtt", title: "Subtitles (.vtt)", desc: "For web players and HTML5 video.", needsComputer: false },
  { kind: "ass", title: "Styled subtitles (.ass)", desc: "Keeps font, colors and position for editors that support ASS.", needsComputer: false },
  { kind: "txt", title: "Plain transcript (.txt)", desc: "Just the words, one caption per line.", needsComputer: false },
];

const KIND_LABEL: Record<string, string> = { mp4: "MP4", mov_alpha: "ProRes overlay", webm_alpha: "WebM overlay", srt: "SRT", vtt: "VTT", ass: "ASS", txt: "TXT", json: "JSON" };

interface Props {
  projectId: string;
  video: { width: number; height: number; durationMs: number };
  companionOnline: boolean;
  saving: boolean;
  onClose: () => void;
  flushSave: () => Promise<void>;
}

export const ExportModal: React.FC<Props> = ({ projectId, video, companionOnline, saving, onClose, flushSave }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-label="Export" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-st-line bg-st-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-st-line px-5 py-4">
          <h2 className="text-lg font-semibold">Export</h2>
          <button onClick={onClose} aria-label="Close" className="text-st-muted hover:text-st-text">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {saving ? <p className="mb-3 rounded-lg bg-st-raised/70 px-3 py-2 text-xs text-st-muted">Saving your latest edits first…</p> : null}
          {!companionOnline ? (
            <p className="mb-4 rounded-lg bg-st-or/15 px-3 py-2 text-sm text-st-text">
              Your computer isn't connected. Video exports will wait in the queue and start automatically when you run <code className="rounded bg-st-raised px-1">capseasy start</code>. Subtitle files download right away.
            </p>
          ) : null}

          <div className="mb-3 flex items-center justify-between text-sm text-st-text/80">
            <span>Video quality</span>
            <div className="inline-flex rounded-lg bg-st-raised p-0.5">
              {(["high", "balanced", "small"] as const).map((q) => (
                <button key={q} onClick={() => setQuality(q)} className={`rounded-md px-2.5 py-1 text-xs capitalize ${quality === q ? "bg-st-lav text-obsidian" : "text-st-text/80"}`}>{q}</button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-sm text-st-text/80">
            <span>Resolution</span>
            <div className="inline-flex rounded-lg bg-st-raised p-0.5">
              {([["source", `Original (${short}p)`], ["1080", "1080p"], ["720", "720p"]] as const).map(([v, label]) => (
                <button key={v} disabled={v !== "source" && short <= Number(v)} onClick={() => setRes(v)} className={`rounded-md px-2.5 py-1 text-xs disabled:opacity-30 ${res === v ? "bg-st-lav text-obsidian" : "text-st-text/80"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl bg-st-raised/50 p-3 text-sm text-st-text/80">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} className="accent-[#34D399]" />
              Only export part of the video
            </label>
            {trim ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
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
                disabled={busyKind !== null || (o.needsComputer && !trimValid)}
                onClick={() => void start(o)}
                className="rounded-xl border border-st-line bg-st-raised/50 p-3 text-left transition hover:border-st-ink/30 hover:bg-st-lav/30 disabled:opacity-50"
              >
                <div className="text-sm font-medium text-st-text">{busyKind === o.kind ? "Working…" : o.title}</div>
                <div className="mt-0.5 text-xs text-st-muted">{o.desc}</div>
              </button>
            ))}
          </div>
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
