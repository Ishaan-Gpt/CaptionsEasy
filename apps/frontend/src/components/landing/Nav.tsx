"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Menu, X, Play } from "lucide-react";

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFEB]/90 backdrop-blur-md border-b-2 border-[#1A1A1A] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo with Dual Font Pairing */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#1A1A1A] text-[#FFFFEB] rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center font-styled text-2xl font-bold group-hover:rotate-6 transition-transform shadow-[3px_3px_0px_0px_#FFA946]">
              C
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-[#1A1A1A] flex items-center gap-1">
                <span className="font-styled font-extrabold text-[#1A1A1A]">Captions</span>
                <span className="font-normal font-light italic text-[#1A1A1A] bg-[#F0D7FF] px-1.5 py-0.5 rounded border border-[#1A1A1A]">Easy</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-normal font-semibold text-[#1A1A1A] text-sm">
            <a
              href="#features"
              className="hover:text-[#FFA946] transition-colors hover:underline decoration-2 decoration-[#34D399] underline-offset-4"
            >
              Features
            </a>
            <a
              href="#studio"
              className="hover:text-[#FFA946] transition-colors hover:underline decoration-2 decoration-[#F0D7FF] underline-offset-4"
            >
              Live Demo
            </a>
            <a
              href="#workflow"
              className="hover:text-[#FFA946] transition-colors hover:underline decoration-2 decoration-[#34D399] underline-offset-4"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="hover:text-[#FFA946] transition-colors hover:underline decoration-2 decoration-[#FFA946] underline-offset-4"
            >
              Pricing
            </a>
          </nav>

          {/* Action CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="font-normal font-bold text-sm px-5 py-2.5 rounded-lg border-2 border-[#1A1A1A] bg-[#F0D7FF] text-[#1A1A1A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#1A1A1A] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="font-normal font-bold text-sm px-5 py-2.5 rounded-lg border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#34D399] transition-all flex items-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-[#FFA946] group-hover:rotate-12 transition-transform" />
              <span>Create Free</span>
              <ArrowRight className="w-4 h-4 text-[#34D399] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border-2 border-[#1A1A1A] bg-[#F0D7FF] text-[#1A1A1A]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#1A1A1A] bg-[#FFFFEB] px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-3 font-normal font-bold text-[#1A1A1A]">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F0D7FF]"
            >
              Features
            </a>
            <a
              href="#studio"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F0D7FF]"
            >
              Live Demo
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F0D7FF]"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F0D7FF]"
            >
              Pricing
            </a>
          </nav>
          <div className="pt-4 border-t-2 border-[#E4E4D0] flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full text-center font-normal font-bold py-3 rounded-lg border-2 border-[#1A1A1A] bg-[#F0D7FF]"
            >
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="w-full text-center font-normal font-bold py-3 rounded-lg border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#FFA946]" />
              <span>Create Free</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
