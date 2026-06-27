import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* radial background glow */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none" />
      <div className="absolute inset-0 bg-glow-radial-bottom pointer-events-none" />
      
      {/* decorative floating graphics */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="w-full max-w-md z-10 space-y-8 animate-fade-in-up">
        {/* Brand header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white tracking-tighter shadow-lg shadow-indigo-600/20">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-150 to-zinc-400 bg-clip-text text-transparent">
              MotionAI
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Intelligent Rendering Engine for Video Creators
          </p>
        </div>

        {/* Content container */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl shadow-zinc-950/40 relative">
          <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          {children}
        </div>
      </div>
    </div>
  );
}
