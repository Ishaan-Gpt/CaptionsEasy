"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { Loader } from "@/components/home/Loader";
import { ensureGsap, prefersReducedMotion } from "@/components/home/gsap";
import { ClosingCta, Faq, Features, Footer, Hero, HowItWorks, Looks, Marquee, Nav, Pricing, Privacy } from "@/components/home/Sections";

export default function LandingPage() {
  const root = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const onLoaderDone = useCallback(() => setReady(true), []);

  // smooth scroll, driven by GSAP's ticker so ScrollTrigger and Lenis agree on every frame
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(2, -10 * t), anchors: { offset: -80 } });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // choreography: starts once the intro curtain has lifted
  useEffect(() => {
    if (!ready || !root.current) return;
    if (prefersReducedMotion()) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const ctx = gsap.context(() => {
      // hero entrance
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from("[data-hero=eyebrow]", { y: 16, opacity: 0, duration: 0.8 })
        .from("[data-hero=word]", { yPercent: 110, duration: 1.1, stagger: 0.08 }, 0.05)
        .from("[data-hero=sub]", { y: 18, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.35)
        .from("[data-hero=cta]", { y: 18, opacity: 0, duration: 0.9 }, 0.5)
        .from("[data-hero=phone]", { y: 60, rotate: 4, opacity: 0, duration: 1.4 }, 0.2)
        .from("[data-float]", { scale: 0.6, opacity: 0, duration: 0.8, stagger: 0.15, ease: "back.out(2)" }, 0.9);

      gsap.to("[data-float]", { y: -10, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.6, delay: 1.8 });

      // parallax blobs + the phone tilts back as you leave the hero
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.to(el, { yPercent: -60 * Number(el.dataset.parallax ?? 0.3), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
      gsap.to("[data-hero=phone]", { y: -40, rotate: -2, ease: "none", scrollTrigger: { trigger: "[data-hero=phone]", start: "top 30%", end: "bottom top", scrub: true } });

      // nav hides on scroll down, returns on scroll up
      const nav = document.querySelector<HTMLElement>("[data-nav]");
      if (nav) {
        ScrollTrigger.create({
          start: 120,
          end: "max",
          onUpdate: (self) => gsap.to(nav, { yPercent: self.direction === 1 ? -130 : 0, duration: 0.45, ease: "power3.out", overwrite: true }),
          onLeaveBack: () => gsap.to(nav, { yPercent: 0, duration: 0.3, overwrite: true }),
        });
      }

      // generic section reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
      });

      // how it works: the progress line draws with your scroll, steps pop in along it
      gsap.to("[data-progress]", { scaleX: 1, ease: "none", scrollTrigger: { trigger: "#how", start: "top 60%", end: "bottom 70%", scrub: 0.6 } });
      gsap.from("[data-step]", { y: 70, opacity: 0, duration: 1, stagger: 0.18, ease: "expo.out", scrollTrigger: { trigger: "#how", start: "top 65%" } });

      // looks: cards rise in a wave
      gsap.from("[data-look]", { y: 90, opacity: 0, rotate: 2, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: "#looks", start: "top 60%" } });

      gsap.from("[data-feature]", { y: 40, opacity: 0, scale: 0.97, duration: 0.9, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: "#features", start: "top 65%" } });
      gsap.from("[data-tier]", { y: 60, opacity: 0, duration: 1, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: "#pricing", start: "top 70%" } });
      gsap.from("[data-faq]", { y: 24, opacity: 0, duration: 0.7, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: "#faq", start: "top 75%" } });
    }, root);
    // previews and fonts change layout after mount; re-measure once they settle
    const t = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => {
      clearTimeout(t);
      ctx.revert();
    };
  }, [ready]);

  return (
    <main ref={root} className="relative min-h-screen overflow-x-clip bg-[#FFFFEB] font-sans text-[#1A1A1A]">
      <Loader onDone={onLoaderDone} />
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Looks />
      <Features />
      <Privacy />
      <Pricing />
      <Faq />
      <ClosingCta />
      <Footer />
    </main>
  );
}
