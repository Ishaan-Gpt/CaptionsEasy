"use client";

import React, { useEffect, useState } from "react";
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
  ["Looks", "#looks"],
  ["Features", "#features"],
  ["Pricing", "#pricing"],
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
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#1A1A1A]/80 md:flex">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="group relative py-1 transition-colors duration-200 hover:text-[#1A1A1A]">
              {label}
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left scale-x-0 rounded-full bg-[#FFA946] transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#1A1A1A]/80 transition hover:text-[#1A1A1A] sm:block">Sign in</Link>
          <div className="conic-glow-pill rounded-full p-[1px]">
            <Link href="/login" className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-4 py-2 text-xs sm:text-sm font-bold text-[#1A1A1A] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
              Start free <span aria-hidden className="hidden sm:inline">→</span>
            </Link>
          </div>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-xl border border-[#1A1A1A]/15 md:hidden">
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-[2px] w-4 bg-[#1A1A1A] transition ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-[2px] w-4 bg-[#1A1A1A] transition ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>
      {open ? (
        <nav className="animate-fade-in-up mx-auto mt-2 grid max-w-6xl gap-1 rounded-2xl border border-[#1A1A1A]/10 bg-[#FFFFEB] p-3 shadow-lg md:hidden">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-semibold text-[#1A1A1A] hover:bg-[#E4E4D0]/60">{label}</a>
          ))}
          <Link href="/login" className="rounded-xl px-3 py-3 text-base font-semibold text-[#1A1A1A]/70">Sign in</Link>
        </nav>
      ) : null}
    </div>
  );
}

const HERO_LOOKS = ["hormozi_box", "karaoke_fill", "beast_bounce", "chat_bubble", "neon_sign", "luxe_serif", "highlighter_card"];

