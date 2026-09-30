"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { computePages } from "@capseasy/compositions";
import { EMOJI_FONT, getTemplate, loadFontFamily } from "@capseasy/templates";
import { emojiFor, mergeWithPrevious, retimeWord, setEmphasis, setHidden, setWordEmoji, splitCardAt } from "@motion-ai/caption-engine/core";
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
import { useWaveform } from "./useWaveform";
import { useStudio, type SaveState } from "./useStudio";

type SideTab = "style" | "looks" | "timing";
type MobileTab = "captions" | SideTab | "timeline";
const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: "style", label: "Style" },
  { id: "looks", label: "Looks" },
  { id: "timing", label: "Timing" },
];
const MOBILE_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "captions", label: "Captions", icon: "☰" },
  { id: "style", label: "Style", icon: "Aa" },
  { id: "looks", label: "Looks", icon: "✦" },
  { id: "timeline", label: "Timeline", icon: "▭" },
  { id: "timing", label: "Timing", icon: "◷" },
];

const SAVE_LABEL: Record<SaveState, { text: string; dot: string }> = {
  saved: { text: "Saved", dot: "bg-st-em" },
  dirty: { text: "Unsaved", dot: "bg-st-or" },
  saving: { text: "Saving…", dot: "bg-st-or animate-pulse" },
  offline: { text: "Offline · retrying", dot: "bg-red-400" },
  conflict: { text: "Conflict", dot: "bg-red-400" },
};

