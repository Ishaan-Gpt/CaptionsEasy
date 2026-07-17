"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import CaptionPhone from "./CaptionPhone";

/**
 * The headline enters the way the product's captions do — word by word,
 * each popping onto its timing beat. The hero demonstrates before it explains.
 */

const line1 = ["Every", "word,"];
const line2 = ["on", "cue."];

export default function Hero() {
  const reduce = useReducedMotion();

  const word = (w: string, i: number, italic = false) => (
    <motion.span
      key={w + i}
      initial={{ opacity: 0, y: "0.4em", scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0 } : { delay: 0.15 + i * 0.22, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-block ${italic ? "italic font-medium text-sand-600" : "font-semibold text-ink"}`}
    >
      {w}
    </motion.span>
  );

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* One warm wash anchoring the composition to the right, behind the phone */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-full lg:w-[46%] bg-sand-100"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full pt-28 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.6 }}
            className="font-mono text-[12px] text-sand-600 mb-6"
          >
            cinematic captions, rendered with Remotion
          </motion.p>

          <h1
            className="font-serif leading-[1.02] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2.9rem, 7.5vw, 5.6rem)" }}
          >
            <span className="flex flex-wrap gap-x-[0.28em]">{line1.map((w, i) => word(w, i))}</span>
            <span className="flex flex-wrap gap-x-[0.28em]">
              {line2.map((w, i) => word(w, i + line1.length, true))}
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: 1.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-[46ch] text-[15px] sm:text-base leading-relaxed text-sand-800"
          >
            Upload a talking-head clip. CaptionsEasy transcribes it, times every word
            to the beat of your voice, and renders animated captions that feel
            art-directed — ready for Reels, Shorts, and TikTok in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: 1.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/login"
              className="font-sora text-sm font-semibold rounded-full bg-ink text-dune-white px-8 py-4 hover:bg-sand-800 active:scale-[0.98] transition-all"
            >
              Start captioning
            </Link>
            <a
              href="#templates"
              className="font-sora text-sm font-semibold rounded-full border border-sand-400 text-sand-800 px-8 py-4 hover:border-ink hover:text-ink transition-colors"
            >
              See the templates
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { delay: 1.6, duration: 0.8 }}
            className="mt-10 font-mono text-[12px] text-sand-600"
          >
            word-level timing&ensp;·&ensp;8 cinematic templates&ensp;·&ensp;1080p MP4 export
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <CaptionPhone />
        </motion.div>
      </div>
    </section>
  );
}