export function Hero() {
  const headline = ["Don't", "edit,"];
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:pt-36 lg:pb-28">
      <div data-parallax="0.25" aria-hidden className="pointer-events-none absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#F0D7FF] opacity-70 blur-3xl animate-pulse" />
      <div data-parallax="0.4" aria-hidden className="pointer-events-none absolute -right-24 top-64 h-[360px] w-[360px] rounded-full bg-[#FFA946]/35 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="text-center lg:text-left">
          <p data-hero="eyebrow" className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/15 bg-white/60 px-3 py-1 text-xs font-semibold text-[#1A1A1A]/75 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" /> AI captions for Reels, Shorts, TikTok &amp; YouTube
          </p>
          <h1 className="font-styled text-[3.1rem] font-bold leading-[0.95] tracking-[-0.03em] text-[#1A1A1A] sm:text-7xl lg:text-[5.6rem]">
            <span className="block overflow-hidden pb-1">
              {headline.map((w) => (
                <span key={w} data-hero="word" className="mr-[0.22em] inline-block">{w}</span>
              ))}
            </span>
            <span className="block overflow-hidden pb-2">
              <span data-hero="word" className="gradient-text-sweep inline-block font-normal italic">just upload.</span>
            </span>
          </h1>
          <p data-hero="sub" className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#1A1A1A]/70 lg:mx-0">
            Drop in a talking-head video. CaptionsEasy writes word-perfect captions, animates every word to your voice, and exports a ready-to-post video. Edit anything in seconds.
          </p>
          <div data-hero="cta" className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <div className="conic-glow-pill w-full rounded-full p-[1px] sm:w-auto">
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-6 py-3.5 text-base font-bold text-[#1A1A1A] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto">
                Caption your first video free <span aria-hidden>→</span>
              </Link>
            </div>
            <a href="#looks" className="rounded-2xl px-5 py-3.5 text-base font-semibold text-[#1A1A1A]/75 underline-offset-4 transition hover:text-[#1A1A1A] hover:underline">See the looks</a>
          </div>
          <p data-hero="sub" className="mt-5 text-xs text-[#1A1A1A]/50">No credit card. Works in your browser; captions are made privately on your own computer.</p>
        </div>

        <div data-hero="phone" className="relative mx-auto w-[260px] sm:w-[300px]">
          <div aria-hidden className="absolute -inset-6 rounded-[3rem] bg-gradient-to-b from-[#34D399]/25 to-[#F0D7FF]/40 blur-2xl" />
          <div className="relative rounded-[2.6rem] border-[10px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_40px_80px_-30px_rgba(26,26,26,0.6)]">
            <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1A1A1A]" />
            <CyclingPreview lookIds={HERO_LOOKS} className="aspect-[9/16] overflow-hidden rounded-[2rem]" />
          </div>
          <div data-float className="absolute -left-10 top-16 hidden rounded-2xl border border-[#1A1A1A]/10 bg-white px-3 py-2 text-xs font-semibold shadow-lg sm:block">✨ Hero words picked for you</div>
          <div data-float className="absolute -right-12 bottom-24 hidden rounded-2xl border border-[#1A1A1A]/10 bg-white px-3 py-2 text-xs font-semibold shadow-lg sm:block">🎯 Timed to every syllable</div>
        </div>
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">How it works</p>
          <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-6xl">
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

const SHOWCASE = [
  ["hormozi_box", "Viral"], ["karaoke_fill", "Viral"], ["beast_bounce", "Viral"], ["neon_sign", "Retro"],
  ["chat_bubble", "Fun"], ["highlighter_card", "Education"], ["luxe_serif", "Luxury"], ["kinetic_mix", "Cinematic"],
] as const;

export function Looks() {
  return (
    <section id="looks" className="relative overflow-hidden bg-[#0F3D2E] px-4 py-24 text-[#FFFFEB] sm:py-32">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#34D399]/15 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div data-reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#34D399]">The looks</p>
            <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Every look is <em className="font-normal italic text-[#F0D7FF]">its own idea.</em>
            </h2>
          </div>
          <p className="max-w-sm text-[#FFFFEB]/70">No colour-swapped clones. Karaoke fills, jumping boxes, chat bubbles, typewriters, kinetic stacks: each one moves differently. These previews are the real renderer, live.</p>
        </div>
        <div className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-4">
          {SHOWCASE.map(([id, cat], i) => (
            <figure key={id} data-look className="group w-[62vw] shrink-0 snap-center sm:w-auto">
              <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] transition duration-500 group-hover:-translate-y-1.5 group-hover:border-[#F0D7FF]/50">
                <LivePreview lookId={id} backdrop={i} className="aspect-[9/16] w-full" />
              </div>
              <figcaption className="mt-3 flex items-center justify-between px-1 text-sm">
                <span className="font-semibold">{NAMES[id]}</span>
                <span className="text-[#FFFFEB]/50">{cat}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p data-reveal className="mt-10 text-center text-[#FFFFEB]/60">…and more, from subtitle bars to terminal typewriters. Save your own and your brand colours too.</p>
      </div>
    </section>
  );
}
const NAMES: Record<string, string> = {
  hormozi_box: "Hormozi Box", karaoke_fill: "Karaoke Fill", beast_bounce: "Beast Bounce", neon_sign: "Neon", chat_bubble: "Chat Bubble",
  highlighter_card: "Highlighter", luxe_serif: "Luxe Serif", kinetic_mix: "Kinetic",
};

const FEATURES = [
  { t: "Word-perfect timing", d: "Every word lands on the syllable. Drag any word on the timeline to nudge it; the waveform shows you exactly where.", k: "wide" },
  { t: "Captions that feel it", d: "Excited, funny, serious: each card's emotion changes how hard it moves. Dial it up or switch it off.", k: "" },
  { t: "Key words that pop", d: "The word that matters on every card gets its own size, colour or box. Picked automatically, always editable.", k: "" },
  { t: "Transparent overlays", d: "Export captions only, with transparency (ProRes 4444 or WebM) and drop them over your grade in Premiere, Resolve or Final Cut.", k: "" },
  { t: "SRT, VTT, ASS & TXT", d: "Subtitle files for YouTube, LinkedIn and every editor, instantly, no render needed.", k: "" },
  { t: "Hinglish & 100+ languages", d: "Code-switching creators welcome. Romanized Hinglish, Devanagari-ready fonts, custom vocabulary for names and brands.", k: "wide" },
  { t: "Your brand, saved", d: "Save colours, fonts and your favourite looks once. Every new project is on-brand from the first second.", k: "" },
  { t: "Undo everything", d: "Autosave, full undo/redo, and a safety net if you edit the same project in two tabs.", k: "" },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">Features</p>
          <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-6xl">
            A caption studio, <em className="font-normal italic">not a subtitle box.</em>
          </h2>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <article
              key={f.t}
              data-feature
              className={`group relative overflow-hidden rounded-3xl border border-[#1A1A1A]/10 p-6 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(26,26,26,0.6)] ${f.k === "wide" ? "lg:col-span-2" : ""} ${i === 0 ? "bg-[#1A1A1A] text-[#FFFFEB]" : i === 5 ? "bg-[#F0D7FF]" : "bg-white/70"}`}
            >
              <span className={`absolute right-5 top-5 h-2 w-2 rounded-full ${i % 3 === 0 ? "bg-[#FFA946]" : i % 3 === 1 ? "bg-[#34D399]" : "bg-[#1A1A1A]/30"}`} />
              <h3 className="font-styled text-xl font-bold">{f.t}</h3>
              <p className={`mt-2 leading-relaxed ${i === 0 ? "text-[#FFFFEB]/70" : "text-[#1A1A1A]/65"}`}>{f.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Privacy() {
  const [origin, setOrigin] = useState("https://your-app");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <section className="px-4 pb-24 sm:pb-32">
      <div data-reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#1A1A1A] px-6 py-14 text-[#FFFFEB] sm:px-14 sm:py-20">
        <div aria-hidden className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#FFA946]/20 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FFA946]">Private by design</p>
            <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Your voice stays <em className="font-normal italic text-[#F0D7FF]">on your computer.</em></h2>
            <p className="mt-5 max-w-lg leading-relaxed text-[#FFFFEB]/70">
              The free CaptionsEasy Companion transcribes and renders on your own machine with local Whisper, so there's no per-minute cloud bill and no queue. One command installs it; after that it just works in the background.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-[13px] leading-relaxed shadow-inner">
            <p className="text-[#FFFFEB]/40"># Windows (PowerShell)</p>
            <p><span className="text-[#34D399]">irm</span> {origin}/install.ps1 <span className="text-[#FFA946]">|</span> iex</p>
            <p className="mt-3 text-[#FFFFEB]/40"># macOS / Linux</p>
            <p><span className="text-[#34D399]">curl</span> -fsSL {origin}/install.sh <span className="text-[#FFA946]">|</span> bash</p>
            <p className="mt-4 text-[#34D399]">✓ Paired · Watching for new videos…</p>
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
    { name: "Free", price: "₹0", note: "forever", cta: "Start free", href: "/login", hi: false,
      items: [`Videos up to ${free.maxDurationSec / 60} min / ${mb(free.maxUploadBytes)}`, "Unlimited local transcription on your computer", `${free.cloudAsrMinutesPerMonth} cloud minutes / month`, "Every look, full editor, all export formats", `${free.maxProjects} projects · exports kept ${free.exportRetentionDays} days`] },
    { name: "Pro", price: "Soon", note: "join the waitlist", cta: "Get notified", href: "/login", hi: true,
      items: [`Videos up to ${pro.maxDurationSec / 3600} hours / ${mb(pro.maxUploadBytes)}`, `${pro.cloudAsrMinutesPerMonth} cloud minutes / month`, "Unlimited projects", `Exports kept ${pro.exportRetentionDays} days`, "Priority support"] },
  ];
  return (
    <section id="pricing" className="px-4 pb-24 sm:pb-32">
      <div className="mx-auto max-w-5xl">
        <div data-reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">Pricing</p>
          <h2 className="mt-3 font-styled text-4xl font-bold tracking-tight text-[#1A1A1A] sm:text-6xl">Free while you grow.</h2>
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">Precision editing</p>
            <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-5xl">
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
    q: "Do I need a high-end GPU or cloud server to render videos?",
    a: "No! The lightweight CaptionsEasy Companion runs on your own computer with local Whisper and Remotion hardware acceleration. There are zero cloud render queues and no per-minute bills.",
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">FAQ</p>
          <h2 className="mt-3 font-styled text-5xl sm:text-6xl font-normal italic text-[#1A1A1A]">
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
                  Verified for CapsEasy v2
                </span>
                <span className="font-mono">Local + Cloud</span>
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
            <Link href="/login" className="flex items-center gap-2 rounded-full border border-[#1A1A1A]/30 bg-[#F0D7FF] px-8 py-4 text-base sm:text-lg font-bold text-[#1A1A1A] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
      { label: "Feature studio", href: "/#features" },
      { label: "Local Companion", href: "/settings" },
      { label: "Precision controls", href: "/#control" },
    ],
  },
  {
    title: "CREATORS",
    links: [
      { label: "TikTok & Shorts", href: "/#looks" },
      { label: "Instagram Reels", href: "/#looks" },
      { label: "Podcast & Long-form", href: "/#features" },
      { label: "Hinglish & Multi-lingual", href: "/#faq" },
      { label: "Transparent Overlays", href: "/#faq" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Pricing plans", href: "/#pricing" },
      { label: "Frequently asked questions", href: "/#faq" },
      { label: "Companion setup", href: "/settings" },
      { label: "Project studio", href: "/dashboard" },
      { label: "All looks archive", href: "/landing-classic" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "Sign in to app", href: "/login" },
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Cookie policy", href: "/cookies" },
      { label: "Refund policy", href: "/refunds" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[#1A1A1A]/10 bg-[#FFFFEB] pt-20 pb-10 text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* 4 Column Footer Links Grid */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-16 pb-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/50">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#1A1A1A]/75">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-[#0F3D2E] hover:underline underline-offset-4"
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
