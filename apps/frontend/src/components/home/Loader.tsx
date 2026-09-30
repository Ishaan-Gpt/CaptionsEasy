"use client";

import React, { useEffect, useRef, useState } from "react";
import { ensureGsap, prefersReducedMotion } from "./gsap";

/**
 * Brand intro: the three caption bars grow like a waveform, the wordmark rises letter by letter, then the
 * curtain lifts. Once per browser session; skipped entirely for reduced-motion users.
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("ce_intro") === "1";
      sessionStorage.setItem("ce_intro", "1");
    } catch {
      /* storage blocked: just play it */
    }
    if (seen || prefersReducedMotion() || !root.current) {
      setShow(false);
      onDone();
      return;
    }
    const { gsap } = ensureGsap();
    const el = root.current;
    const tl = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: () => {
        setShow(false);
        onDone();
      },
    });
    tl.from(el.querySelectorAll("[data-bar]"), { scaleY: 0, duration: 0.7, stagger: 0.09, transformOrigin: "50% 100%" })
      .to(el.querySelectorAll("[data-bar]"), { scaleY: 1.35, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.06, ease: "sine.inOut" }, "-=0.2")
      .from(el.querySelectorAll("[data-char]"), { yPercent: 110, duration: 0.7, stagger: 0.028 }, 0.25)
      .from(el.querySelector("[data-tag]"), { opacity: 0, y: 8, duration: 0.5 }, 0.75)
      .to(el.querySelector("[data-inner]"), { opacity: 0, y: -16, duration: 0.45, ease: "power2.in" }, "+=0.25")
      .to(el, { yPercent: -100, duration: 0.85, ease: "expo.inOut" }, "-=0.1");
    return () => {
      tl.kill();
    };
  }, [onDone]);

  if (!show) return null;
  const word = "CaptionsEasy";
  return (
    <div ref={root} className="fixed inset-0 z-[100] grid place-items-center bg-[#FFFFEB]" aria-hidden>
      <div data-inner className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-1.5">
          {["#1A1A1A", "#FFA946", "#34D399"].map((c, i) => (
            <span key={c} data-bar className="block w-2.5 rounded-full" style={{ background: c, height: [28, 46, 36][i] }} />
          ))}
        </div>
        <div className="overflow-hidden px-2 font-styled text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl">
          {word.split("").map((ch, i) => (
            <span key={i} data-char className={`inline-block ${i >= 8 ? "font-normal italic text-[#0F3D2E]" : ""}`}>{ch}</span>
          ))}
        </div>
        <p data-tag className="text-sm text-[#1A1A1A]/60">Captions that move like you talk.</p>
      </div>
    </div>
  );
}
