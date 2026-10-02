"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PLANS } from "@capseasy/shared";
import { Logo as BrandLogo } from "@/components/brand/Logo";
import { LEGAL_PAGES } from "@/lib/legal";

// the real renderer is client-only and fairly heavy: load it after the page shell
const CyclingPreview = dynamic(() => import("./LivePreview").then((m) => m.CyclingPreview), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#0F3D2E]" /> });
const LivePreview = dynamic(() => import("./LivePreview").then((m) => m.LivePreview), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#1f2b27]" /> });

const INK = "#1A1A1A";

export function Logo({ light = false }: { light?: boolean }) {
  return <BrandLogo tone={light ? "light" : "dark"} height={28} />;
}

const NAV_LINKS = [
  ["How it works", "#how"],
  ["Controls", "#control"],
  ["Looks", "#looks"],
  ["No install", "#privacy"],
  ["FAQ", "#faq"],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <div data-nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-[#1A1A1A]/10 bg-[#FFFFEB]/85 px-4 py-2.5 shadow-[0_8px_30px_-12px_rgba(26,26,26,0.25)] backdrop-blur-md">
        <Link href="/" aria-label="CaptionsEasy home" className="transition-transform duration-200 hover:scale-105">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 whitespace-nowrap text-sm font-semibold text-[#1A1A1A]/80 lg:flex xl:gap-7">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="group relative py-1 transition-colors duration-200 hover:text-[#1A1A1A]">
              {label}
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left scale-x-0 rounded-full bg-[#FFA946] transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-[#1A1A1A]/80 transition hover:text-[#1A1A1A] sm:block">Sign in</Link>
          {/* phones: this moves into the menu */}
          <div className="conic-glow-pill hidden rounded-full p-[1px] sm:block">
            <Link href="/start" className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-4 py-2 text-sm font-bold text-[#1A1A1A] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
              Start free <span aria-hidden>→</span>
            </Link>
          </div>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-xl border border-[#1A1A1A]/15 lg:hidden">
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-[2px] w-4 bg-[#1A1A1A] transition ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-[2px] w-4 bg-[#1A1A1A] transition ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>
      {open ? (
        <nav className="animate-fade-in-up mx-auto mt-2 grid max-w-6xl gap-1 rounded-2xl border border-[#1A1A1A]/10 bg-[#FFFFEB] p-3 shadow-lg lg:hidden">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-semibold text-[#1A1A1A] hover:bg-[#E4E4D0]/60">{label}</a>
          ))}
          <div className="mt-2 grid gap-2 border-t border-[#1A1A1A]/10 pt-3 sm:hidden">
            <Link href="/start" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-5 py-3.5 text-base font-bold text-[#1A1A1A] active:scale-[0.98]">
              Start free <span aria-hidden>→</span>
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-full px-5 py-3 text-center text-base font-semibold text-[#1A1A1A]/70">Sign in</Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";

// Real CaptionsEasy renders: open-licensed talking-head clips, transcribed by local whisper.cpp and captioned in
// Viral/Popular looks by the export composition (packages/compositions/scripts/hero-clips.ts; credits in credits.json).
const HERO_CLIPS = ["sol", "gianna", "william", "aisha", "jesse", "gereon", "mckensie", "rusita", "omar", "sam"];
const HERO_IMAGES = HERO_CLIPS.map((n) => ({ src: `/hero/${n}.webp`, video: `/hero/${n}.mp4`, alt: "Talking-head clip with animated captions" }));

/** Clips decode only while the hero is on screen and the tab is visible. */
function usePauseOffscreen(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = true;
    const sync = () => {
      const run = onScreen && document.visibilityState === "visible";
      el.querySelectorAll("video").forEach((v) => (run ? void v.play().catch(() => {}) : v.pause()));
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
}

export function Hero() {
  const reel = React.useRef<HTMLDivElement>(null);
  usePauseOffscreen(reel);
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden pt-[max(6.5rem,12vh)]">
      <div data-parallax="0.25" aria-hidden className="pointer-events-none absolute -left-40 top-16 h-[520px] w-[520px] rounded-full bg-[#F0D7FF]/60 blur-3xl" />
      <div data-parallax="0.4" aria-hidden className="pointer-events-none absolute -right-32 top-48 h-[440px] w-[440px] rounded-full bg-[#FFA946]/25 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 text-center">
        <h1 className="font-styled mt-5 text-[clamp(2.7rem,min(6.4vw,9.5vh),5.6rem)] font-bold leading-[0.9] tracking-[-0.05em] text-[#1A1A1A]">
          <span className="inline-block overflow-hidden pb-[0.06em]">
            <span data-hero="word" className="inline-block mr-3 sm:mr-4">Don&rsquo;t edit,</span>
            <span data-hero="word2" className="font-accent gradient-text-sweep inline-block pr-[0.06em] text-[1.1em] font-normal italic tracking-[-0.025em]">just upload.</span>
          </span>
        </h1>

        <p data-hero="sub" className="mx-auto mt-5 max-w-2xl text-[15px] sm:text-[17px] leading-relaxed text-[#1A1A1A]/70 px-4 font-medium">
          Animated captions for your Shorts, Reels and TikToks, made right in your browser. 20+ viral looks, every word editable, no install and no watermark.
        </p>


        <div data-hero="cta" className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <div className="conic-glow-pill w-full rounded-full p-[1px] sm:w-auto">
            <Link href="/start" className="flex w-full items-center justify-center gap-2 rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-8 py-4 text-base font-bold text-[#1A1A1A] shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto">
              Caption your first video free <span aria-hidden>→</span>
            </Link>
          </div>
          <a href="#how" className="w-full rounded-full border border-[#1A1A1A]/15 bg-[#FFFFEB]/80 px-7 py-4 text-base font-semibold text-[#1A1A1A]/80 backdrop-blur-md transition hover:bg-[#FFFFEB] hover:text-[#1A1A1A] sm:w-auto">
            See how it works
          </a>
        </div>


      </div>

      {/* real renders: talking-head clips captioned by our own pipeline */}
      <div ref={reel} data-hero="stream" className="relative z-0 mt-4 pt-2 sm:mt-auto">
        <CoverflowCarousel
          slides={HERO_IMAGES}
          rotate={44}
          depth={0.6}
          perspective={3}
          falloff={0.56}
          fade={0.1}
          ratio={25 / 18}
          cardWidth="clamp(140px, min(20vw, 25vh), 250px)"
          gap={0.05}
          loop
          className="mx-auto w-full"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#FFFFEB]" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl justify-end px-5 pb-3">
        <a href="/credits" className="inline-flex min-h-8 items-center text-[11px] text-[#1A1A1A]/40 hover:text-[#1A1A1A]/75">
          Clips: Wikimedia Commons, CC BY / BY-SA
        </a>
      </div>
    </section>
  );
}

export function Marquee() {
  const items = ["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube", "LinkedIn", "Podcasts", "Hinglish", "Premiere Pro", "DaVinci Resolve", "Final Cut Pro"];
  const row = [...items, ...items];
  return (
    <div className="relative -rotate-1 border-y border-[#1A1A1A] bg-[#1A1A1A] py-4 text-[#FFFFEB]">
      <div className="overflow-hidden">
        <div className="animate-marquee-slow gap-10 pr-10">
          {row.map((t, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap font-styled text-lg font-semibold">
              {t} <span className="text-[#FFA946]" aria-hidden>✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadArtifact() {
  return (
    <div className="rounded-2xl border border-dashed border-[#1A1A1A]/20 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-[#1A1A1A]/60">drop your clip here</span>
        <span className="rounded-full bg-[#FFFFEB] border border-[#1A1A1A]/10 px-3 py-1 font-mono text-[11px] font-semibold text-[#0F3D2E]">
          take-07_final.mp4
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[#1A1A1A]/5 overflow-hidden">
        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#FFA946] to-[#34D399]" />
      </div>
    </div>
  );
}

function TranscriptArtifact() {
  const rows = [
    ["00:00.42", "the first three seconds decide"],
    ["00:02.10", "whether anyone stays,"],
    ["00:03.65", "so make them unmistakable."],
  ];
  return (
    <div className="rounded-2xl bg-white/90 border border-[#1A1A1A]/10 divide-y divide-[#1A1A1A]/5 shadow-sm overflow-hidden">
      {rows.map(([t, text], i) => (
        <div key={t} className={`flex items-baseline gap-4 px-5 py-3 ${i === 1 ? "bg-[#F0D7FF]/30" : ""}`}>
          <span className="font-mono text-[11px] text-[#1A1A1A]/50 shrink-0">{t}</span>
          <span className={`text-[13px] ${i === 1 ? "text-[#1A1A1A] font-bold" : "text-[#1A1A1A]/75"}`}>
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

function StyleArtifact() {
  return (
    <div className="rounded-2xl bg-white/90 border border-[#1A1A1A]/10 p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {["Hormozi Box", "Karaoke Fill", "Beast Bounce", "Emerald"].map((n, i) => (
          <span
            key={n}
            className={`rounded-full px-3.5 py-1 text-[11px] font-bold transition ${
              i === 0 ? "bg-[#1A1A1A] text-[#FFFFEB]" : "bg-[#FFFFEB] border border-[#1A1A1A]/10 text-[#1A1A1A]/70"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="relative h-20 rounded-xl bg-[#1A1A1A] overflow-hidden flex items-center justify-center">
        <div className="w-[68%] h-[56%] border-2 border-dashed border-[#FFA946] rounded-lg flex items-center justify-center bg-[#FFA946]/10">
          <span className="font-styled text-xs font-bold text-[#FFFFEB]">caption box · drag me</span>
        </div>
      </div>
    </div>
  );
}

function RenderArtifact() {
  return (
    <div className="rounded-2xl bg-white/90 border border-[#1A1A1A]/10 p-5 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between font-mono text-[11px] text-[#1A1A1A]/60">
        <span>remotion render · 1080×1920 · 60fps</span>
        <span className="text-[#0F3D2E] font-semibold">100% ready</span>
      </div>
      <div className="h-2 rounded-full bg-[#1A1A1A]/5 overflow-hidden">
        <div className="h-full w-full rounded-full bg-[#34D399]" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="font-styled text-xs font-bold text-[#1A1A1A]">Export burned-in MP4</span>
        <span className="rounded-full bg-[#1A1A1A] text-[#FFFFEB] px-3.5 py-1 text-xs font-bold shadow-sm">
          Download MP4
        </span>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = [
  {
    n: "1",
    title: "Upload the take",
    body: "One MP4, straight from your camera roll. No timeline setup, no project files, no plugins.",
    artifact: <UploadArtifact />,
  },
  {
    n: "2",
    title: "Every word gets a timestamp",
    body: "Speech-to-text runs at word level, so the engine knows exactly when each syllable lands — and you can clean up the transcript before anything is styled.",
    artifact: <TranscriptArtifact />,
  },
  {
    n: "3",
    title: "Pick a look, direct the frame",
    body: "Choose from distinct cinematic styles, then drag the caption box anywhere in the frame and tune the hero and body text independently.",
    artifact: <StyleArtifact />,
  },
  {
    n: "4",
    title: "Render and post",
    body: "A deterministic Remotion pipeline burns the animation into a crisp 1080p vertical MP4. What you previewed is exactly what exports.",
    artifact: <RenderArtifact />,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="max-w-2xl">
          <h2 className="font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-6xl">
            From camera roll to <em className="font-normal italic text-[#0F3D2E]">captioned</em> in four moves.
          </h2>
        </div>

        <div className="relative mt-16">
          <div className="space-y-12 lg:space-y-16">
            {PIPELINE_STEPS.map((s) => (
              <div key={s.n} data-step className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
                <div className="lg:col-span-5 lg:pl-12 relative">
                  <span
                    aria-hidden
                    className="hidden lg:grid place-items-center absolute left-0 top-1.5 w-8 h-8 rounded-full bg-[#1A1A1A] text-[#FFFFEB] font-styled font-bold text-xs shadow-sm ring-4 ring-[#FFFFEB]"
                  >
                    {s.n}
                  </span>
                  <p className="font-styled italic text-[#0F3D2E] text-base">Step {s.n}</p>
                  <h3 className="mt-1 font-styled text-2xl font-bold text-[#1A1A1A]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A]/70 max-w-md">{s.body}</p>
                </div>
                <div className="lg:col-span-7">
                  {s.artifact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



function TimingArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 overflow-hidden flex flex-col justify-end group-hover:bg-[#1A1A1A]/10 transition-colors">
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
         <div className="flex items-end gap-[2px] h-16">
            {[2, 4, 3, 6, 8, 5, 3, 2, 5, 9, 7, 4, 2, 5, 8, 6, 4, 3, 5, 7, 4, 2, 3, 5, 2].map((h, i) => (
              <div key={i} className="w-1.5 bg-[#1A1A1A] rounded-t-full" style={{ height: `${h * 10}%` }} />
            ))}
         </div>
      </div>
      <div className="relative z-10 w-full h-10 border-t border-[#1A1A1A]/20 bg-white/50 backdrop-blur-sm flex items-center px-4">
        <div className="h-full w-2/5 bg-[#FFA946]/30 border-x-2 border-[#FFA946] flex items-center justify-center cursor-ew-resize hover:bg-[#FFA946]/50 transition-colors">
          <span className="text-[10px] sm:text-xs font-bold text-[#1A1A1A] select-none">SYL-LA-BLE</span>
        </div>
      </div>
    </div>
  );
}

function EmotionArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 overflow-hidden flex items-center justify-center group-hover:bg-[#1A1A1A]/10 transition-colors">
      <div className="font-styled text-3xl font-black italic text-[#1A1A1A] origin-bottom transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
        SERIOUSLY.
      </div>
      <div className="absolute top-3 right-3 flex gap-1.5">
        {["💥", "😠", "😂"].map(e => (
          <div key={e} className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-xs shadow-sm hover:scale-110 transition-transform cursor-pointer">{e}</div>
        ))}
      </div>
    </div>
  );
}

function PopArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-white/50 overflow-hidden flex items-center justify-center px-6">
      <div className="text-base font-semibold text-[#1A1A1A]/60 text-center leading-relaxed">
        The word that matters gets <span className="inline-block px-3 py-1 mt-1 rounded-lg bg-[#34D399] text-[#1A1A1A] font-bold text-lg shadow-sm rotate-[-2deg] scale-110 group-hover:rotate-2 group-hover:scale-125 transition-transform duration-300">its own box</span> automatically.
      </div>
    </div>
  );
}

function OverlayArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 overflow-hidden bg-checkerboard flex items-center justify-center group-hover:shadow-inner transition-shadow">
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: 'conic-gradient(#1A1A1A 90deg, transparent 90deg, transparent 180deg, #1A1A1A 180deg, #1A1A1A 270deg, transparent 270deg)', backgroundSize: '16px 16px' }} />
      <div className="relative font-styled text-2xl font-bold text-[#1A1A1A] drop-shadow-md group-hover:scale-105 transition-transform">
        NO BACKGROUND
      </div>
    </div>
  );
}

function ExportArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 overflow-hidden flex items-center justify-center gap-3 px-2 group-hover:bg-[#1A1A1A]/10 transition-colors">
       {['SRT', 'VTT', 'TXT'].map((ext, i) => (
         <div key={ext} className="flex flex-col items-center justify-center w-14 h-16 bg-white rounded-xl shadow-sm border border-[#1A1A1A]/10 relative group-hover:-translate-y-3 transition-transform duration-300" style={{ transitionDelay: `${i * 75}ms` }}>
            <div className="absolute top-0 right-0 w-4 h-4 bg-[#1A1A1A]/5 rounded-bl-xl" />
            <span className="font-mono text-xs font-bold text-[#1A1A1A] mt-2">{ext}</span>
         </div>
       ))}
    </div>
  );
}

function LanguageArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 overflow-hidden flex flex-col items-center justify-center group-hover:bg-[#F0D7FF]/30 transition-colors">
       <div className="flex flex-col items-center space-y-1 group-hover:scale-105 transition-transform">
         <span className="font-sans text-base text-[#1A1A1A]/50 line-through decoration-[#1A1A1A]/30">Kya haal hai?</span>
         <span className="font-sans text-2xl font-bold text-[#1A1A1A]">क्या हाल है?</span>
         <span className="font-mono text-[10px] uppercase text-[#1A1A1A]/40 tracking-widest mt-2 bg-white/50 px-2 py-0.5 rounded">Devanagari Match</span>
       </div>
    </div>
  );
}

function BrandArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-white/50 overflow-hidden flex items-center justify-center gap-5 group-hover:bg-white/80 transition-colors">
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
           <div className="w-6 h-6 rounded-full bg-[#1A1A1A] shadow-sm hover:scale-110 transition-transform cursor-pointer" />
           <div className="w-6 h-6 rounded-full bg-[#FFA946] shadow-sm hover:scale-110 transition-transform cursor-pointer" />
           <div className="w-6 h-6 rounded-full bg-[#34D399] shadow-sm hover:scale-110 transition-transform cursor-pointer" />
        </div>
        <div className="text-[11px] font-mono font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-2 py-0.5 rounded text-center">Inter · 800</div>
      </div>
      <div className="h-12 w-px bg-[#1A1A1A]/10" />
      <div className="font-sans font-black text-xl text-[#1A1A1A] italic group-hover:scale-105 transition-transform">
        YOUR<br/><span className="text-[#FFA946]">LOOK.</span>
      </div>
    </div>
  );
}

function UndoArtifact() {
  return (
    <div className="relative mt-6 h-28 sm:h-32 rounded-2xl border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 overflow-hidden flex items-center justify-center group-hover:bg-[#1A1A1A]/10 transition-colors">
      <div className="w-16 h-16 rounded-full border-[3px] border-[#1A1A1A]/15 border-t-[#1A1A1A] flex items-center justify-center group-hover:-rotate-[360deg] transition-transform duration-700 ease-in-out">
         <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
         </svg>
      </div>
    </div>
  );
}

const FEATURES = [
  { t: "Word-perfect timing", d: "Every word lands on the syllable. Drag any word on the timeline to nudge it; the waveform shows you exactly where.", k: "wide", artifact: <TimingArtifact /> },
  { t: "Captions that feel it", d: "Excited, funny, serious: each card's emotion changes how hard it moves. Dial it up or switch it off.", k: "", artifact: <EmotionArtifact /> },
  { t: "Key words that pop", d: "The word that matters on every card gets its own size, colour or box. Picked automatically, always editable.", k: "", artifact: <PopArtifact /> },
  { t: "Transparent overlays", d: "Export captions only, with transparency (ProRes 4444 or WebM) and drop them over your grade in Premiere, Resolve or Final Cut.", k: "", artifact: <OverlayArtifact /> },
  { t: "SRT, VTT, ASS & TXT", d: "Subtitle files for YouTube, LinkedIn and every editor, instantly, no render needed.", k: "", artifact: <ExportArtifact /> },
  { t: "Hinglish & 100+ languages", d: "Code-switching creators welcome. Romanized Hinglish, Devanagari-ready fonts, custom vocabulary for names and brands.", k: "wide", artifact: <LanguageArtifact /> },
  { t: "Your brand, saved", d: "Save colours, fonts and your favourite looks once. Every new project is on-brand from the first second.", k: "", artifact: <BrandArtifact /> },
  { t: "Undo everything", d: "Autosave, full undo/redo, and a safety net if you edit the same project in two tabs.", k: "", artifact: <UndoArtifact /> },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-6xl">
            A caption studio, <em className="font-normal italic">not a subtitle box.</em>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <article
              key={f.t}
              data-feature
              className={`group relative overflow-hidden rounded-[2rem] border border-[#1A1A1A]/10 p-7 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(26,26,26,0.6)] flex flex-col justify-between ${f.k === "wide" ? "lg:col-span-2" : ""} ${i === 0 ? "bg-[#1A1A1A] text-[#FFFFEB]" : i === 5 ? "bg-[#F0D7FF]" : "bg-white/70"}`}
            >
              <div className="relative z-10">
                <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? "bg-[#FFA946]" : i % 3 === 1 ? "bg-[#34D399]" : "bg-[#1A1A1A]/30"}`} />
                <h3 className="font-styled text-2xl font-bold">{f.t}</h3>
                <p className={`mt-2.5 text-sm sm:text-base leading-relaxed ${i === 0 ? "text-[#FFFFEB]/70" : "text-[#1A1A1A]/70"}`}>{f.d}</p>
              </div>
              
              {/* Feature Artifact */}
              <div className="mt-auto pt-4 relative z-0">
                {/* For the first card which is dark, we need to pass a prop or handle inversion in the component, or just let CSS do it via mix-blend-mode or direct styling if needed. Since we hardcoded the artifacts, we'll invert colors for the first one manually here or use CSS filters */}
                <div className={i === 0 ? "invert brightness-90 hue-rotate-180" : ""}>
                  {f.artifact}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedTerminal({ origin }: { origin: string }) {
  const [step, setStep] = useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStep(1);
        const t1 = setTimeout(() => setStep(2), 1000);
        const t2 = setTimeout(() => setStep(3), 1800);
        const t3 = setTimeout(() => setStep(4), 2600);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
      }
    }, { threshold: 0.5 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative rounded-2xl border border-white/10 bg-[#050505] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col w-full h-full min-h-[290px] lg:min-h-full">
      {/* Mac Titlebar */}
      <div className="flex items-center px-4 py-3 bg-[#111111] border-b border-white/5 relative shrink-0">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-white/10"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-white/10"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-white/10"></div>
        </div>
        <div className="text-[11px] font-mono font-medium text-[#FFFFEB]/40 absolute left-1/2 -translate-x-1/2">
          desktop helper — optional
        </div>
      </div>
      
      {/* Terminal Body */}
      <div className="p-5 font-mono text-[13px] leading-relaxed text-[#FFFFEB]/90 flex-1 overflow-hidden">
         {step >= 1 && (
           <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
             <p className="text-[#FFFFEB]/40"># macOS / Linux</p>
             <p className="flex">
               <span className="text-[#FFA946] mr-2">~</span>
               <span><span className="text-[#34D399]">curl</span> -fsSL {origin}/install.sh | bash</span>
             </p>
           </div>
         )}
         
         {step >= 2 && (
           <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
             <p className="text-[#FFFFEB]/40"># Windows (PowerShell, Command Prompt or Win+R)</p>
             <p className="flex">
               <span className="text-[#FFA946] mr-2">~</span>
               <span className="break-all"><span className="text-[#34D399]">powershell</span> -ExecutionPolicy Bypass -c &quot;irm {origin}/install.ps1 | iex&quot;</span>
             </p>
           </div>
         )}

         {step >= 3 && (
           <div className="mt-5 animate-in fade-in duration-300 space-y-1.5">
             <p className="text-[#34D399] flex items-center gap-2"><span className="opacity-80">✓</span> Dependencies installed.</p>
             <p className="text-[#34D399] flex items-center gap-2"><span className="opacity-80">✓</span> Transparent exports enabled.</p>
           </div>
         )}
         
         {step >= 4 && (
           <div className="mt-1.5 animate-in fade-in duration-300 flex items-center gap-2">
             <p className="text-[#34D399]"><span className="opacity-80">✓</span> Paired · Watching for new videos</p>
             <span className="w-2 h-4 bg-[#34D399] animate-pulse inline-block" />
           </div>
         )}
         
         {step > 0 && step < 4 && (
           <span className="mt-3 w-2 h-4 bg-[#FFFFEB]/50 animate-pulse inline-block" />
         )}
      </div>
    </div>
  );
}

export function Privacy() {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://your-app",
  );
  return (
    <section id="privacy" className="px-4 pb-24 sm:pb-32">
      <div data-reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#1A1A1A] px-6 py-14 text-[#FFFFEB] sm:px-14 sm:py-20 shadow-2xl">
        <div aria-hidden className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#FFA946]/15 blur-3xl" />
        <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#34D399]/10 blur-3xl" />
        
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div className="lg:pr-8">
            <h2 className="font-styled text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Nothing to install. <em className="font-normal italic text-[#F0D7FF]">It runs in your browser.</em></h2>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#FFFFEB]/75">
              Captions are written, styled and exported right in the tab you have open, on your phone or your laptop. No app, no plugin, no per-minute bill. Editing in Premiere, Resolve or Final Cut? The optional free desktop helper adds transparent ProRes and WebM caption overlays.
            </p>
          </div>
          
          <div className="h-[320px] lg:h-full">
            <AnimatedTerminal origin={origin} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const free = PLANS.free;
  const pro = PLANS.pro;
  const mb = (b: number) => (b >= 1024 ** 3 ? `${b / 1024 ** 3} GB` : `${Math.round(b / 1024 ** 2)} MB`);
  const tiers = [
    { name: "Free", price: "₹0", note: "forever", cta: "Start free", href: "/start", hi: false,
      items: [`Videos up to ${free.maxDurationSec / 60} min / ${mb(free.maxUploadBytes)}`, "Unlimited local transcription on your computer", `${free.cloudAsrMinutesPerMonth} cloud minutes / month`, "Every look, full editor, all export formats", `${free.maxProjects} projects · exports kept ${free.exportRetentionDays} days`] },
    { name: "Pro", price: "Soon", note: "join the waitlist", cta: "Get notified", href: "/login", hi: true,
      items: [`Videos up to ${pro.maxDurationSec / 3600} hours / ${mb(pro.maxUploadBytes)}`, `${pro.cloudAsrMinutesPerMonth} cloud minutes / month`, "Unlimited projects", `Exports kept ${pro.exportRetentionDays} days`, "Priority support"] },
  ];
  return (
    <section id="pricing" className="px-4 pb-24 sm:pb-32">
      <div className="mx-auto max-w-5xl">
        <div data-reveal className="text-center">
          <h2 className="font-styled text-4xl font-bold tracking-tight text-[#1A1A1A] sm:text-6xl">Free while you grow.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {tiers.map((t) => (
            <article key={t.name} data-tier className={`relative rounded-[2rem] border p-8 ${t.hi ? "border-[#1A1A1A] bg-[#0F3D2E] text-[#FFFFEB] shadow-[8px_8px_0_#1A1A1A]" : "border-[#1A1A1A]/15 bg-white/70"}`}>
              <h3 className="font-styled text-2xl font-bold">{t.name}</h3>
              <p className="mt-4 font-styled text-5xl font-bold">{t.price}<span className={`ml-2 text-base font-normal ${t.hi ? "text-[#FFFFEB]/60" : "text-[#1A1A1A]/50"}`}>{t.note}</span></p>
              <ul className="mt-6 space-y-3">
                {t.items.map((it) => (
                  <li key={it} className="flex gap-3"><span className={t.hi ? "text-[#34D399]" : "text-[#0F3D2E]"}>✓</span><span className={t.hi ? "text-[#FFFFEB]/85" : "text-[#1A1A1A]/75"}>{it}</span></li>
                ))}
              </ul>
              <Link href={t.href} className={`mt-8 inline-flex w-full justify-center rounded-2xl border px-5 py-3 font-bold transition hover:scale-[1.02] ${t.hi ? "border-[#FFFFEB] bg-[#FFFFEB] text-[#1A1A1A]" : "border-[#1A1A1A] bg-[#F0D7FF] text-[#1A1A1A]"}`}>{t.cta}</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const CONTROLS = [
  {
    title: "The caption box is yours",
    body: "Drag and resize the caption region anywhere in the frame — clear of faces, product shots, or platform UI. The render honours it to the pixel.",
    tag: "layout",
  },
  {
    title: "Timing you can re-cut",
    body: "A word-level timeline lets you nudge any word's in and out points when the delivery needs a different beat than the transcript suggests.",
    tag: "timeline",
  },
  {
    title: "Clean the transcript first",
    body: "Fix names, drop filler words, and merge fragments before styling — so the animation never amplifies a typo.",
    tag: "transcript",
  },
  {
    title: "Hero and body, styled apart",
    body: "The emphasized word and the supporting line carry independent fonts, sizes, and colours. Tune one without disturbing the other.",
    tag: "typography",
  },
  {
    title: "Every export, kept",
    body: "Each render lands in the project's export history with its settings, so last week's look is one click to reproduce.",
    tag: "exports",
  },
];

export function Control() {
  return (
    <section id="control" className="px-4 py-24 sm:py-32 border-t border-[#1A1A1A]/10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div data-reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <h2 className="font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-5xl">
              Automatic, <em className="font-normal italic text-[#0F3D2E]">until you disagree.</em>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#1A1A1A]/70 max-w-sm">
              AI creates the baseline in seconds. You keep frame-by-frame control over every word, break, position, and motion curve.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="divide-y divide-[#1A1A1A]/10 border-t border-b border-[#1A1A1A]/10">
            {CONTROLS.map((c) => (
              <div
                key={c.tag}
                data-reveal
                className="group grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-6 items-baseline transition-colors hover:bg-white/60 sm:px-4 sm:-mx-4 rounded-2xl"
              >
                <span className="sm:col-span-3 font-mono text-xs uppercase tracking-wider text-[#0F3D2E] font-semibold">
                  <span className="rounded-full bg-[#F0D7FF]/60 px-2.5 py-1 text-[11px] text-[#1A1A1A]">
                    {c.tag}
                  </span>
                </span>
                <div className="sm:col-span-9">
                  <h3 className="font-styled text-lg font-bold text-[#1A1A1A] group-hover:text-[#0F3D2E] transition-colors">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#1A1A1A]/70 max-w-[54ch]">
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Will CaptionsEasy work with vertical 9:16 Shorts, Reels, and TikToks?",
    a: "Yes! CaptionsEasy is optimized specifically for short-form portrait video (9:16) as well as traditional widescreen (16:9). All kinetic motion keyframes adjust dynamically to fit your framing, with safe-zone clearance for platform UI buttons.",
  },
  {
    q: "How is CaptionsEasy different from basic CapCut or Premiere captions?",
    a: "Standard video editors apply plain static text. CaptionsEasy delivers syllable-accurate word timing, automatically highlights high-impact hero words with distinct motion, and lets you export transparent overlays (ProRes 4444 / WebM) directly into your NLE timeline.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Transcription, editing and MP4 export all run in your browser, on desktop or phone. The only optional extra is a free desktop helper, for transparent overlay exports (ProRes 4444 / WebM) and very long videos.",
  },
  {
    q: "Can I customize the font, colors, and keyframe animations?",
    a: "Absolutely. Choose from curated viral looks (Hormozi Box, Karaoke Fill, Beast Bounce, Luxe Serif, Neon, Highlighter, etc.), adjust glowing outlines, padding, box radii, and save your brand kit for one-click re-use.",
  },
  {
    q: "Does it support Hindi, Hinglish, and regional accents?",
    a: "Yes. Speech recognition handles 100+ languages, accent variations, fast-talking creators, background noise, and code-switching like Hinglish (with automatic romanization options and Devanagari-ready fonts).",
  },
  {
    q: "What export formats are supported?",
    a: "You can export ready-to-post 1080p vertical MP4 videos with burned-in captions, transparent alpha overlays (ProRes 4444 or WebM) for Premiere, Resolve and Final Cut, or download raw SRT, VTT, ASS and TXT subtitle files instantly.",
  },
];

export function Faq() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section id="faq" className="px-4 pb-24 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="text-center mb-12">
          <h2 className="font-styled text-5xl sm:text-6xl font-normal italic text-[#1A1A1A]">
            Good questions.
          </h2>
        </div>

        {/* Outer Split Container Card */}
        <div data-reveal className="bg-white/60 rounded-3xl p-5 sm:p-8 border border-[#1A1A1A]/10 shadow-[0_20px_50px_-35px_rgba(26,26,26,0.3)] backdrop-blur">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Questions List Card */}
            <div className="lg:col-span-6 bg-[#0F3D2E] text-[#FFFFEB] rounded-2xl p-5 sm:p-7 flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="font-styled font-bold text-xl sm:text-2xl mb-5 text-[#FFFFEB] flex items-center justify-between">
                  <span>Questions</span>
                  <span className="text-xs font-mono font-normal uppercase tracking-wider text-[#34D399]">
                    {activeIdx + 1} / {FAQS.length}
                  </span>
                </h3>

                <div className="space-y-2.5">
                  {FAQS.map((faq, idx) => {
                    const isActive = activeIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl text-sm sm:text-[15px] leading-snug transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? "bg-[#34D399]/20 text-[#FFFFEB] font-bold border border-[#34D399]/40 shadow-sm translate-x-1"
                            : "text-[#FFFFEB]/75 hover:text-[#FFFFEB] hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <span>{faq.q}</span>
                        <span className={`text-xs transition-transform ${isActive ? "text-[#34D399] rotate-90" : "text-[#FFFFEB]/30"}`}>
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Active Answer View */}
            <div className="lg:col-span-6 flex flex-col justify-between p-2 sm:p-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#0F3D2E] font-bold">
                    Answer
                  </span>
                  <span className="text-xs text-[#1A1A1A]/40 font-mono">
                    Instant clarification
                  </span>
                </div>

                {/* Active Question Title Repeated */}
                <h4 className="font-styled text-lg sm:text-xl font-bold text-[#1A1A1A] mb-4 leading-snug">
                  {FAQS[activeIdx].q}
                </h4>

                {/* Answer Bubble Card */}
                <div className="bg-[#FFFFEB] p-6 sm:p-7 rounded-2xl border border-[#1A1A1A]/10 shadow-sm text-sm sm:text-base text-[#1A1A1A]/85 leading-relaxed">
                  {FAQS[activeIdx].a}
                </div>
              </div>

              {/* Bottom Brand Mark Accent */}
              <div className="mt-6 pt-4 border-t border-[#1A1A1A]/5 flex items-center justify-between text-xs text-[#1A1A1A]/50">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                  CaptionsEasy
                </span>
                <span className="font-mono">Runs in your browser</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="px-4 pb-16">
      <div data-reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#0F3D2E] px-6 py-20 text-center text-[#FFFFEB] sm:py-28 shadow-2xl">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(52,211,153,0.35),transparent_60%)]" />
        <h2 className="relative font-styled text-5xl font-bold tracking-tight sm:text-7xl">Now, <em className="font-normal italic text-[#F0D7FF]">captivate.</em></h2>
        <p className="relative mx-auto mt-5 max-w-lg text-[#FFFFEB]/70 text-base sm:text-lg leading-relaxed">Your next video deserves captions people actually watch. Start free, in under a minute.</p>
        <div className="relative mt-9 inline-block">
          <div className="conic-glow-pill rounded-full p-[1px]">
            <Link href="/start" className="flex items-center gap-2 rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-8 py-4 text-base sm:text-lg font-bold text-[#1A1A1A] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
              Create free captions <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "PRODUCT",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Looks gallery", href: "/#looks" },
      { label: "Local Companion", href: "/settings" },
      { label: "Precision controls", href: "/#control" },
    ],
  },
  {
    title: "CREATORS",
    links: [
      { label: "TikTok & Shorts", href: "/#looks" },
      { label: "Instagram Reels", href: "/#looks" },
      { label: "Hinglish & Multi-lingual", href: "/#faq" },
      { label: "Transparent Overlays", href: "/#faq" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Frequently asked questions", href: "/#faq" },
      { label: "Companion setup", href: "/settings" },
      { label: "Project studio", href: "/dashboard" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "Sign in to app", href: "/login" },
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Cookie policy", href: "/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[#1A1A1A]/10 bg-[#FFFFEB] pt-20 pb-10 text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* 4 Column Footer Links Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:gap-16 pb-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/50">
                {col.title}
              </h4>
              <ul className="space-y-0.5 text-sm text-[#1A1A1A]/75 lg:space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-10 items-center transition-colors hover:text-[#0F3D2E] hover:underline underline-offset-4 lg:min-h-0"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant CaptionsEasy Bottom Logo matching Image 1 */}
        <div className="pt-10 sm:pt-14 border-t border-[#1A1A1A]/10 flex items-center justify-between overflow-hidden select-none">
          <Link href="/" className="group flex items-center gap-3 sm:gap-5 w-full">
            {/* Audio Wave Icon Bars with subtle rhythmic bounce */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 h-12 sm:h-20 md:h-28 lg:h-36 shrink-0">
              <span className="w-1.5 sm:w-3 lg:w-4 bg-[#1A1A1A] h-1/2 rounded-full animate-wave-bar-1 transition-transform group-hover:scale-y-110" />
              <span className="w-1.5 sm:w-3 lg:w-4 bg-[#FFA946] h-full rounded-full animate-wave-bar-2 transition-transform group-hover:scale-y-105" />
              <span className="w-1.5 sm:w-3 lg:w-4 bg-[#34D399] h-4/5 rounded-full animate-wave-bar-3 transition-transform group-hover:scale-y-110" />
            </div>

            {/* Giant CaptionsEasy Typography */}
            <span className="font-styled font-black text-4xl sm:text-7xl md:text-8xl lg:text-[130px] leading-none tracking-tighter text-[#1A1A1A] transition-transform duration-300 group-hover:translate-x-1">
              Captions<span className="font-serif font-normal italic text-[#1A1A1A]">Easy</span>
            </span>
          </Link>
        </div>

        {/* Bottom Legal Copyright */}
        <div className="mt-8 pt-6 border-t border-[#1A1A1A]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1A1A1A]/60">
          <span>© {new Date().getFullYear()} CaptionsEasy. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#34D399] animate-pulse" />
            Zero Server Cost · Local Hardware-Accelerated Rendering
          </span>
        </div>

      </div>
    </footer>
  );
}
