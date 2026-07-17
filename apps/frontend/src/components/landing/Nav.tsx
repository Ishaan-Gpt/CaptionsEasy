"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-dune-white/90 backdrop-blur-md border-b border-sand-200"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
          Captions<em className="italic font-medium text-sand-600">Easy</em>
        </Link>

        <nav className="hidden sm:flex items-center gap-8 font-sora text-[13px] font-medium text-sand-700">
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#templates" className="hover:text-ink transition-colors">Templates</a>
          <a href="#control" className="hover:text-ink transition-colors">The studio</a>
        </nav>

        <Link
          href="/login"
          className="font-sora text-[13px] font-semibold rounded-full bg-ink text-dune-white px-5 py-2.5 hover:bg-sand-800 active:scale-[0.98] transition-all"
        >
          Open the studio
        </Link>
      </div>
    </header>
  );
}
