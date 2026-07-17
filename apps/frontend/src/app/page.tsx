"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Contrast from "@/components/landing/Contrast";
import Pipeline from "@/components/landing/Pipeline";
import TemplateGallery from "@/components/landing/TemplateGallery";
import Control from "@/components/landing/Control";
import Closing from "@/components/landing/Closing";

export default function LandingPage() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(2, -10 * t),
      anchors: true,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="bg-dune-white text-ink">
      <Nav />
      <Hero />
      <Contrast />
      <Pipeline />
      <TemplateGallery />
      <Control />
      <Closing />
    </main>
  );
}
