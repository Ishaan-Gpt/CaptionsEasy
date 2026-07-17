"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { supabase } from "@/services/auth/supabaseClient";
import AuthShell, {
  Field,
  PasswordField,
  SubmitButton,
  ErrorNote,
  friendlyAuthError,
  validEmail,
} from "@/components/auth/AuthShell";

const GoogleMark = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
);

type Mode = "signin" | "signup" | "verify-sent";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [resent, setResent] = useState(false);

  // Redirect if already authenticated; also catches the OAuth return.
  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard");
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!validEmail(email)) errs.email = "Enter a valid email address.";
    if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (mode === "signup" && !name.trim()) errs.name = "Tell us what to call you.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        await authService.register(name.trim(), email, password);
        setMode("verify-sent");
      } else {
        await authService.login(email, password);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(friendlyAuthError(err.message || "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.loginWithGoogle();
      // Redirect happens via Supabase; the listener above covers the return.
    } catch (err: any) {
      setError(friendlyAuthError(err.message || "Google sign-in failed."));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    setError(null);
    try {
      const { error: rErr } = await supabase.auth.resend({ type: "signup", email });
      if (rErr) throw new Error(rErr.message);
      setResent(true);
    } catch (err: any) {
      setError(friendlyAuthError(err.message || "Couldn't resend the email."));
    }
  };

  if (mode === "verify-sent") {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={
          <>
            We sent a confirmation link to <strong className="text-ink">{email}</strong>.
            Open it to activate your account, then come back and sign in.
          </>
        }
      >
        <div className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}
          {resent && (
            <div className="rounded-lg border border-sand-300 bg-sand-50 px-4 py-3 text-[13px] text-sand-800">
              Sent again — give it a minute and check spam too.
            </div>
          )}
          <button
            onClick={handleResend}
            className="w-full rounded-full border border-sand-400 px-6 py-3 font-sora text-[13px] font-semibold text-sand-800 hover:border-ink hover:text-ink transition-colors cursor-pointer"
          >
            Resend the email
          </button>
          <button
            onClick={() => { setMode("signin"); setError(null); setResent(false); }}
            className="w-full text-center font-sora text-[13px] font-semibold text-sand-700 hover:text-ink transition-colors cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  const isSignUp = mode === "signup";

  return (
    <AuthShell
      title={isSignUp ? "Create your studio" : "Welcome back"}
      subtitle={
        isSignUp
          ? "One account, every template. Free to start."
          : "Sign in to your projects, templates, and exports."
      }
    >
      <div className="space-y-5">
        {error && <ErrorNote>{error}</ErrorNote>}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-full border border-sand-300 bg-white px-6 py-3 font-sora text-[13px] font-semibold text-ink hover:border-sand-600 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="flex items-center gap-4" aria-hidden>
          <span className="h-px flex-1 bg-sand-200" />
          <span className="font-mono text-[11px] text-sand-600">or with email</span>
          <span className="h-px flex-1 bg-sand-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isSignUp && (
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Creator Chris"
              autoComplete="name"
              error={fieldErrors.name}
              disabled={loading}
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            autoComplete="email"
            autoFocus
            error={fieldErrors.email}
            disabled={loading}
          />
          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignUp ? "At least 6 characters" : "Your password"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            error={fieldErrors.password}
            disabled={loading}
          />

          {!isSignUp && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="font-sora text-[12px] font-semibold text-sand-700 hover:text-ink transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <SubmitButton loading={loading}>
            {isSignUp ? "Create account" : "Sign in"}
          </SubmitButton>
        </form>

        <p className="text-center text-[13px] text-sand-800">
          {isSignUp ? "Already have an account?" : "New to CaptionsEasy?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "signin" : "signup");
              setError(null);
              setFieldErrors({});
            }}
            className="font-sora font-semibold text-ink underline underline-offset-4 decoration-sand-400 hover:decoration-ink transition-colors cursor-pointer"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
