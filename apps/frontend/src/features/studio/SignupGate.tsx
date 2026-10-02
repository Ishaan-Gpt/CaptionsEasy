"use client";

import React, { useState } from "react";
import { upgradeWithEmail, upgradeWithGoogle } from "@/services/auth/guest";
import { Button } from "./controls";

/**
 * Shown when a guest clicks Export: one step to a free account. The account is linked to the guest's user id,
 * so the project, video and captions they already made stay exactly where they are.
 */
export const SignupGate: React.FC<{ onDone: () => void; onClose: () => void }> = ({ onDone, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const google = async () => {
    setError(null);
    setBusy("google");
    try {
      const back = new URL(window.location.href);
      back.searchParams.set("export", "1"); // reopen the export dialog after Google brings them back
      await upgradeWithGoogle(back.toString());
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Google sign-up didn't start. Try email instead.");
    }
  };

  const withEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use at least 8 characters for the password.");
    setError(null);
    setBusy("email");
    try {
      await upgradeWithEmail(email.trim(), password);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the account. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label="Create your free account" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl border border-st-line bg-st-panel p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        {sent ? (
          <>
            <h2 className="text-lg font-semibold">You&apos;re in. Your video is ready to export.</h2>
            <p className="mt-2 text-sm text-st-muted">We sent a link to <b className="text-st-text">{email}</b>. Confirm it any time to sign in from other devices. Your project is saved to this account.</p>
            <Button tone="primary" className="mt-5 w-full !py-3" onClick={onDone}>Export my video</Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Create a free account to export</h2>
            <p className="mt-1 text-sm text-st-muted">Takes 10 seconds. Everything you&apos;ve made stays exactly as it is.</p>
            <Button tone="primary" className="mt-5 w-full !py-3" disabled={busy !== null} onClick={() => void google()}>
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-st-faint"><span className="h-px flex-1 bg-st-line" />or<span className="h-px flex-1 bg-st-line" /></div>
            <form onSubmit={(e) => void withEmail(e)} className="grid gap-2">
              <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-st-line bg-st-raised px-3 py-2.5 text-sm" />
              <input type="password" autoComplete="new-password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-st-line bg-st-raised px-3 py-2.5 text-sm" />
              <Button type="submit" className="w-full !py-2.5" disabled={busy !== null}>{busy === "email" ? "Creating…" : "Create account with email"}</Button>
            </form>
            {error ? <p role="alert" className="mt-3 rounded-lg border border-st-or/60 bg-st-or/15 px-3 py-2 text-sm text-st-text">{error}</p> : null}
            <p className="mt-4 text-center text-xs text-st-faint">Free. No card. By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.</p>
          </>
        )}
      </div>
    </div>
  );
};
