"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";
import WisprNav from "@/components/landing/WisprNav";
import WisprHero from "@/components/landing/WisprHero";
import WisprLogos from "@/components/landing/WisprLogos";
import WisprSpeed from "@/components/landing/WisprSpeed";
import WisprFeatureTabs from "@/components/landing/WisprFeatureTabs";
import Contrast from "@/components/landing/Contrast";
import Control from "@/components/landing/Control";
import Pipeline from "@/components/landing/Pipeline";
import TemplateGallery from "@/components/landing/TemplateGallery";
import Pricing from "@/components/landing/Pricing";
import WisprLanguages from "@/components/landing/WisprLanguages";
import WisprFAQ from "@/components/landing/WisprFAQ";
import WisprClosingCTA from "@/components/landing/WisprClosingCTA";
import WisprFooter from "@/components/landing/WisprFooter";
import WisprFingerprint from "@/components/landing/WisprFingerprint";

export default function LandingClassicPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
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
    <main className="bg-[#FFFFEB] text-[#1A1A1A] font-sans min-h-screen relative selection:bg-[#FFA946] selection:text-[#1A1A1A]">
      <WisprNav />
      <WisprHero />
      <WisprLogos />
      <WisprSpeed />
      <WisprFeatureTabs />
      <Contrast />
      <Control />
      <Pipeline />
      <TemplateGallery />
      <Pricing />
      <WisprLanguages />
      <WisprFAQ />
      <WisprClosingCTA />
      <WisprFooter />
      <WisprFingerprint />
    </main>
  );
}
