"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PLANS } from "@capseasy/shared";

// the real renderer is client-only and fairly heavy: load it after the page shell
const CyclingPreview = dynamic(() => import("./LivePreview").then((m) => m.CyclingPreview), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#0F3D2E]" /> });
const LivePreview = dynamic(() => import("./LivePreview").then((m) => m.LivePreview), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#1f2b27]" /> });

const INK = "#1A1A1A";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-6 items-end gap-[3px]" aria-hidden>
        <span className="block h-3 w-1 rounded-full" style={{ background: light ? "#FFFFEB" : INK }} />
        <span className="block h-5 w-1 rounded-full bg-[#FFA946]" />
        <span className="block h-4 w-1 rounded-full bg-[#34D399]" />
      </span>
      <span className={`font-styled text-xl font-extrabold tracking-tight ${light ? "text-[#FFFFEB]" : "text-[#1A1A1A]"}`}>
        Captions<em className="font-normal italic text-[#0F3D2E]" style={light ? { color: "#F0D7FF" } : undefined}>Easy</em>
      </span>
    </span>
  );
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
        <Link href="/" aria-label="CaptionsEasy home"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#1A1A1A]/80 md:flex">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="group relative py-1 transition hover:text-[#1A1A1A]">
              {label}
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left scale-x-0 rounded-full bg-[#FFA946] transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#1A1A1A]/80 hover:text-[#1A1A1A] sm:block">Sign in</Link>
          <div className="conic-glow-pill rounded-xl p-0.5">
            <Link href="/login" className="flex items-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#1A1A1A] bg-[#F0D7FF] px-3 py-2 text-sm font-bold text-[#1A1A1A] transition hover:scale-[1.03]">
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
      <div data-parallax="0.25" aria-hidden className="pointer-events-none absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#F0D7FF] opacity-70 blur-3xl" />
      <div data-parallax="0.4" aria-hidden className="pointer-events-none absolute -right-24 top-64 h-[360px] w-[360px] rounded-full bg-[#FFA946]/35 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="text-center lg:text-left">
          <p data-hero="eyebrow" className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/15 bg-white/60 px-3 py-1 text-xs font-semibold text-[#1A1A1A]/75">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" /> AI captions for Reels, Shorts, TikTok &amp; YouTube
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
            <div className="conic-glow-pill w-full rounded-2xl p-0.5 sm:w-auto">
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#1A1A1A] bg-[#F0D7FF] px-6 py-3.5 text-base font-bold text-[#1A1A1A] transition hover:scale-[1.02] sm:w-auto">
                Caption your first video free <span aria-hidden>→</span>
              </Link>
            </div>
            <a href="#looks" className="rounded-2xl px-5 py-3.5 text-base font-semibold text-[#1A1A1A]/75 underline-offset-4 hover:text-[#1A1A1A] hover:underline">See the looks</a>
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

const STEPS = [
  { n: "01", title: "Upload your video", body: "Drag in an MP4, MOV or WebM. We read its size and length instantly, before the upload even finishes.", art: "⬆" },
  { n: "02", title: "Captions write themselves", body: "Speech becomes word-timed captions, privately on your own computer with local Whisper, or in the cloud when you're on the go. Hinglish included.", art: "🎙" },
  { n: "03", title: "Pick a look, tweak, export", body: "Choose from distinct animated looks, fix any word, drag timings on the timeline, then export a burned-in MP4, a transparent overlay, or SRT.", art: "✦" },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0F3D2E]/70">How it works</p>
          <h2 className="mt-3 font-styled text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-6xl">
            From raw clip to <em className="font-normal italic">scroll-stopper</em> in three steps.
          </h2>
        </div>
        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-0 right-0 top-10 hidden h-[2px] bg-[#1A1A1A]/10 md:block">
            <div data-progress className="h-full origin-left scale-x-0 bg-gradient-to-r from-[#FFA946] via-[#34D399] to-[#0F3D2E]" />
          </div>
          {STEPS.map((s) => (
            <article key={s.n} data-step className="relative rounded-3xl border border-[#1A1A1A]/10 bg-white/70 p-7 shadow-[0_20px_50px_-35px_rgba(26,26,26,0.5)] backdrop-blur">
              <div className="relative z-10 grid h-20 w-20 place-items-center rounded-2xl border border-[#1A1A1A] bg-[#FFFFEB] text-3xl shadow-[4px_4px_0_#1A1A1A]">{s.art}</div>
              <p className="mt-6 font-mono text-xs font-semibold text-[#FFA946]">{s.n}</p>
              <h3 className="mt-1 font-styled text-2xl font-bold text-[#1A1A1A]">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-[#1A1A1A]/65">{s.body}</p>
            </article>
          ))}
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
  { t: "Emoji on key words", d: "💰 money, 🔥 fire, 🚀 launch. Suggested automatically, never spammed, always editable.", k: "" },
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

const FAQS = [
  ["Does it work for vertical Shorts, Reels and TikToks?", "Yes. Portrait 9:16 and landscape 16:9 both work; the preview and export always match your video's real shape, and captions sit above the platform buttons by default."],
  ["Do I need a powerful computer?", "No. The Companion runs on any modern Windows, Mac or Linux machine. A faster computer just finishes sooner. No computer handy? Short clips can be transcribed in the cloud instead."],
  ["Is my video private?", "Your video is stored privately in your account, and with the Companion the speech recognition and rendering happen on your own machine."],
  ["Can I edit the captions?", "Everything: fix words, split or join cards, drag word timings on the timeline, choose the key word, add emoji, change fonts, colours, motion and position. It all autosaves, with undo."],
  ["Does it support Hindi and Hinglish?", "Yes. Speech is transcribed in 100+ languages, Hinglish can be romanized automatically, and there are Devanagari-ready looks."],
  ["What can I export?", "A ready-to-post MP4 with captions burned in, transparent caption overlays (ProRes 4444 or WebM) for Premiere, Resolve and Final Cut, and SRT, VTT, ASS or TXT subtitle files."],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-4 pb-24 sm:pb-32">
      <div className="mx-auto max-w-3xl">
        <h2 data-reveal className="text-center font-styled text-5xl font-normal italic text-[#1A1A1A] sm:text-6xl">Good questions.</h2>
        <div className="mt-12 divide-y divide-[#1A1A1A]/10 rounded-3xl border border-[#1A1A1A]/10 bg-white/60">
          {FAQS.map(([q, a], i) => (
            <div key={q} data-faq>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-[#1A1A1A]">
                {q}
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#1A1A1A]/20 transition-transform duration-300 ${open === i ? "rotate-45 bg-[#F0D7FF]" : ""}`} aria-hidden>+</span>
              </button>
              <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ gridTemplateRows: open === i ? "1fr" : "0fr" }}>
                <p className="overflow-hidden px-6 text-[#1A1A1A]/70"><span className="block pb-5 leading-relaxed">{a}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="px-4 pb-16">
      <div data-reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#0F3D2E] px-6 py-20 text-center text-[#FFFFEB] sm:py-28">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(52,211,153,0.35),transparent_60%)]" />
        <h2 className="relative font-styled text-5xl font-bold tracking-tight sm:text-7xl">Now, <em className="font-normal italic text-[#F0D7FF]">captivate.</em></h2>
        <p className="relative mx-auto mt-5 max-w-lg text-[#FFFFEB]/70">Your next video deserves captions people actually watch. Start free, in under a minute.</p>
        <div className="relative mt-9 inline-block">
          <div className="conic-glow-pill rounded-2xl p-0.5">
            <Link href="/login" className="flex items-center gap-2 rounded-[16px] border border-[#1A1A1A] bg-[#F0D7FF] px-7 py-4 text-lg font-bold text-[#1A1A1A] transition hover:scale-[1.03]">
              Create free captions <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="px-4 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-[#1A1A1A]/10 pt-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-[#1A1A1A]/55">AI captions that move like you talk. Made for creators.</p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-2"><p className="font-semibold">Product</p><a className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="#how">How it works</a><a className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="#looks">Looks</a><a className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="#pricing">Pricing</a></div>
          <div className="space-y-2"><p className="font-semibold">Account</p><Link className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="/login">Sign in</Link><Link className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="/dashboard">Projects</Link><Link className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="/settings">Companion setup</Link></div>
          <div className="space-y-2"><p className="font-semibold">Help</p><a className="block text-[#1A1A1A]/60 hover:text-[#1A1A1A]" href="#faq">FAQ</a></div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-[#1A1A1A]/40">© {new Date().getFullYear()} CaptionsEasy. All rights reserved.</p>
      <p aria-hidden className="mx-auto mt-6 max-w-6xl select-none font-styled text-[18vw] font-extrabold leading-none tracking-tighter text-[#1A1A1A]/[0.06] sm:text-[14vw]">
        Captions<em className="font-normal italic">Easy</em>
      </p>
    </footer>
  );
}
