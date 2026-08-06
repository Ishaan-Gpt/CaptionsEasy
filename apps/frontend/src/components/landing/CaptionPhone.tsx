"use client";

import React, { useEffect, useState, useRef } from "react";
import { SPECIMENS, DEMO_WORDS } from "./TemplateSpecimen";

const HERO_CYCLE = ["glow_stack", "cinematic_emerald", "serif_pop", "sentence_highlight"];
const WORD_MS = 520;

type ScenePreset = "tech" | "podcast" | "vlog" | "fitness";

interface SceneConfig {
  id: ScenePreset;
  name: string;
  badge: string;
  bgGradient: string;
  glowColor: string;
  lightAccent: string;
  speakerHeadphone?: boolean;
  speakerMic?: boolean;
}

const SCENES: Record<ScenePreset, SceneConfig> = {
  tech: {
    id: "tech",
    name: "Tech Review",
    badge: "Tech Studio",
    bgGradient:
      "radial-gradient(130% 90% at 75% 20%, rgba(56,189,248,0.32) 0%, rgba(15,23,42,0) 60%), radial-gradient(120% 100% at 20% 80%, rgba(99,102,241,0.28) 0%, rgba(15,23,42,0) 65%), #090D16",
    glowColor: "rgba(56, 189, 248, 0.4)",
    lightAccent: "#38BDF8",
    speakerHeadphone: true,
  },
  podcast: {
    id: "podcast",
    name: "Podcast Host",
    badge: "Studio Setup",
    bgGradient:
      "radial-gradient(130% 90% at 65% 20%, rgba(245,158,11,0.38) 0%, rgba(28,19,8,0) 60%), radial-gradient(120% 100% at 25% 75%, rgba(217,119,6,0.25) 0%, rgba(28,19,8,0) 65%), #140E07",
    glowColor: "rgba(245, 158, 11, 0.4)",
    lightAccent: "#F59E0B",
    speakerMic: true,
  },
  vlog: {
    id: "vlog",
    name: "Travel Vlog",
    badge: "Creator Vlog",
    bgGradient:
      "radial-gradient(130% 90% at 80% 15%, rgba(236,72,153,0.35) 0%, rgba(20,10,25,0) 60%), radial-gradient(120% 100% at 20% 85%, rgba(168,85,247,0.3) 0%, rgba(20,10,25,0) 65%), #120919",
    glowColor: "rgba(236, 72, 153, 0.4)",
    lightAccent: "#EC4899",
  },
  fitness: {
    id: "fitness",
    name: "Fitness Energy",
    badge: "Vertical Reel",
    bgGradient:
      "radial-gradient(130% 90% at 70% 25%, rgba(16,185,129,0.38) 0%, rgba(6,25,18,0) 60%), radial-gradient(120% 100% at 20% 70%, rgba(6,182,212,0.3) 0%, rgba(6,25,18,0) 65%), #061510",
    glowColor: "rgba(16, 185, 129, 0.4)",
    lightAccent: "#10B981",
  },
};

