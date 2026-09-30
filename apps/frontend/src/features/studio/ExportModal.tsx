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
  companionOnline: boolean;
  saving: boolean;
  onClose: () => void;
  flushSave: () => Promise<void>;
}

export const ExportModal: React.FC<Props> = ({ projectId, companionOnline, saving, onClose, flushSave }) => {
  const qc = useQueryClient();
  const [busyKind, setBusyKind] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<"high" | "balanced" | "small">("high");

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
      const res = await studioService.createExport(projectId, { kind: o.kind, crf: quality === "high" ? 20 : quality === "balanced" ? 24 : 29 });
      if (res.ready && res.downloadUrl) triggerDownload(res.downloadUrl);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Export" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold">Export</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {saving ? <p className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">Saving your latest edits first…</p> : null}
          {!companionOnline ? (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Your computer isn't connected. Video exports will wait in the queue and start automatically when you run <code className="rounded bg-black/40 px-1">capseasy start</code>. Subtitle files download right away.
            </p>
          ) : null}

          <div className="mb-3 flex items-center justify-between text-sm text-white/70">
            <span>Video quality</span>
            <div className="inline-flex rounded-lg bg-white/10 p-0.5">
              {(["high", "balanced", "small"] as const).map((q) => (
                <button key={q} onClick={() => setQuality(q)} className={`rounded-md px-2.5 py-1 text-xs capitalize ${quality === q ? "bg-emerald-500 text-black" : "text-white/70"}`}>{q}</button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {OPTIONS.map((o) => (
              <button
                key={o.kind}
                disabled={busyKind !== null}
                onClick={() => void start(o)}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-500/5 disabled:opacity-50"
              >
                <div className="text-sm font-medium text-white">{busyKind === o.kind ? "Working…" : o.title}</div>
                <div className="mt-0.5 text-xs text-white/50">{o.desc}</div>
              </button>
            ))}
          </div>
          {error ? <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

          {rows.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">Your exports</h3>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-white">{KIND_LABEL[r.kind ?? ""] ?? r.kind}{r.resolution ? <span className="text-white/40"> · {r.resolution}</span> : null}</div>
                      <div className="text-xs text-white/40">{new Date(r.created_at).toLocaleString()}{r.file_size ? ` · ${fmtBytes(r.file_size)}` : ""}{r.render_duration_ms ? ` · rendered in ${fmtTime(r.render_duration_ms)}` : ""}</div>
                    </div>
                    {r.status_v2 === "ready" ? (
                      <Button tone="primary" onClick={() => void download(r.id)}>Download</Button>
                    ) : r.status_v2 === "queued" || r.status_v2 === "rendering" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-300">{companionOnline ? "Rendering…" : "Waiting for computer"}</span>
                        {r.job_id ? <Button className="!px-2 !py-1 text-xs" onClick={() => void studioService.cancelJob(r.job_id!).then(() => exportsQ.refetch())}>Cancel</Button> : null}
                      </div>
                    ) : r.status_v2 === "failed" || r.status_v2 === "cancelled" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-300 capitalize">{r.status_v2}</span>
                        {r.job_id ? <Button className="!px-2 !py-1 text-xs" onClick={() => void studioService.retryJob(r.job_id!).then(() => exportsQ.refetch())}>Retry</Button> : null}
                      </div>
                    ) : (
                      <span className="text-xs text-white/40">Expired</span>
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
