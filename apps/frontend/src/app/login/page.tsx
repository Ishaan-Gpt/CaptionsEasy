"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { supabase } from "@/services/auth/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  
  // Auth state toggles
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Redirect on mount if authenticated, and listen for active session updates (OAuth redirect)
  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        if (!name) {
          setError("Name is required to sign up.");
          setLoading(false);
          return;
        }
        await authService.register(name, email, password);
        setVerificationSent(true);
      } else {
        await authService.login(email, password);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to trigger Google sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white flex flex-col justify-center items-center px-4 relative selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      {/* Background glow lines */}
      <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F5C4]/20 to-transparent" />
      <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F5C4]/10 to-transparent" />

      {/* Main card panel */}
      <div className="w-full max-w-md dense-panel p-8 border-[#23272F] space-y-6 shadow-sm">
        
        {/* Title / Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00F5C4]" />
            <span className="font-primary font-black uppercase text-[10px] tracking-widest text-white">
              CAPITIONS<span className="text-[#00F5C4] font-accent italic lowercase text-xs font-light">easy</span>
            </span>
          </div>
          <h2 className="text-2xl font-primary font-black uppercase tracking-tight text-white">
            {verificationSent ? "Check your email" : isSignUp ? "Create your account" : "Access the studio portal"}
          </h2>
          <p className="text-[10px] text-white uppercase tracking-wider">
            {verificationSent 
              ? "We sent a verification link to confirm your account."
              : isSignUp 
              ? "Sign up for a real Supabase creator profile."
              : "Sign in using your account details or Google."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center">
            {error}
          </div>
        )}

        {verificationSent ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-4 border border-[#23272F] bg-[#111317] space-y-2">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#00F5C4]">Verification email sent</span>
              <p className="text-[11px] text-white uppercase tracking-wide leading-relaxed">
                Click the confirmation link sent to <strong className="text-[#00F5C4]">{email}</strong> to activate your workspace profile and log in.
              </p>
            </div>
            <button
              onClick={() => {
                setVerificationSent(false);
                setIsSignUp(false);
              }}
              className="text-[9px] font-bold uppercase tracking-wider text-white hover:text-[#00F5C4] transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignUp && (
              <div className="space-y-1">
                <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Creator Chris"
                  className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3.5 py-2.5 focus:outline-none focus:border-[#00F5C4] transition-colors"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. creator@captionseasy.com"
                className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3.5 py-2.5 focus:outline-none focus:border-[#00F5C4] transition-colors"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3.5 py-2.5 focus:outline-none focus:border-[#00F5C4] transition-colors"
                disabled={loading}
                required
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider py-3.5 rounded-none hover:bg-[#00C2A0] disabled:bg-[#00A383]/50 disabled:text-[#0A0B0D]/50 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : isSignUp ? "Send Verification Email" : "Sign In"}
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full border border-[#23272F] bg-[#111317] text-white hover:text-[#00F5C4] hover:border-[#00F5C4] font-primary font-black uppercase text-[9px] tracking-wider py-2.5 rounded-none transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {/* Custom Google SVG Path */}
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.08-5.136 4.08-3.418 0-6.208-2.774-6.208-6.195 0-3.42 2.79-6.195 6.208-6.195 1.488 0 2.851.527 3.921 1.401l3.056-3.056C18.99 1.954 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.207 0 10.74-4.364 10.74-10.925 0-.726-.065-1.427-.181-2.27H12.24z"/>
                </svg>
                Sign In with Google
              </button>
            </div>

          </form>
        )}

        {!verificationSent && (
          <div className="text-center pt-2 space-y-3">
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-[9px] font-bold uppercase tracking-wider text-[#00F5C4] hover:underline cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>
            {!isSignUp && (
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-[9px] font-bold uppercase tracking-wider text-white hover:text-[#00F5C4] transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}
            <div>
              <button 
                type="button"
                onClick={() => router.push("/")}
                className="text-[9px] font-bold uppercase tracking-wider text-white hover:text-[#00F5C4] transition-colors"
              >
                &larr; Back to Landing Page
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
