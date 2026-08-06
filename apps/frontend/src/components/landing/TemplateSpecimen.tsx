"use client";

import React from "react";
import {
  anton,
  outfit,
  playfair,
  baloo,
  kaushan,
  fredoka,
  caveat,
  cinzel,
  lilita,
  spaceMono,
  montserrat,
} from "./fonts";

/**
 * Live type specimens of the actual caption templates the render engine
 * ships (mirrors src/config/captionTemplates.ts). Each specimen animates
 * the "active word" exactly the way the export does: pop, recolor, and a
 * heavier typographic voice on the hero word.
 */

export interface SpecimenDef {
  id: string;
  name: string;
  blurb: string;
  render: (words: string[], activeIdx: number) => React.ReactNode;
}

const pop = (isActive: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
  display: "inline-block",
  transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1), color 0.28s ease, opacity 0.28s ease, text-shadow 0.28s ease",
  transform: isActive ? "scale(1.12)" : "scale(1)",
  ...extra,
});

export const SPECIMENS: SpecimenDef[] = [
  {
    id: "hormozi_viral",
    name: "Hormozi Viral",
    blurb: "Bold Anton font, electric yellow active word with black outline.",
    render: (words, activeIdx) => (
      <span
        className={`${anton.className} flex flex-wrap justify-center gap-x-[0.35em] gap-y-1 uppercase text-white`}
        style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", lineHeight: 1.25 }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              style={pop(active, {
                color: active ? "#FFE600" : "#FFFFFF",
                fontSize: active ? "1.3em" : "1em",
                WebkitTextStroke: "1px rgba(0,0,0,0.9)",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              })}
            >
              {w}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    id: "mrbeast_punch",
    name: "MrBeast Punch",
    blurb: "High-energy single active word with 3D drop shadow.",
    render: (words, activeIdx) => (
      <span
        key={activeIdx}
        className={`${lilita.className} uppercase text-white animate-caption-pop inline-block`}
        style={{
          fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)",
          color: "#00F5FF",
          WebkitTextStroke: "1.5px rgba(0,0,0,0.9)",
          textShadow: "3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 12px rgba(0,245,255,0.4)",
        }}
      >
        {words[activeIdx]}
      </span>
    ),
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    blurb: "Monospace code theme with glowing magenta hero word stack.",
    render: (words, activeIdx) => (
      <span
        className={`${spaceMono.className} flex flex-wrap justify-center items-center gap-x-[0.4em] gap-y-1 text-white/90 font-bold`}
        style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)" }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              style={pop(active, {
                color: active ? "#FF007F" : "#E0F7FA",
                fontSize: active ? "1.35em" : "1em",
                textShadow: active ? "0 0 20px #FF007F, 0 0 10px #FF007F" : "none",
              })}
            >
              {w}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    id: "tiktok_pop",
    name: "TikTok Pop",
    blurb: "Soft pill background highlight with vibrant lime accent.",
    render: (words, activeIdx) => (
      <span
        className={`${fredoka.className} flex flex-wrap justify-center items-center gap-x-[0.35em] gap-y-1 font-bold`}
        style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)" }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              style={pop(active, {
                color: active ? "#76FF03" : "#FFFFFF",
                background: active ? "rgba(0,0,0,0.75)" : "transparent",
                padding: active ? "2px 10px" : "0",
                borderRadius: active ? "999px" : "0",
              })}
            >
              {w}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    id: "minimal_luxe",
    name: "Minimal Luxe",
    blurb: "Cinzel serif typography with champagne gold highlight accents.",
    render: (words) => (
      <span
        className={`${cinzel.className} text-[#F8F5EE] uppercase text-center font-semibold`}
        style={{
          fontSize: "clamp(0.85rem, 1.4vw, 1.1rem)",
          letterSpacing: "0.12em",
          lineHeight: 1.6,
        }}
      >
        {words.map((w, i) => (
          <span key={w + i} style={{ color: i === 2 ? "#E5C158" : "#F8F5EE" }}>
            {w}{" "}
          </span>
        ))}
      </span>
    ),
  },
  {
    id: "vintage_cinematic",
    name: "Vintage Cinematic",
    blurb: "Playfair Display base under a giant glowing italic keyword.",
    render: (words, activeIdx) => (
      <span className="flex flex-col items-center gap-1">
        <span
          className={`${outfit.className} text-white/85 font-semibold tracking-wide`}
          style={{ fontSize: "clamp(0.8rem, 1.3vw, 1.05rem)" }}
        >
          {words.filter((_, i) => i !== activeIdx).join(" ")}
        </span>
        <span
          key={activeIdx}
          className={`${playfair.className} italic animate-caption-pop`}
          style={{
            fontSize: "clamp(1.5rem, 2.8vw, 2.3rem)",
            color: "#8CFF3E",
            textShadow: "0 0 28px rgba(140,255,62,0.55)",
            fontWeight: 800,
          }}
        >
          {words[activeIdx]}
        </span>
      </span>
    ),
  },
  {
    id: "bold_impact",
    name: "Bold Impact",
    blurb: "Montserrat heavy font with blazing neon orange pop accent.",
    render: (words, activeIdx) => (
      <span
        className={`${montserrat.className} flex flex-wrap justify-center gap-x-[0.35em] gap-y-1 font-black uppercase text-white`}
        style={{ fontSize: "clamp(1rem, 1.7vw, 1.35rem)", lineHeight: 1.2 }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              style={pop(active, {
                color: active ? "#FF5722" : "#FFFFFF",
                fontSize: active ? "1.35em" : "1em",
                textShadow: active ? "0 4px 14px rgba(255,87,34,0.6)" : "0 2px 4px rgba(0,0,0,0.5)",
              })}
            >
              {w}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    id: "staggered_splash",
    name: "Staggered Splash",
    blurb: "Multi-line staggered layout; the active word snaps to neon lime.",
    render: (words, activeIdx) => {
      const lines = [words.slice(0, 2), words.slice(2, 4), words.slice(4)];
      let i = -1;
      return (
        <span className={`${outfit.className} flex flex-col gap-1 uppercase font-bold text-white leading-none`}>
          {lines.map((line, li) => (
            <span
              key={li}
              className="flex gap-[0.4em] justify-center"
              style={{
                fontSize: "clamp(0.95rem, 1.6vw, 1.3rem)",
                transform: `translateX(${li === 0 ? "-8%" : li === 1 ? "6%" : "-3%"})`,
              }}
            >
              {line.map((w) => {
                i += 1;
                const active = i === activeIdx;
                return (
                  <span
                    key={w + i}
                    className={active ? anton.className : undefined}
                    style={pop(active, {
                      color: active ? "#C5FF00" : "#FFFFFF",
                      fontSize: active ? "1.28em" : "1em",
                    })}
                  >
                    {w}
                  </span>
                );
              })}
            </span>
          ))}
        </span>
      );
    },
  },
];

export const DEMO_WORDS = ["Make", "every", "single", "word", "earn", "attention"];

/** Cycles the active word while the element is on screen. */
export function useWordLoop(total: number, running: boolean, ms = 520) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), ms);
    return () => clearInterval(t);
  }, [running, total, ms]);
  return idx;
}
