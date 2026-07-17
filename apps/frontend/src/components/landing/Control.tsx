"use client";

import React from "react";
import Reveal from "./Reveal";

/**
 * The studio ledger: what you can actually adjust once the render exists.
 * A ruled editorial list, not a card grid — each row is one real control
 * surface from the project workspace.
 */

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

export default function Control() {
  return (
    <section id="control" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-4">
          <h2
            className="font-serif font-semibold tracking-[-0.015em] leading-[1.08] text-ink lg:sticky lg:top-28"
            style={{ fontSize: "clamp(2rem, 4.4vw, 3.3rem)" }}
          >
            Automatic, <em className="italic text-sand-600">until you disagree.</em>
          </h2>
        </Reveal>

        <div className="lg:col-span-8">
          <div className="border-t border-sand-200">
            {CONTROLS.map((c, i) => (
              <Reveal key={c.tag} delay={i * 0.05}>
                <div className="group grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-7 border-b border-sand-200 items-baseline transition-colors hover:bg-sand-50 sm:px-4 sm:-mx-4 rounded-lg">
                  <span className="sm:col-span-3 font-mono text-[12px] text-sand-600">{c.tag}</span>
                  <div className="sm:col-span-9">
                    <h3 className="font-sora text-lg font-bold text-ink">{c.title}</h3>
                    <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-sand-800">{c.body}</p>
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
