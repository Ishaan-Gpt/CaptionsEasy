"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SPECIMENS, DEMO_WORDS, useWordLoop } from "@/components/landing/TemplateSpecimen";

/* ————— Shared form primitives for every auth screen ————— */

export function Field({
  label,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-sora text-[12px] font-semibold text-sand-800">
        {label}
      </label>
      <input
        {...props}
        className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-ink placeholder:text-sand-500 outline-none transition-colors focus:border-sand-600 focus:ring-2 focus:ring-sand-200 ${
          error ? "border-red-400" : "border-sand-300"
        }`}
      />
      {error ? (
        <p className="text-[12px] text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-sand-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block font-sora text-[12px] font-semibold text-sand-800">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`w-full rounded-lg border bg-white px-4 py-3 pr-16 text-[14px] text-ink placeholder:text-sand-500 outline-none transition-colors focus:border-sand-600 focus:ring-2 focus:ring-sand-200 ${
            error ? "border-red-400" : "border-sand-300"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-4 font-sora text-[11px] font-semibold text-sand-600 hover:text-ink transition-colors cursor-pointer"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error ? (
        <p className="text-[12px] text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-sand-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      {...props}
      className="w-full rounded-full bg-ink px-6 py-3.5 font-sora text-[13px] font-semibold text-dune-white transition-all hover:bg-sand-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-dune-white/40 border-t-dune-white" />
      )}
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700"
    >
      {children}
    </div>
  );
}

/** Translate raw Supabase error strings into something a creator can act on. */
export function friendlyAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Double-check them, or reset your password below.";
  if (m.includes("email not confirmed"))
    return "Your email isn't verified yet — open the confirmation link we sent you, then sign in.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Sign in instead.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts in a row. Give it a minute, then try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Couldn't reach the sign-in service. Check your connection and try again.";
  return raw;
}

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ————— The shell: form on white, live caption reel on sand-dark ————— */

const REEL = ["serif_pop", "glow_stack", "cinematic_emerald", "staggered_3line"];

function CaptionReel() {
  const [ti, setTi] = useState(0);
  const wordIdx = useWordLoop(DEMO_WORDS.length, true, 540);
  useEffect(() => {
    const t = setInterval(() => setTi((i) => (i + 1) % REEL.length), DEMO_WORDS.length * 540 * 2);
    return () => clearInterval(t);
  }, []);
  const spec = SPECIMENS.find((s) => s.id === REEL[ti])!;

  return (
    <div className="relative h-full flex flex-col justify-between p-10 xl:p-14">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 75% 8%, rgba(178,148,101,0.30) 0%, rgba(32,25,16,0) 55%), radial-gradient(130% 100% at 20% 100%, rgba(78,60,36,0.45) 0%, rgba(32,25,16,0) 60%)",
        }}
      />
      <p className="relative font-mono text-[12px] text-sand-300">
        {spec.name} — one of eight render templates
      </p>
      <div className="relative flex items-center justify-center text-center min-h-[10rem] px-4">
        {spec.render(DEMO_WORDS, wordIdx)}
      </div>
      <p className="relative max-w-[38ch] font-serif text-xl xl:text-2xl leading-snug text-sand-100">
        Sign in, upload a take, and post something that looks like a motion
        designer touched it.
      </p>
    </div>
  );
}

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dune-white grid grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 sm:px-12 py-8">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
          Captions<em className="italic font-medium text-sand-600">Easy</em>
        </Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[400px] mx-auto py-12">
            <h1 className="font-serif text-[2rem] sm:text-[2.4rem] font-semibold leading-[1.1] tracking-[-0.015em] text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-[14px] leading-relaxed text-sand-800">{subtitle}</p>
            )}
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="font-mono text-[11px] text-sand-600">
          © 2026 CaptionsEasy · transcribed, timed, rendered
        </p>
      </div>

      {/* Product side */}
      <div className="hidden lg:block bg-sand-900 relative overflow-hidden">
        <CaptionReel />
      </div>
    </div>
  );
}
