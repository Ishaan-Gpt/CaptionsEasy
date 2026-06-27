"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Play, CheckCircle2, Film } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-between overflow-hidden">
      {/* radial background glows */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none" />
      <div className="absolute inset-0 bg-glow-radial-bottom pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <header className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-base text-white tracking-tighter shadow-lg shadow-indigo-600/25">
            M
          </div>
          <span className="font-bold tracking-tight text-zinc-100 text-lg">MotionAI</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Sign In
          </Link>
          <Link href="/register">
            <Button size="sm" className="shadow-lg shadow-indigo-600/10">
              Try Free
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6 py-12 sm:py-20 z-10 space-y-8 animate-fade-in-up">
        {/* promo highlight */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-xs font-medium text-indigo-400 shadow-sm shadow-indigo-500/5">
          <Sparkles size={13} className="animate-pulse" />
          <span>Cinematic captions powered by AI</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none text-zinc-100">
            Convert Talking Videos Into{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
              Social Masterpieces
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Stop manually keyframing subtitles. MotionAI automatically segments speech, selects custom brand styles, adds visual typography emphasis, and renders your clip under 3 minutes.
          </p>
        </div>

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
          <Link href="/register">
            <Button size="lg" className="w-48 gap-2 shadow-xl shadow-indigo-600/15">
              Get Started Free
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            className="w-48 gap-2 cursor-pointer"
            onClick={() =>
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Play size={14} className="fill-current" />
            See How It Works
          </Button>
        </div>

        {/* Feature Highlights Grid */}
        <div id="how-it-works" className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 w-full text-left">
          {[
            {
              title: "Speech Analysis",
              desc: "Deep speech-to-text models track word timings and confidence levels.",
              icon: Film
            },
            {
              title: "Creative Planning",
              desc: "AI identifies key hooks and automatically decides formatting changes.",
              icon: Sparkles
            },
            {
              title: "Cinematic Rendering",
              desc: "Deterministic renderer executes complex typography layouts.",
              icon: CheckCircle2
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="border-zinc-900 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-zinc-200 text-sm">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </Card>
            );
          })}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-16 max-w-7xl w-full mx-auto px-6 border-t border-zinc-900/60 flex items-center justify-between text-xs text-zinc-500 z-10">
        <span>© 2026 MotionAI Inc. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