/** Tracks the lg breakpoint so only ONE editor layout (and one Player) is mounted at a time. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export default function StudioPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const s = useStudio(projectId);
  const { data, doc, style, settings } = s;
  const desktop = useIsDesktop();

  const [sideTab, setSideTab] = useState<SideTab>("style");
  const [mobileTab, setMobileTab] = useState<MobileTab>("captions");
  const [timeMs, setTimeMs] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const [replacing, setReplacing] = useState(false);
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
  const fontKey = style ? [style.fontId, style.hero.fontId ?? "", ...getTemplate(style.templateId).fonts, style.emoji.enabled ? EMOJI_FONT : ""].join("|") : "";
  useEffect(() => {
    if (!fontKey) return;
    let alive = true;
    setFontsReady(false);
    void Promise.all(fontKey.split("|").filter(Boolean).map(loadFontFamily)).then(() => alive && setFontsReady(true));
    return () => { alive = false; };
  }, [fontKey]);

  const canvas = useMemo(() => ({ width, height, fps }), [width, height, fps]);
  const wave = useWaveform(video?.id, video?.url, video?.size);
  const pages = useMemo(() => (doc && style && fontsReady ? computePages(doc, settings, style, canvas) : []), [doc, style, settings, canvas, fontsReady]);
  const currentPage = pages.find((p) => timeMs >= p.startMs && timeMs < p.endMs) ?? null;
  const selected = doc?.words.find((w) => w.id === selectedId) ?? null;

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

  if (s.query.isLoading) return <FullScreen><Spinner /> Opening your project…</FullScreen>;
  if (s.query.error instanceof ApiError && s.query.error.status === 401) {
    router.replace(`/login?redirect=${encodeURIComponent(`/projects/${projectId}`)}`);
    return <FullScreen>Signing in…</FullScreen>;
  }
  if (!data) return <FullScreen>This project could not be found. <Link className="ml-2 text-st-lav underline" href="/dashboard">Back to projects</Link></FullScreen>;

  const hasEditor = Boolean(doc && style && input);
  const noVideoYet = !video || video.status === "uploading";
  const save = SAVE_LABEL[s.saveState];

  // ---------- building blocks shared by both layouts
  const header = (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-st-line bg-st-bg/95 px-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link href="/dashboard" aria-label="Back to projects" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-st-muted transition hover:bg-st-raised hover:text-st-text">←</Link>
        <span className="hidden font-display text-[15px] font-bold sm:inline">Captions<em className="font-medium italic text-st-lav">Easy</em></span>
        <span className="hidden h-5 w-px bg-st-line sm:block" />
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { setEditingTitle(false); if (title.trim() && title !== data.project.title) void s.rename(title.trim()); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
            className="min-w-0 rounded-lg border border-st-lav bg-st-raised px-2 py-1 text-sm outline-none"
          />
        ) : (
          <button onClick={() => { setTitle(data.project.title); setEditingTitle(true); }} className="truncate text-sm font-semibold transition hover:text-st-lav" title="Rename">{data.project.title || "Untitled project"}</button>
        )}
        {hasEditor ? (
          <span className="hidden items-center gap-1.5 text-xs text-st-muted md:inline-flex" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${save.dot}`} />{save.text}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {hasEditor ? (
          <>
            <Button onClick={s.undo} disabled={!s.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo" className="!px-2.5">↶</Button>
            <Button onClick={s.redo} disabled={!s.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className="!px-2.5">↷</Button>
          </>
        ) : null}
        <span className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs xl:inline-flex ${data.companionOnline ? "border-st-em/30 bg-st-em/10 text-st-em" : "border-st-line text-st-muted"}`} title={data.companionOnline ? "Your computer is connected" : "No computer connected"}>
          <span className={`h-1.5 w-1.5 rounded-full ${data.companionOnline ? "bg-st-em" : "bg-st-faint"}`} />
          {data.companionOnline ? "Computer connected" : "Computer offline"}
        </span>
        <Button tone="primary" disabled={!hasEditor} onClick={() => setShowExport(true)} className="!rounded-full !px-4">Export</Button>
      </div>
    </header>
  );

  const player = hasEditor && input && style ? (
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
  ) : null;

  const stage = player ?? (noVideoYet || replacing ? (
    <UploadPanel
      projectId={projectId}
      onUploaded={() => { setReplacing(false); void s.refetch(); }}
      note={replacing ? "Choose the new video. Captions will be generated for it." : video?.status === "uploading" ? "The last upload didn't finish. Choose your video again." : undefined}
    />
  ) : (
    <ProcessingPanel projectId={projectId} job={data.job} companionOnline={data.companionOnline} pairedComputers={data.pairedComputers ?? []} canTranscribe={data.canTranscribe} cloudAvailable={data.cloudAvailable} onChanged={() => void s.refetch()} onReplaceVideo={() => setReplacing(true)} />
  ));

  const captions = doc && style ? (
    <CaptionsPanel doc={doc} pages={pages} currentPageId={currentPage?.id ?? null} selectedId={selectedId} onSelect={setSelectedId} onSeek={seek} edit={s.edit} />
  ) : null;

  const sidePanel = (t: SideTab) =>
    style ? (
      t === "style" ? <StylePanel style={style} patch={s.patchStyle} />
      : t === "looks" ? <LooksPanel currentLookId={s.lookId} onChoose={s.chooseLook} currentStyle={style} currentSettings={settings} />
      : <SettingsPanel settings={settings} patch={s.patchSettings} />
    ) : null;

  // editing toolbar for the selected word (sits on the timeline, like pro editors)
  const tool = (label: string, icon: string, onClick: () => void, opts: { disabled?: boolean; active?: boolean } = {}) => (
    <button
      key={label}
      onClick={onClick}
      disabled={opts.disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${opts.active ? "bg-st-lav text-obsidian" : "text-st-text/90 hover:bg-st-hover"}`}
    >
      <span aria-hidden className="text-sm leading-none">{icon}</span>
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
  const none = !selected;
  const toolbar = (
    <div className="flex items-center gap-0.5">
      {tool("Split card here", "✂", () => selected && s.edit((d) => splitCardAt(d, selected.id)), { disabled: none })}
      {tool("Join previous", "⇤", () => selected && s.edit((d) => mergeWithPrevious(d, selected.id)), { disabled: none })}
      {tool(selected?.emphasis === "hero" ? "Hero word" : "Make hero", "★", () => selected && s.edit((d) => setEmphasis(d, selected.id, selected.emphasis === "hero" ? "none" : "hero")), { disabled: none, active: selected?.emphasis === "hero" })}
      {tool(selected?.emoji ? "Remove emoji" : "Add emoji", "☺", () => selected && s.edit((d) => setWordEmoji(d, selected.id, selected.emoji ? null : { char: emojiFor(selected.text) ?? "✨", position: "above" })), { disabled: none, active: Boolean(selected?.emoji) })}
      {tool("Hide word", "⌫", () => { if (!selected) return; s.edit((d) => setHidden(d, selected.id, true)); setSelectedId(null); }, { disabled: none })}
      <span className="mx-1.5 h-5 w-px bg-st-line" />
      {tool("Undo", "↶", s.undo, { disabled: !s.canUndo })}
      {tool("Redo", "↷", s.redo, { disabled: !s.canRedo })}
    </div>
  );

  const timeline = doc ? (
    <Timeline
      pages={pages}
      words={doc.words}
      durationMs={durationMs}
      timeMs={timeMs}
      selectedId={selectedId}
      peaks={wave.peaks}
      waveState={wave.state}
      onSeek={seek}
      onSelect={setSelectedId}
      onRetime={(id, st, en) => s.edit((d) => retimeWord(d, id, st, en))}
      toolbar={toolbar}
      fill={!desktop}
    />
  ) : null;

  const overlays = (
    <>
      {showExport ? <ExportModal projectId={projectId} video={{ width, height, durationMs }} companionOnline={data.companionOnline} saving={s.saveState === "saving" || s.saveState === "dirty"} flushSave={s.saveNow} onClose={() => setShowExport(false)} /> : null}
      {s.conflict ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="alertdialog" aria-label="Editing conflict" className="st-rise w-full max-w-md rounded-2xl border border-st-line bg-st-panel p-6">
            <h2 className="font-display text-lg font-bold">This project changed somewhere else</h2>
            <p className="mt-2 text-sm text-st-muted">You may have it open in another tab or window. Which version do you want to keep?</p>
            <div className="mt-5 flex gap-2">
              <Button tone="primary" onClick={() => s.resolveConflict("mine")}>Keep my edits</Button>
              <Button onClick={() => s.resolveConflict("theirs")}>Load the other version</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  // ---------- no editor yet: upload / processing screen, full width
  if (!hasEditor) {
    return (
      <div className="studio flex h-[100dvh] flex-col">
        {header}
        <div className="st-rise min-h-0 flex-1">{stage}</div>
        {overlays}
      </div>
    );
  }

  // ---------- desktop: captions top-left, preview centre, properties right, timeline across the bottom
  if (desktop) {
    return (
      <div className="studio flex h-[100dvh] flex-col">
        {header}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,24vw)_minmax(0,1fr)_minmax(320px,23vw)] grid-rows-[minmax(0,1fr)_minmax(250px,38%)]">
          <section aria-label="Captions" className="flex min-h-0 flex-col border-b border-r border-st-line bg-st-panel">
            <PanelTitle title="Captions" hint={`${pages.length} cards`} />
            <div className="min-h-0 flex-1">{captions}</div>
          </section>
          <section aria-label="Preview" className="min-h-0 border-b border-st-line bg-[radial-gradient(ellipse_at_center,#1d1d1a,#11110f_70%)]">{stage}</section>
          <aside aria-label="Properties" className="row-span-2 flex min-h-0 flex-col border-l border-st-line bg-st-panel">
            <nav className="flex shrink-0 gap-1 border-b border-st-line p-2" role="tablist">
              {SIDE_TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={sideTab === t.id} onClick={() => setSideTab(t.id)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sideTab === t.id ? "bg-st-raised text-st-text shadow-[inset_0_-2px_0_var(--color-st-lav)]" : "text-st-muted hover:text-st-text"}`}>{t.label}</button>
              ))}
            </nav>
            <div key={sideTab} className="st-rise min-h-0 flex-1">{sidePanel(sideTab)}</div>
          </aside>
          <section aria-label="Timeline section" className="col-span-2 min-h-0">{timeline}</section>
        </div>
        {overlays}
      </div>
    );
  }

  // ---------- phone / tablet: preview on top, one tool at a time, bottom tab bar
  return (
    <div className="studio flex h-[100dvh] flex-col">
      {header}
      <section aria-label="Preview" className="h-[40dvh] min-h-[220px] shrink-0 border-b border-st-line bg-[radial-gradient(ellipse_at_center,#1d1d1a,#11110f_70%)]">{stage}</section>
      <div key={mobileTab} className="st-rise min-h-0 flex-1 bg-st-panel">
        {mobileTab === "captions" ? captions : mobileTab === "timeline" ? timeline : sidePanel(mobileTab)}
      </div>
      <nav className="grid shrink-0 grid-cols-5 border-t border-st-line bg-st-bg pb-[env(safe-area-inset-bottom)]" role="tablist" aria-label="Editor sections">
        {MOBILE_TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={mobileTab === t.id} onClick={() => setMobileTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${mobileTab === t.id ? "text-st-lav" : "text-st-muted"}`}>
            <span className="text-base leading-none" aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      {overlays}
    </div>
  );
}

const PanelTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex shrink-0 items-baseline justify-between border-b border-st-line px-4 py-3">
    <h2 className="font-display text-lg font-bold">{title}</h2>
    {hint ? <span className="text-xs text-st-faint">{hint}</span> : null}
  </div>
);

const Spinner = () => <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-st-line border-t-st-lav" />;

const FullScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="studio flex h-[100dvh] items-center justify-center text-st-muted">{children}</div>
);
