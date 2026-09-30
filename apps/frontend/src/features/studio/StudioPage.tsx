"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { computePages } from "@capseasy/compositions";
import { getTemplate, loadFontFamily } from "@capseasy/templates";
import { authService } from "@/services/auth";
import { ApiError } from "@/services/api-client";
import { Button } from "./controls";
import { ExportModal } from "./ExportModal";
import { CaptionsPanel } from "./panels/CaptionsPanel";
import { LooksPanel } from "./panels/LooksPanel";
import { SettingsPanel, StylePanel } from "./panels/StylePanel";
import { ProcessingPanel } from "./ProcessingPanel";
import { StudioPlayer } from "./StudioPlayer";
import { Timeline } from "./Timeline";
import { UploadPanel } from "./UploadPanel";
import { useStudio, type SaveState } from "./useStudio";

type Tab = "captions" | "looks" | "style" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "captions", label: "Captions" },
  { id: "looks", label: "Looks" },
  { id: "style", label: "Style" },
  { id: "settings", label: "Timing" },
];

const SAVE_LABEL: Record<SaveState, { text: string; cls: string }> = {
  saved: { text: "Saved", cls: "text-white/40" },
  dirty: { text: "Unsaved changes", cls: "text-amber-300" },
  saving: { text: "Saving…", cls: "text-white/60" },
  offline: { text: "Offline: retrying…", cls: "text-red-300" },
  conflict: { text: "Conflict", cls: "text-red-300" },
};

