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
    id: "word_by_word",
    name: "Word by Word",
    blurb: "One bold uppercase word holds the whole frame.",
    render: (words, activeIdx) => (
      <span
        key={activeIdx}
        className="font-sans font-black uppercase text-white animate-caption-pop"
        style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "0.02em" }}
      >
        {words[activeIdx]}
      </span>
    ),
  },
  {
    id: "staggered_3line",
    name: "Staggered 3-Line",
    blurb: "Three offset lines; the live word snaps to mint.",
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
                      color: active ? "#00F5C4" : "#FFFFFF",
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
  {
    id: "sentence_highlight",
    name: "Sentence Highlight",
    blurb: "The full line stays; the current word jumps a weight class.",
    render: (words, activeIdx) => (
      <span
        className={`${outfit.className} flex flex-wrap justify-center gap-x-[0.35em] gap-y-1 font-bold uppercase text-white`}
        style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.3rem)", lineHeight: 1.25 }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              className={active ? anton.className : undefined}
              style={pop(active, {
                color: active ? "#00F5C4" : "#FFFFFF",
                fontSize: active ? "1.35em" : "1em",
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
    id: "glow_stack",
    name: "Glow Stack",
    blurb: "Rounded body text with a glowing splash hero word.",
    render: (words, activeIdx) => (
      <span
        className={`${baloo.className} flex flex-wrap justify-center items-center gap-x-[0.3em] gap-y-1 text-white`}
        style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)", lineHeight: 1.3 }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={w + i}
              className={active ? anton.className : undefined}
              style={pop(active, {
                color: active ? "#4FA8FF" : "#FFFFFF",
                fontSize: active ? "1.8em" : "1em",
                margin: active ? "0 0.18em" : "0",
                textTransform: active ? "uppercase" : "none",
                textShadow: active ? "0 0 24px rgba(79,168,255,0.65)" : "0 2px 0 rgba(0,0,0,0.45)",
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
    id: "cartoon_stack",
    name: "Cartoon Stack",
    blurb: "Hand-written top line, chunky outlined punch word.",
    render: (words, activeIdx) => (
      <span className="flex flex-col items-center gap-1">
        <span
          className={`${caveat.className} text-white/90`}
          style={{ fontSize: "clamp(1rem, 1.7vw, 1.4rem)" }}
        >
          {words.slice(0, 3).join(" ")}
        </span>
        <span
          className={`${fredoka.className} flex flex-wrap justify-center gap-x-[0.3em] gap-y-1 uppercase`}
          style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.25rem)" }}
        >
          {words.slice(3).map((w, i) => {
            const idx = i + 3;
            const active = idx === activeIdx;
            return (
              <span
                key={w + idx}
                style={pop(active, {
                  color: active ? "#EDE0A6" : "#FFFFFF",
                  fontSize: active ? "1.4em" : "1em",
                  WebkitTextStroke: "1px rgba(0,0,0,0.85)",
                  textShadow: "0 3px 0 rgba(0,0,0,0.6)",
                })}
              >
                {w}
              </span>
            );
          })}
        </span>
      </span>
    ),
  },
  {
    id: "serif_pop",
    name: "Serif Pop",
    blurb: "Editorial serif with a brush-script hero word and a pop dot.",
    render: (words, activeIdx) => (
      <span
        className={`${playfair.className} flex flex-wrap justify-center items-baseline gap-x-[0.3em] gap-y-1 text-white font-extrabold`}
        style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.3rem)", lineHeight: 1.35 }}
      >
        {words.map((w, i) => {
          const active = i === activeIdx;
          return (
            <span key={w + i} className="relative inline-block">
              <span
                className={active ? kaushan.className : undefined}
                style={pop(active, {
                  color: active ? "#FFEE00" : "#FFFFFF",
                  fontSize: active ? "1.6em" : "1em",
                  margin: active ? "0 0.22em" : "0",
                  fontWeight: active ? 400 : 800,
                })}
              >
                {w}
              </span>
              {active && (
                <span
                  className="absolute -top-1 -right-2 w-[0.32em] h-[0.32em] rounded-full"
                  style={{ backgroundColor: "#FFEE00" }}
                />
              )}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    id: "cinematic_emerald",
    name: "Cinematic Emerald",
    blurb: "Quiet Outfit base under a giant glowing italic keyword.",
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
    id: "sentence_clean",
    name: "Sentence Clean",
    blurb: "Uniform engraved capitals. No hero word, by design.",
    render: (words) => (
      <span
        className={`${cinzel.className} text-white uppercase text-center`}
        style={{
          fontSize: "clamp(0.85rem, 1.4vw, 1.1rem)",
          letterSpacing: "0.12em",
          lineHeight: 1.6,
        }}
      >
        {words.join(" ")}
      </span>
    ),
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
