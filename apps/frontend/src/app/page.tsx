"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  
  // Custom states for interactive customization preview section
  const [font, setFont] = useState("Montserrat");
  const [size, setSize] = useState(48);
  const [weight, setWeight] = useState("900");
  const [color, setColor] = useState("#FFFFFF");
  const [highlightColor, setHighlightColor] = useState("#00F5C4");
  const [shadow, setShadow] = useState(0);
  const [outline, setOutline] = useState(1);

  // State to simulate a live words playback for the canvas showcase
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const demoWords = [
    { text: "Building", start: 0, end: 400 },
    { text: "highly", start: 400, end: 800 },
    { text: "aesthetic", start: 800, end: 1300 },
    { text: "captioned", start: 1300, end: 1700 },
    { text: "videos", start: 1700, end: 2100 },
    { text: "instantly.", start: 2100, end: 2800 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIdx((prev) => (prev + 1) % demoWords.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white overflow-x-hidden selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      
      {/* 50vw Centered Sticky Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90vw] md:w-[50vw] h-12 bg-[#111317]/85 border border-[#23272F] rounded-full z-50 flex items-center justify-between px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00F5C4]" />
          <span className="font-primary font-black uppercase text-xs tracking-widest text-white">
            CAPITIONS<span className="text-[#00F5C4] font-accent italic lowercase text-sm font-light">easy</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-white">
          <a href="#symphony" className="hover:text-[#00F5C4] transition-colors">Symphony</a>
          <a href="#canvas" className="hover:text-[#00F5C4] transition-colors">Canvas</a>
          <a href="#engine" className="hover:text-[#00F5C4] transition-colors">Engine</a>
          <a href="#studio" className="hover:text-[#00F5C4] transition-colors">Studio</a>
        </div>
        <button 
          onClick={handleLaunch}
          className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[9px] tracking-wider px-4 py-1.5 rounded-full hover:bg-[#00C2A0] transition-colors cursor-pointer"
        >
          Studio
        </button>
      </nav>

      {/* SECTION 1: HERO (Cinematic Entrance) - Min 100vh */}
      <header className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20 border-b border-[#23272F]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00F5C4]/5 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="max-w-4xl space-y-6 z-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 border border-[#23272F] bg-[#111317] rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F5C4] animate-pulse" />
            Deterministic ASS Caption Engine
          </div>
          <h1 className="text-4xl md:text-7xl font-primary font-black uppercase tracking-tight leading-none text-white">
            Make your subtitles <br />
            <span className="text-[#00F5C4] font-accent italic lowercase font-light text-5xl md:text-8xl">symphonic</span> & styled
          </h1>
          <p className="text-xs md:text-sm font-primary text-white max-w-xl mx-auto leading-relaxed uppercase tracking-wider">
            Re-architecting short-form content. Granular rendering pipeline with pixel-perfect layouts directly inside your web browser.
          </p>
          <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={handleLaunch}
              className="w-full sm:w-auto bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider px-8 py-3.5 rounded-none hover:bg-[#00C2A0] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              Get Started
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
            <a
              href="#symphony"
              className="w-full sm:w-auto border border-[#23272F] bg-[#111317] text-white font-primary font-black uppercase text-[10px] tracking-wider px-8 py-3.5 rounded-none hover:border-[#00F5C4] transition-colors flex items-center justify-center gap-2"
            >
              Explore Pipeline
            </a>
          </div>
        </div>
      </header>

      {/* SECTION 2: THE SPEECH SYMPHONY (Vocal Analysis) - Min 100vh */}
      <section id="symphony" className="min-h-screen py-32 px-6 flex flex-col justify-center border-b border-[#23272F] relative bg-[#0C0D10]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">01 // Transcription</span>
            <h2 className="text-3xl md:text-5xl font-primary font-black uppercase tracking-tight text-white">
              Vocal frequencies <br />
              <span className="text-[#00F5C4] font-accent italic lowercase font-light text-4xl md:text-6xl">mapped in milliseconds</span>
            </h2>
            <p className="text-xs text-white leading-relaxed uppercase tracking-wider">
              No generic speech recognition slop. Our backend dissects raw audio streams using neural transcribers, converting spoken syllables into clean arrays of timestamps. Every word is anchored dynamically to its millisecond mark.
            </p>
            <div className="pt-4 grid grid-cols-2 gap-6 border-t border-[#23272F]">
              <div>
                <span className="block text-xl font-black text-[#00F5C4] font-mono">99.4%</span>
                <span className="text-[9px] uppercase tracking-wider text-white">Transcription accuracy</span>
              </div>
              <div>
                <span className="block text-xl font-black text-[#00F5C4] font-mono">&lt; 12s</span>
                <span className="text-[9px] uppercase tracking-wider text-white">Processing timeline</span>
              </div>
            </div>
          </div>
          
          <div className="dense-panel p-8 space-y-6 border-[#23272F]">
            <span className="text-[9px] font-bold uppercase text-white tracking-wider">Audio Spectrogram Stream</span>
            <div className="h-48 flex items-end justify-between gap-1 bg-[#0A0B0D] p-4 border border-[#23272F]">
              {Array.from({ length: 28 }).map((_, idx) => {
                const height = 15 + Math.sin(idx * 0.4) * 45 + (idx % 2 === 0 ? 30 : 0);
                return (
                  <div
                    key={idx}
                    className="w-full bg-[#23272F] hover:bg-[#00F5C4] transition-colors"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-white">
              <span>20Hz</span>
              <span className="text-[#00F5C4]">VOCAL FREQUENCIES ACTIVE</span>
              <span>20kHz</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE KALAKAR CANVAS (Templates Demonstration) - Min 100vh */}
      <section id="canvas" className="min-h-screen py-32 px-6 flex flex-col justify-center border-b border-[#23272F] bg-[#0A0B0D]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Simulated template preview display */}
          <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto bg-[#111317] border border-[#23272F] p-4 flex flex-col justify-center items-center overflow-hidden">
            <div className="absolute inset-0 bg-[#0A0B0D]/80 opacity-20 bg-[radial-gradient(#23272F_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Live Subtitle Template Preview Mockup */}
            <div className="z-10 text-center">
              <span className="text-[10px] text-white uppercase block tracking-widest mb-1 font-mono">Template: Staggered</span>
              <div className="space-y-1 mt-6">
                <div className="text-[11px] text-white tracking-wide">
                  {demoWords.slice(0, 2).map((w, idx) => (
                    <span key={idx} className={idx <= activeWordIdx ? "opacity-100" : "opacity-0"}>{w.text} </span>
                  ))}
                </div>
                <div className="text-2xl font-black uppercase text-[#00F5C4] tracking-tight">
                  {activeWordIdx === 2 && demoWords[2].text}
                  {activeWordIdx === 3 && demoWords[3].text}
                  {activeWordIdx < 2 && "Aesthetic"}
                  {activeWordIdx > 3 && "Captioning"}
                </div>
                <div className="text-[11px] text-white tracking-wide">
                  {demoWords.slice(4).map((w, idx) => (
                    <span key={idx} className={idx + 4 <= activeWordIdx ? "opacity-100" : "opacity-0"}>{w.text} </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Overlay indicators */}
            <div className="absolute bottom-4 inset-x-4 flex justify-between text-[8px] font-bold text-white font-mono">
              <span>PREVIEW CHANNEL</span>
              <span className="text-[#00F5C4]">LIVE OVERLAY</span>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">02 // Typography Layouts</span>
            <h2 className="text-3xl md:text-5xl font-primary font-black uppercase tracking-tight text-white">
              Layouts designed for <br />
              <span className="text-[#00F5C4] font-accent italic lowercase font-light text-4xl md:text-6xl">maximum retention</span>
            </h2>
            <p className="text-xs text-white leading-relaxed uppercase tracking-wider">
              We recreate backend layouts dynamically in your dashboard. Test staggered 3-line configurations, clean documentary baselines, or modern high-contrast formats. Every template is engineered to draw eyes to the screen.
            </p>
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 p-3 border border-[#23272F] bg-[#111317]">
                <div className="w-2 h-2 rounded-full bg-[#00F5C4]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Staggered 3-Line Layout</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[#23272F] bg-[#111317]">
                <div className="w-2 h-2 rounded-full bg-[#00F5C4]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Karaoke Highlight Format</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[#23272F] bg-[#111317]">
                <div className="w-2 h-2 rounded-full bg-[#00F5C4]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Word by Word Pop Subtitles</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: THE RENDER ENGINE (Storytelling) - Min 100vh */}
      <section id="engine" className="min-h-screen py-32 px-6 flex flex-col justify-center border-b border-[#23272F] bg-[#0C0D10]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">03 // Rendering Pipeline</span>
          <h2 className="text-3xl md:text-6xl font-primary font-black uppercase tracking-tight text-white">
            Deterministic <span className="text-[#00F5C4] font-accent italic lowercase font-light text-4xl md:text-7xl">ASS + FFmpeg</span> compiler
          </h2>
          <p className="text-xs md:text-sm text-white leading-relaxed uppercase tracking-widest max-w-2xl mx-auto">
            Once you customize in the studio, our renderer compiles subtitle formatting instructions directly into a structured ASS schema. A backend pipeline merges it using custom FFmpeg filtergraphs for high-fidelity native exports.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
            <div className="dense-panel p-6 text-center border-[#23272F]">
              <span className="block text-2xl font-black text-[#00F5C4] font-mono">1080p</span>
              <span className="text-[9px] uppercase tracking-wider text-white block mt-1">Output Resolution</span>
            </div>
            <div className="dense-panel p-6 text-center border-[#23272F]">
              <span className="block text-2xl font-black text-[#00F5C4] font-mono">60 FPS</span>
              <span className="text-[9px] uppercase tracking-wider text-white block mt-1">Export Performance</span>
            </div>
            <div className="dense-panel p-6 text-center border-[#23272F]">
              <span className="block text-2xl font-black text-[#00F5C4] font-mono">Direct ASS</span>
              <span className="text-[9px] uppercase tracking-wider text-white block mt-1">Filtergraph Injection</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: THE CREATOR STUDIO (Customization Show) - Min 100vh */}
      <section id="studio" className="min-h-screen py-32 px-6 flex flex-col justify-center border-b border-[#23272F] bg-[#0A0B0D]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">04 // Granular Controls</span>
            <h2 className="text-3xl md:text-5xl font-primary font-black uppercase tracking-tight text-white">
              Complete style <br />
              <span className="text-[#00F5C4] font-accent italic lowercase font-light text-4xl md:text-6xl">customisation</span>
            </h2>
            <p className="text-xs text-white leading-relaxed uppercase tracking-wider">
              Control the font weight, sizes, custom stroke thickness, drop shadows, color gradients, and line spacing. Define padding offsets and background boxes reactively. What you adjust is exactly what renders.
            </p>
            
            {/* Interactive customize mockup */}
            <div className="dense-panel p-6 space-y-4 border-[#23272F] bg-[#111317]/50">
              <span className="text-[9px] font-bold uppercase text-white tracking-wider block">Live Editor Sandbox</span>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                    <span>Subtitle Size</span>
                    <span>{size}px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="80"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                    <span>Outline Stroke</span>
                    <span>{outline}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={outline}
                    onChange={(e) => setOutline(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Result preview */}
          <div className="dense-panel p-8 aspect-video w-full flex flex-col justify-center items-center border-[#23272F] relative overflow-hidden bg-[#111317]">
            <div className="absolute inset-0 bg-[#0A0B0D]/5 pointer-events-none" />
            <div className="text-center select-none">
              <span 
                className="uppercase tracking-tight inline-block"
                style={{
                  fontFamily: `${font}, sans-serif`,
                  fontSize: `${size * 0.8}px`,
                  fontWeight: weight,
                  color: highlightColor,
                  textShadow: outline > 0 ? `${outline}px ${outline}px 0px #000` : "none",
                  WebkitTextStroke: outline > 0 ? `${outline * 0.5}px #000` : "none",
                }}
              >
                CUSTOMIZED
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-[8px] font-bold uppercase text-white font-mono">
              OUTPUT PREVIEW MODEL
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: TRUST / STORIES (Testimonials) - Min 100vh */}
      <section className="min-h-screen py-32 px-6 flex flex-col justify-center border-b border-[#23272F] bg-[#0C0D10]">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">05 // User Stories</span>
            <h2 className="text-3xl md:text-5xl font-primary font-black uppercase tracking-tight text-white">
              Creator opinions
            </h2>
          </div>
          
          <div className="space-y-12">
            <div className="border-l-2 border-[#00F5C4] pl-6 space-y-2">
              <p className="text-base md:text-lg font-accent italic text-white leading-relaxed">
                "The rendering precision is insane. I customize template layouts in a few clicks, and exports match the screen exactly. No AI rendering slop."
              </p>
              <span className="block text-[9px] uppercase tracking-wider text-white font-primary font-bold">
                Alex M. // Short-form content lead
              </span>
            </div>

            <div className="border-l-2 border-[#00F5C4] pl-6 space-y-2">
              <p className="text-base md:text-lg font-accent italic text-white leading-relaxed">
                "We dropped our manual subtitle workflow entirely. CaptionsEasy lets us customize style outlines, shadows, and staggered layouts with precise timing."
              </p>
              <span className="block text-[9px] uppercase tracking-wider text-white font-primary font-bold">
                Sarah K. // Content Studio Manager
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: THE PORTAL (CTA Transition) - Min 100vh */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative bg-[#0A0B0D]">
        <div className="max-w-3xl space-y-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5C4]">06 // The Portal</span>
          <h2 className="text-4xl md:text-7xl font-primary font-black uppercase tracking-tight text-white leading-none">
            Launch the <span className="text-[#00F5C4] font-accent italic lowercase font-light text-5xl md:text-8xl">studio</span> workspace
          </h2>
          <p className="text-xs text-white max-w-md mx-auto uppercase tracking-wider leading-relaxed">
            Create new editing projects, upload MP4 clips, and adjust templates. Build cinematic shorts in seconds.
          </p>
          <div className="pt-6">
            <button
              onClick={handleLaunch}
              className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider px-10 py-4.5 rounded-none hover:bg-[#00C2A0] transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              Enter Studio Portal
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* BIG STYLED FOOTER */}
      <footer className="border-t border-[#23272F] bg-[#0A0B0D] py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00F5C4]" />
              <span className="font-primary font-black uppercase text-xs tracking-widest text-white">
                CAPITIONS<span className="text-[#00F5C4] font-accent italic lowercase text-xs font-light">easy</span>
              </span>
            </div>
            <p className="text-[10px] text-white uppercase tracking-wider leading-relaxed">
              Deterministic typography rendering pipelines for the next generation of social media creators.
            </p>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase text-white tracking-widest mb-4">Navigations</span>
            <div className="flex flex-col gap-2.5 text-[9px] font-bold uppercase tracking-wider text-white">
              <a href="#symphony" className="hover:text-[#00F5C4] transition-colors">Symphony</a>
              <a href="#canvas" className="hover:text-[#00F5C4] transition-colors">Canvas</a>
              <a href="#engine" className="hover:text-[#00F5C4] transition-colors">Engine</a>
              <a href="#studio" className="hover:text-[#00F5C4] transition-colors">Studio</a>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase text-white tracking-widest mb-4">Templates</span>
            <div className="flex flex-col gap-2.5 text-[9px] font-bold uppercase tracking-wider text-white">
              <span className="hover:text-[#00F5C4] cursor-pointer">Staggered 3-Line</span>
              <span className="hover:text-[#00F5C4] cursor-pointer">Word by Word</span>
              <span className="hover:text-[#00F5C4] cursor-pointer">Sentence Highlight</span>
              <span className="hover:text-[#00F5C4] cursor-pointer">Sentence Clean</span>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase text-white tracking-widest mb-4">Portal access</span>
            <button
              onClick={handleLaunch}
              className="border border-[#23272F] bg-[#111317] text-[#00F5C4] font-primary font-black uppercase text-[9px] tracking-wider px-5 py-2.5 rounded-none hover:border-[#00F5C4] transition-colors cursor-pointer w-full text-center"
            >
              Sign In to Dashboard
            </button>
          </div>

        </div>

        <div className="max-w-6xl mx-auto border-t border-[#23272F] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-white">
          <span>&copy; 2026 CaptionsEasy. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-[#00F5C4] cursor-pointer">Terms of Use</span>
            <span className="hover:text-[#00F5C4] cursor-pointer">Privacy Charter</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
