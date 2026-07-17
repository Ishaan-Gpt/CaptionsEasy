"use client";

import React from "react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Closing() {
  return (
    <>
      {/* Conversion beat — sand-drenched, one job */}
      <section className="bg-sand-200 border-y border-sand-300">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32 text-center">
          <Reveal>
            <p className="font-mono text-[12px] text-sand-700">no timeline. no keyframes. no plugins.</p>
            <h2
              className="mt-5 font-serif font-semibold tracking-[-0.02em] leading-[1.05] text-ink mx-auto max-w-3xl"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.4rem)" }}
            >
              Your next clip deserves <em className="italic text-sand-700">better type.</em>
            </h2>
            <p className="mt-6 mx-auto max-w-[46ch] text-[15px] leading-relaxed text-sand-800">
              Upload a take, pick a template, and post something that looks like a
              motion designer touched it.
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block font-sora text-sm font-semibold rounded-full bg-ink text-dune-white px-10 py-4.5 hover:bg-sand-800 active:scale-[0.98] transition-all shadow-sand-soft"
              >
                Open the studio
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-dune-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-serif text-lg text-ink">
            Captions<em className="italic text-sand-600">Easy</em>
          </p>
          <p className="font-mono text-[12px] text-sand-700">
            © 2026 CaptionsEasy · transcribed, timed, rendered
          </p>
          <nav className="flex gap-6 font-sora text-[13px] font-medium text-sand-700">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#templates" className="hover:text-ink transition-colors">Templates</a>
            <Link href="/login" className="hover:text-ink transition-colors">Sign in</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
