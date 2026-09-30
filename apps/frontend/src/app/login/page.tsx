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

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
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

const GitHubIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0 text-neutral-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
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
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [resent, setResent] = useState(false);

  // Redirect if already authenticated; also catches the OAuth return.
  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.replace("/start");
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/start");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!validEmail(email)) errs.email = "Enter a valid email address.";
    if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (mode === "signup" && !name.trim()) errs.name = "Please enter your name.";
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
        router.replace("/start");
      }
    } catch (err) {
      setError(friendlyAuthError((err instanceof Error ? err.message : "") || "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (err) {
      setError(friendlyAuthError((err instanceof Error ? err.message : "") || "Google sign-in failed."));
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.loginWithGithub();
    } catch (err) {
      setError(friendlyAuthError((err instanceof Error ? err.message : "") || "GitHub sign-in failed."));
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
    } catch (err) {
      setError(friendlyAuthError((err instanceof Error ? err.message : "") || "Couldn't resend the email."));
    }
  };

  if (mode === "verify-sent") {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={
          <>
            We sent a confirmation link to <strong className="text-neutral-900">{email}</strong>.
            Open it to activate your account, then come back and sign in.
          </>
        }
      >
        <div className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          {resent && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-[13px] text-blue-800 font-medium">
              Sent again — please check your inbox and spam folder.
            </div>
          )}
          <button
            onClick={handleResend}
            className="w-full rounded-xl border border-neutral-300 bg-white px-6 py-3 text-[14px] font-medium text-neutral-800 hover:bg-neutral-50 transition cursor-pointer"
          >
            Resend confirmation email
          </button>
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
              setResent(false);
            }}
            className="w-full text-center text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition cursor-pointer py-2"
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
      title={isSignUp ? "Create Account" : "Welcome Back"}
      subtitle={
        <p className="text-[13.5px] text-neutral-600">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "signin" : "signup");
              setError(null);
              setFieldErrors({});
            }}
            className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline-offset-2 hover:underline transition"
          >
            {isSignUp ? "Sign In" : "Sign up"}
          </button>
        </p>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isSignUp && (
            <Field
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              autoComplete="name"
              error={fieldErrors.name}
              disabled={loading}
            />
          )}

          <Field
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            autoComplete="email"
            autoFocus
            error={fieldErrors.email}
            disabled={loading}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            error={fieldErrors.password}
            disabled={loading}
          />

          {!isSignUp && (
            <div className="flex items-center justify-between pt-0.5 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-neutral-900"
                />
                <span className="text-[13px] text-neutral-600 font-normal">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <SubmitButton loading={loading}>
            {isSignUp ? "Sign Up" : "Sign In"}
          </SubmitButton>
        </form>

        {/* Divider */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="w-full border-t border-neutral-200" />
          <span className="absolute bg-white px-3 text-[12px] font-medium text-neutral-400 lowercase">
            or
          </span>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50/90 py-2.5 px-3 font-medium text-[13px] text-neutral-700 hover:border-neutral-300 transition duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <GoogleIcon />
            <span className="truncate">Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={handleGithub}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50/90 py-2.5 px-3 font-medium text-[13px] text-neutral-700 hover:border-neutral-300 transition duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <GitHubIcon />
            <span className="truncate">Continue with GitHub</span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
