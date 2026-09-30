"use client";

import React from "react";
import Reveal from "./Reveal";

/**
 * The pipeline really is a sequence — upload feeds transcription feeds
 * styling feeds render — so the numbering carries information here.
 * Each step shows its own artifact instead of an icon-card.
 */

function UploadArtifact() {
  return (
    <div className="rounded-xl border border-dashed border-sand-400 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[12px] text-sand-700">drop your clip here</span>
        <span className="rounded-full bg-sand-100 px-3 py-1 font-mono text-[11px] text-sand-800">
          take-07_final.mp4
        </span>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-sand-100 overflow-hidden">
        <div className="h-full w-[72%] rounded-full bg-sand-500" />
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
    <div className="rounded-xl bg-white border border-sand-200 divide-y divide-sand-100">
      {rows.map(([t, text], i) => (
        <div key={t} className="flex items-baseline gap-4 px-5 py-3">
          <span className="font-mono text-[11px] text-sand-600 shrink-0">{t}</span>
          <span className={`text-[13px] ${i === 1 ? "text-ink font-semibold" : "text-sand-800"}`}>
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

function StyleArtifact() {
  return (
    <div className="rounded-xl bg-white border border-sand-200 p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {["Glow Stack", "Serif Pop", "Word by Word", "Emerald"].map((n, i) => (
          <span
            key={n}
            className={`rounded-full px-3.5 py-1.5 font-sora text-[11px] font-semibold ${
              i === 1 ? "bg-ink text-dune-white" : "bg-sand-100 text-sand-800"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="relative h-20 rounded-lg bg-sand-900 overflow-hidden">
        <div className="absolute left-[22%] top-[30%] w-[56%] h-[40%] border-2 border-sand-300 rounded flex items-center justify-center">
          <span className="font-sora text-[10px] font-semibold text-sand-200">caption box — drag me</span>
        </div>
      </div>
    </div>
  );
}

function RenderArtifact() {
  return (
    <div className="rounded-xl bg-white border border-sand-200 p-5 space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-sand-700">
        <span>remotion render · 1080×1920 · 30fps</span>
        <span className="text-sand-600">frame 812 / 812</span>
      </div>
      <div className="h-1.5 rounded-full bg-sand-100 overflow-hidden">
        <div className="h-full w-full rounded-full bg-sand-600" />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-sora text-[12px] font-semibold text-ink">export ready</span>
        <span className="rounded-full bg-sand-800 text-dune-white px-4 py-1.5 font-sora text-[11px] font-semibold">
          Download MP4
        </span>
      </div>
    </div>
  );
}

const STEPS = [
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
    title: "Pick a template, direct the frame",
    body: "Choose one of eight cinematic styles, then drag the caption box anywhere in the frame and tune the hero and body text independently.",
    artifact: <StyleArtifact />,
  },
  {
    n: "4",
    title: "Render and post",
    body: "A deterministic Remotion pipeline burns the animation into a crisp 1080p vertical MP4. What you previewed is exactly what exports.",
    artifact: <RenderArtifact />,
  },
];

export default function Pipeline() {
  return (
    <section id="how" className="py-24 sm:py-32 bg-sand-50 border-y border-sand-200">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2
            className="font-serif font-semibold tracking-[-0.015em] leading-[1.08] text-ink"
            style={{ fontSize: "clamp(2rem, 4.4vw, 3.3rem)" }}
          >
            From camera roll to <em className="italic text-sand-600">captioned</em> in four moves.
          </h2>
        </Reveal>

        <div className="mt-16 relative">
          {/* Connecting rail (desktop) */}
          <div aria-hidden className="hidden lg:block absolute left-[7px] top-2 bottom-2 w-px bg-sand-300" />

          <div className="space-y-14 lg:space-y-20">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.08}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
                  <div className="lg:col-span-5 lg:pl-12 relative">
                    <span
                      aria-hidden
                      className="hidden lg:block absolute left-0 top-2.5 w-[15px] h-[15px] rounded-full bg-sand-500 ring-4 ring-sand-50"
                    />
                    <p className="font-serif italic text-sand-600 text-lg">step {s.n}</p>
                    <h3 className="mt-1 font-sora text-xl sm:text-2xl font-bold text-ink">{s.title}</h3>
                    <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-sand-800">{s.body}</p>
                  </div>
                  <div className={`lg:col-span-6 ${i % 2 ? "lg:col-start-7" : "lg:col-start-7"}`}>
                    {s.artifact}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
