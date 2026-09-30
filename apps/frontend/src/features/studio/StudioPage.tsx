"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { computePages } from "@capseasy/compositions";
import { getLook, getTemplate, loadFontFamily } from "@capseasy/templates";
import { insertWordAfter, mergeWithPrevious, retimeRun, setEmphasis, setHidden, setWordText, splitCardAt } from "@motion-ai/caption-engine/core";
import { EyeOff, Redo2, Star, Undo2 } from "lucide-react";
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
  offline: { text: "Offline · retrying", dot: "bg-orange-accent" },
  conflict: { text: "Conflict", dot: "bg-orange-accent" },
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
  const [playing, setPlaying] = useState(false);
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
  const fontKey = style ? [style.fontId, style.hero.fontId ?? "", ...getTemplate(style.templateId).fonts].join("|") : "";
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
  if (!data) return <FullScreen>This project could not be found. <Link className="ml-2 font-semibold text-st-text underline decoration-st-or decoration-2 underline-offset-4" href="/dashboard">Back to projects</Link></FullScreen>;

  const hasEditor = Boolean(doc && style && input);
  const noVideoYet = !video || video.status === "uploading";
  const save = SAVE_LABEL[s.saveState];

  // ---------- building blocks shared by both layouts
  const header = (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-st-line bg-st-panel px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link href="/dashboard" aria-label="Back to projects" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-st-muted transition hover:bg-st-raised hover:text-st-text">←</Link>
        <span className="hidden font-display text-[15px] font-bold sm:inline">Captions<em className="font-medium italic text-st-muted">Easy</em></span>
        <span className="hidden h-5 w-px bg-st-line sm:block" />
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { setEditingTitle(false); if (title.trim() && title !== data.project.title) void s.rename(title.trim()); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
            className="min-w-0 rounded-lg border border-st-ink/40 bg-st-panel px-2 py-1 text-sm outline-none"
          />
        ) : (
          <button onClick={() => { setTitle(data.project.title); setEditingTitle(true); }} className="truncate rounded-md px-1.5 py-1.5 text-sm font-semibold transition hover:bg-st-raised" title="Rename">{data.project.title || "Untitled project"}</button>
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
        <span className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs xl:inline-flex ${data.companionOnline ? "border-st-em/60 bg-st-em/15 text-st-text" : "border-st-line text-st-muted"}`} title={data.companionOnline ? "Your computer is connected" : "No computer connected"}>
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
      onPlayingChange={setPlaying}
      compact={!desktop}
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

  const heroSupported = style ? getTemplate(style.templateId).layout !== "typewriter" : true;
  const captions = doc && style ? (
    <CaptionsPanel doc={doc} pages={pages} currentPageId={currentPage?.id ?? null} timeMs={timeMs} selectedId={selectedId} onSelect={setSelectedId} onSeek={seek} edit={s.edit} heroSupported={heroSupported} />
  ) : null;

  const sidePanel = (t: SideTab) =>
    style ? (
      t === "style" ? <StylePanel style={style} patch={s.patchStyle} lookName={s.lookId?.startsWith("user:") ? "My saved look" : getLook(s.lookId)?.name ?? null} onOpenLooks={() => { if (desktop) setSideTab("looks"); else setMobileTab("looks"); }} />
      : t === "looks" ? <LooksPanel currentLookId={s.lookId} onChoose={s.chooseLook} currentStyle={style} currentSettings={settings} />
      : <SettingsPanel settings={settings} patch={s.patchSettings} layout={getTemplate(style.templateId).layout} />
    ) : null;

  // actions for the selected word, shown in the timeline toolbar (icon buttons, like pro editors)
  const tool = (label: string, icon: React.ReactNode, onClick: () => void, opts: { disabled?: boolean; active?: boolean } = {}) => (
    <button
      key={label}
      onClick={onClick}
      disabled={opts.disabled}
      title={label}
      aria-label={label}
      aria-pressed={opts.active}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 ${opts.active ? "bg-st-lav text-st-ink" : "text-st-text/85 hover:bg-st-hover"}`}
    >
      {icon}
    </button>
  );
  const none = !selected;
  const ic = "h-4 w-4";
  const extraTools = (
    <>
      {tool(selected?.emphasis === "hero" ? "Key word (click to unset)" : "Make key word", <Star className={ic} />, () => selected && s.edit((d) => setEmphasis(d, selected.id, selected.emphasis === "hero" ? "none" : "hero")), { disabled: none || !heroSupported, active: selected?.emphasis === "hero" })}
      {tool("Hide word", <EyeOff className={ic} />, () => { if (!selected) return; s.edit((d) => setHidden(d, selected.id, true)); setSelectedId(null); }, { disabled: none })}
      {tool("Undo", <Undo2 className={ic} />, s.undo, { disabled: !s.canUndo })}
      {tool("Redo", <Redo2 className={ic} />, s.redo, { disabled: !s.canRedo })}
    </>
  );

  const addWordAt = (atMs: number): string | null => {
    let created: string | null = null;
    s.edit((d) => {
      const before = [...d.words].filter((w) => !w.hidden && w.startMs <= atMs).pop() ?? null;
      const withWord = insertWordAfter(d, before?.id ?? null, "new");
      const w = withWord.words.find((x) => !d.words.some((y) => y.id === x.id));
      if (!w) return d;
      created = w.id;
      // place it at the playhead when there is room there
      const next = withWord.words[withWord.words.indexOf(w) + 1];
      const start = Math.max(w.startMs, atMs);
      const end = Math.min(next ? next.startMs : start + 400, start + 400);
      return end - start >= 80 ? retimeRun(withWord, w.id, w.id, start, end) : withWord;
    });
    if (created) setSelectedId(created);
    return created;
  };

  const timeline = doc ? (
    <Timeline
      pages={pages}
      words={doc.words}
      durationMs={durationMs}
      timeMs={timeMs}
      playing={playing}
      selectedId={selectedId}
      peaks={wave.peaks}
      videoUrl={video?.url ?? null}
      videoId={video?.id ?? null}
      videoAspect={width / height}
      waveState={wave.state}
      onSeek={seek}
      onSelect={setSelectedId}
      onRetimeRun={(a, b, st, en, ripple) => s.edit((d) => retimeRun(d, a, b, st, en, ripple))}
      onRename={(id, text) => s.edit((d) => setWordText(d, id, text))}
      onAddWord={addWordAt}
      onSplit={() => selected && s.edit((d) => splitCardAt(d, selected.id))}
      onJoin={() => selected && s.edit((d) => mergeWithPrevious(d, selected.id))}
      onOpenSettings={() => { if (desktop) setSideTab("timing"); else setMobileTab("timing"); }}
      extraTools={extraTools}
      fill={!desktop}
    />
  ) : null;

  const overlays = (
    <>
      {showExport ? <ExportModal projectId={projectId} video={{ width, height, durationMs }} companionOnline={data.companionOnline} saving={s.saveState === "saving" || s.saveState === "dirty"} flushSave={s.saveNow} onClose={() => setShowExport(false)} /> : null}
      {s.conflict ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/40 backdrop-blur-sm p-4">
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

  const properties = (
    <aside aria-label="Properties" className="row-span-2 flex min-h-0 flex-col border-l border-st-line bg-st-panel">
      <nav className="flex shrink-0 gap-1 border-b border-st-line p-2" role="tablist">
        {SIDE_TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={sideTab === t.id} onClick={() => setSideTab(t.id)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sideTab === t.id ? "bg-st-lav text-st-ink" : "text-st-muted hover:bg-st-raised hover:text-st-text"}`}>{t.label}</button>
        ))}
      </nav>
      <div key={sideTab} className="st-rise min-h-0 flex-1">{sidePanel(sideTab)}</div>
    </aside>
  );
  const captionsSection = (
    <section aria-label="Captions" className="flex min-h-0 flex-col border-b border-r border-st-line bg-st-panel">
      <PanelTitle title="Captions" hint={`${pages.length} cards`} />
      <div className="min-h-0 flex-1">{captions}</div>
    </section>
  );

  // ---------- desktop, PORTRAIT video: captions + timeline stacked on the left, a tall preview in the middle
  // that uses the full height (like pro short-form editors), properties on the right
  if (desktop && height > width) {
    return (
      <div className="studio flex h-[100dvh] flex-col">
        {header}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,1fr)_auto_minmax(320px,24vw)] grid-rows-[minmax(0,42%)_minmax(0,1fr)]">
          {captionsSection}
          <section aria-label="Preview" className="row-span-2 h-full min-h-0 bg-st-bg" style={{ aspectRatio: `${width} / ${height}`, maxWidth: "46vw" }}>{stage}</section>
          {properties}
          <section aria-label="Timeline section" className="min-h-0 border-r border-st-line">{timeline}</section>
        </div>
        {overlays}
      </div>
    );
  }

  // ---------- desktop, landscape/square video: captions top-left, preview centre, properties right, timeline across the bottom
  if (desktop) {
    return (
      <div className="studio flex h-[100dvh] flex-col">
        {header}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,24vw)_minmax(0,1fr)_minmax(320px,23vw)] grid-rows-[minmax(0,1fr)_minmax(250px,38%)]">
          {captionsSection}
          <section aria-label="Preview" className="min-h-0 border-b border-st-line bg-st-bg">{stage}</section>
          {properties}
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
      <section aria-label="Preview" className="h-[44dvh] min-h-[260px] shrink-0 border-b border-st-line bg-st-bg">{stage}</section>
      <div key={mobileTab} className="st-rise min-h-0 flex-1 bg-st-panel">
        {mobileTab === "captions" ? captions : mobileTab === "timeline" ? timeline : sidePanel(mobileTab)}
      </div>
      <nav className="grid shrink-0 grid-cols-5 border-t border-st-line bg-st-panel pb-[env(safe-area-inset-bottom)]" role="tablist" aria-label="Editor sections">
        {MOBILE_TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={mobileTab === t.id} onClick={() => setMobileTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${mobileTab === t.id ? "text-st-ink" : "text-st-muted"}`}>
            <span className={`grid h-6 min-w-10 place-items-center rounded-full px-2 text-base leading-none ${mobileTab === t.id ? "bg-st-lav" : ""}`} aria-hidden>{t.icon}</span>
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

const Spinner = () => <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-st-line border-t-st-ink" />;

const FullScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="studio flex h-[100dvh] items-center justify-center text-st-muted">{children}</div>
);