export default function CaptionPhone() {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [sceneId, setSceneId] = useState<ScenePreset>("tech");
  const [wordIdx, setWordIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 54 }); // in %

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  // Automatic word ticker loop
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setWordIdx((i) => (i + 1) % DEMO_WORDS.length);
    }, WORD_MS);
    return () => clearInterval(t);
  }, [isPlaying]);

  // Automatic template cycle every full loop if playing
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setTemplateIdx((i) => (i + 1) % HERO_CYCLE.length);
    }, DEMO_WORDS.length * WORD_MS * 2.5);
    return () => clearInterval(t);
  }, [isPlaying]);

  const spec = SPECIMENS.find((s) => s.id === HERO_CYCLE[templateIdx]) || SPECIMENS[0];
  const scene = SCENES[sceneId];

  const seconds = (wordIdx * WORD_MS) / 1000;
  const timecode = `00:0${Math.floor(seconds)}:${String(Math.round((seconds % 1) * 30)).padStart(2, "0")}`;

  // Drag handlers for the caption overlay
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((moveEvt.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaYPercent = ((moveEvt.clientY - dragStartRef.current.y) / rect.height) * 100;

      const newX = Math.min(82, Math.max(18, dragStartRef.current.posX + deltaXPercent));
      const newY = Math.min(85, Math.max(18, dragStartRef.current.posY + deltaYPercent));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const resetPosition = () => setPosition({ x: 50, y: 54 });

  return (
    <div className="relative w-full max-w-[310px] sm:max-w-[350px] mx-auto select-none">
      {/* Ambient Halo Glow */}
      <div
        className="absolute -inset-4 rounded-[3rem] blur-2xl opacity-60 transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${scene.glowColor}, transparent 70%)`,
        }}
      />

      {/* Main Studio Frame */}
      <div
        ref={containerRef}
        className="relative aspect-[9/16] rounded-[2.2rem] overflow-hidden bg-ink shadow-2xl ring-8 ring-white/90 border border-sand-300/30 group"
      >
        {/* Dynamic Simulated Video Background */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: scene.bgGradient }}
        />

        {/* Video Bokeh / Aperture Flares */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-40 animate-pulse"
            style={{ backgroundColor: scene.lightAccent }}
          />
          <div
            className="absolute top-1/3 -left-16 w-36 h-36 rounded-full blur-2xl opacity-25"
            style={{ backgroundColor: scene.lightAccent }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
        </div>

        {/* Realistic Speaker Silhouette & Depth Layer */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="relative w-full h-full flex flex-col items-center justify-end pb-8">
            {/* Soft subtle camera breathing animation */}
            <div className="relative w-48 h-64 flex flex-col items-center animate-subtle-float">
              {/* Speaker Head */}
              <div className="w-24 h-28 rounded-full bg-gradient-to-b from-sand-200/20 to-sand-400/5 border border-white/10 relative shadow-inner">
                {scene.speakerHeadphone && (
                  <div className="absolute top-4 -inset-x-2 h-4 border-t-4 border-sand-300/40 rounded-t-full" />
                )}
              </div>
              {/* Speaker Shoulders */}
              <div className="w-44 h-32 rounded-t-[4rem] bg-gradient-to-b from-sand-300/15 to-transparent border-t border-white/10 -mt-8" />
              {/* Microphone Stand (if podcast) */}
              {scene.speakerMic && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-20 bg-gradient-to-t from-amber-500/30 to-sand-200/40 rounded-t-full border border-white/20" />
              )}
            </div>
          </div>
        </div>

        {/* Top Header / Camera Notch & Status */}
        <div className="absolute top-3 inset-x-0 px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-[10px] text-white/90 font-medium tracking-wide">REC</span>
          </div>

          {/* Dynamic Island Pill */}
          <div className="w-16 h-3 bg-black/80 rounded-full border border-white/10 shadow-sm" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute visualizer audio" : "Unmute visualizer audio"}
              className="p-1 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Scene Selector Pills Bar */}
        <div className="absolute top-12 inset-x-3 flex justify-center z-20">
          <div className="flex gap-1 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
            {(Object.keys(SCENES) as ScenePreset[]).map((key) => (
              <button
                key={key}
                onClick={() => setSceneId(key)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-sora font-semibold transition-all cursor-pointer ${
                  sceneId === key
                    ? "bg-white text-ink shadow-sm scale-105"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {SCENES[key].name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Draggable Live Caption Box */}
        <div
          onPointerDown={handlePointerDown}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          className={`absolute z-30 cursor-grab active:cursor-grabbing max-w-[85%] transition-shadow ${
            isDragging ? "scale-105" : ""
          }`}
        >
          {/* Interactive Frame Box Guide */}
          <div className="relative group/box p-2 rounded-xl border border-dashed border-white/20 hover:border-white/60 transition-colors">
            {/* Position coordinate tag on hover/drag */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/box:opacity-100 transition-opacity bg-black/80 text-[9px] font-mono text-sand-300 px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap border border-white/10">
              Drag Caption • X: {Math.round(position.x)}% Y: {Math.round(position.y)}%
            </div>

            {/* Corner Grab Handles */}
            <span className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full opacity-60" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-60" />
            <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full opacity-60" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-white rounded-full opacity-60" />

            {/* Render Active Template Specimen */}
            <div className="text-center min-h-[5rem] flex items-center justify-center">
              {spec.render(DEMO_WORDS, wordIdx)}
            </div>
          </div>
        </div>

        {/* Reset Position Button if moved */}
        {(position.x !== 50 || position.y !== 54) && (
          <button
            onClick={resetPosition}
            className="absolute top-20 right-3 z-30 bg-black/60 backdrop-blur-md text-[10px] font-mono text-sand-300 px-2 py-1 rounded-full border border-white/15 hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            Reset Pos
          </button>
        )}

        {/* Audio Waveform Spectrum Visualizer */}
        <div className="absolute bottom-16 inset-x-5 flex justify-center items-end gap-0.5 h-6 z-20 pointer-events-none">
          {[40, 75, 45, 90, 60, 100, 70, 85, 50, 95, 65, 40].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full transition-all duration-150"
              style={{
                backgroundColor: isPlaying && soundEnabled ? scene.lightAccent : "rgba(255,255,255,0.2)",
                height: isPlaying && soundEnabled ? `${(h * ((wordIdx % 3) + 1)) / 3}%` : "15%",
                opacity: 0.7 + (i % 3) * 0.1,
              }}
            />
          ))}
        </div>

        {/* Bottom Timeline Controls & Scrubber Rail */}
        <div className="absolute bottom-3 inset-x-4 bg-black/60 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 z-20">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-6 h-6 rounded-full bg-white text-ink flex items-center justify-center font-bold text-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title={isPlaying ? "Pause preview" : "Play preview"}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <span className="font-mono text-[10px] text-sand-200">{timecode}</span>
            </div>

            <span className="font-mono text-[9px] text-sand-400/90 tracking-wider">
              {spec.name} · 1080×1920
            </span>
          </div>

          {/* Interactive Word Scrub Rail */}
          <div className="flex gap-1 pt-0.5">
            {DEMO_WORDS.map((w, i) => (
              <button
                key={i}
                onClick={() => {
                  setWordIdx(i);
                  setIsPlaying(false);
                }}
                title={`Jump to "${w}"`}
                className="group relative flex-1 py-1 cursor-pointer"
              >
                <div
                  className="h-1 rounded-full transition-all duration-300 group-hover:h-1.5"
                  style={{
                    backgroundColor:
                      i === wordIdx
                        ? scene.lightAccent
                        : i < wordIdx
                        ? "#DCC8A4"
                        : "rgba(255,255,255,0.18)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template Dots Selector Below Frame */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-2">
          {HERO_CYCLE.map((id, i) => {
            const specItem = SPECIMENS.find((s) => s.id === id);
            return (
              <button
                key={id}
                aria-label={`Show ${specItem?.name}`}
                onClick={() => setTemplateIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === templateIdx ? "w-7 bg-sand-600" : "w-2 bg-sand-300 hover:bg-sand-400"
                }`}
              />
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-sand-600">
          Template: <strong className="text-ink font-semibold">{spec.name}</strong>
        </span>
      </div>
    </div>
  );
}