export default function StudioPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const s = useStudio(projectId);
  const { data, doc, style, settings } = s;

  const [tab, setTab] = useState<Tab>("captions");
  const [timeMs, setTimeMs] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) router.replace(`/login?redirect=${encodeURIComponent(`/projects/${projectId}`)}`);
  }, [router, projectId]);

  const video = data?.video ?? null;
  const width = video?.width || 1080;
  const height = video?.height || 1920;
  const fps = video?.fps || 30;
  const durationMs = video?.durationMs || (doc ? Math.max(0, ...doc.words.map((w) => w.endMs)) + 500 : 10000);

  // load the fonts the style needs before measuring text (same requirement as the render)
  const fontKey = style ? [style.fontId, style.hero.fontId ?? "", ...getTemplate(style.templateId).fonts].join("|") : "";
  useEffect(() => {
    if (!fontKey) return;
    let alive = true;
    setFontsReady(false);
    void Promise.all(fontKey.split("|").filter(Boolean).map(loadFontFamily)).then(() => alive && setFontsReady(true));
    return () => { alive = false; };
  }, [fontKey]);

  const canvas = useMemo(() => ({ width, height, fps }), [width, height, fps]);
  const pages = useMemo(() => (doc && style && fontsReady ? computePages(doc, settings, style, canvas) : []), [doc, style, settings, canvas, fontsReady]);
  const currentPage = pages.find((p) => timeMs >= p.startMs && timeMs < p.endMs) ?? null;

  const seek = useCallback((ms: number) => {
    playerRef.current?.seekTo(Math.max(0, Math.round((ms / 1000) * fps)));
    setTimeMs(ms);
  }, [fps]);

  const input = useMemo(
    () => (doc && style ? { src: video?.url ?? null, media: { width, height, fps, durationMs, rotation: 0 }, doc, style, settings, mode: "burn" as const } : null),
    [doc, style, settings, video?.url, width, height, fps, durationMs],
  );

  // keyboard: space = play/pause, ctrl/cmd+z / shift+z = undo/redo, ctrl/cmd+s = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { if (typing && t.tagName !== "BODY") return; e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); s.redo(); }
      else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); void s.saveNow().catch(() => undefined); }
      else if (e.code === "Space" && !typing) { e.preventDefault(); playerRef.current?.toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  if (s.query.isLoading) return <FullScreen>Loading…</FullScreen>;
  if (s.query.error instanceof ApiError && s.query.error.status === 401) {
    router.replace(`/login?redirect=${encodeURIComponent(`/projects/${projectId}`)}`);
    return <FullScreen>Signing in…</FullScreen>;
  }
  if (!data) return <FullScreen>This project could not be found. <Link className="ml-2 text-emerald-400 underline" href="/dashboard">Back to dashboard</Link></FullScreen>;

  const hasEditor = Boolean(doc && style && input);
  const noVideoYet = !video || video.status === "uploading";
  const save = SAVE_LABEL[s.saveState];

  return (
    <div className="flex h-screen flex-col bg-[#111111] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" aria-label="Back to dashboard" className="rounded-full p-2 hover:bg-white/10">←</Link>
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setEditingTitle(false); if (title.trim() && title !== data.project.title) void s.rename(title.trim()); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
              className="rounded-md border border-emerald-500 bg-[#1f1f1f] px-2 py-1 text-sm outline-none"
            />
          ) : (
            <button onClick={() => { setTitle(data.project.title); setEditingTitle(true); }} className="truncate font-semibold hover:text-emerald-300" title="Rename">{data.project.title || "Untitled project"}</button>
          )}
          {hasEditor ? <span className={`hidden text-xs sm:inline ${save.cls}`} aria-live="polite">{save.text}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {hasEditor ? (
            <>
              <Button onClick={s.undo} disabled={!s.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</Button>
              <Button onClick={s.redo} disabled={!s.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷</Button>
            </>
          ) : null}
          <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:inline-flex ${data.companionOnline ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`} title={data.companionOnline ? "Your computer is connected" : "No computer connected"}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.companionOnline ? "bg-emerald-400" : "bg-white/40"}`} />
            {data.companionOnline ? "Computer connected" : "Computer offline"}
          </span>
          <Button tone="primary" disabled={!hasEditor} onClick={() => setShowExport(true)}>Export</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {hasEditor && style && doc ? (
          <aside className="flex h-72 w-full shrink-0 flex-col border-white/10 bg-[#161616] md:h-auto md:w-[340px] md:border-r">
            <nav className="flex shrink-0 border-b border-white/10" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex-1 border-b-2 py-3 text-sm font-medium transition ${tab === t.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-white/60 hover:text-white"}`}>{t.label}</button>
              ))}
            </nav>
            <div className="min-h-0 flex-1">
              {tab === "captions" && <CaptionsPanel doc={doc} pages={pages} currentPageId={currentPage?.id ?? null} selectedId={selectedId} onSelect={setSelectedId} onSeek={seek} edit={s.edit} />}
              {tab === "looks" && <LooksPanel currentLookId={s.lookId} onChoose={s.chooseLook} />}
              {tab === "style" && <StylePanel style={style} patch={s.patchStyle} />}
              {tab === "settings" && <SettingsPanel settings={settings} patch={s.patchSettings} />}
            </div>
          </aside>
        ) : null}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {hasEditor && input && style ? (
              <StudioPlayer
                ref={playerRef}
                input={input}
                width={width}
                height={height}
                fps={fps}
                durationMs={durationMs}
                position={style.position}
                onMovePosition={(p) => s.patchStyle((st) => ({ ...st, position: p }))}
                onTime={setTimeMs}
              />
            ) : noVideoYet ? (
              <UploadPanel projectId={projectId} onUploaded={() => void s.refetch()} note={video?.status === "uploading" ? "The last upload didn't finish. Choose your video again." : undefined} />
            ) : (
              <ProcessingPanel job={data.job} companionOnline={data.companionOnline} hasVideo onChanged={() => void s.refetch()} />
            )}
          </div>
          {hasEditor ? <Timeline pages={pages} durationMs={durationMs} timeMs={timeMs} onSeek={seek} /> : null}
        </main>
      </div>

      {showExport ? <ExportModal projectId={projectId} companionOnline={data.companionOnline} saving={s.saveState === "saving" || s.saveState === "dirty"} flushSave={s.saveNow} onClose={() => setShowExport(false)} /> : null}

      {s.conflict ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="alertdialog" aria-label="Editing conflict" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6">
            <h2 className="text-lg font-semibold">This project changed somewhere else</h2>
            <p className="mt-2 text-sm text-white/60">You may have it open in another tab or window. Which version do you want to keep?</p>
            <div className="mt-5 flex gap-2">
              <Button tone="primary" onClick={() => s.resolveConflict("mine")}>Keep my edits</Button>
              <Button onClick={() => s.resolveConflict("theirs")}>Load the other version</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const FullScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen items-center justify-center bg-[#111111] text-white/70">{children}</div>
);
