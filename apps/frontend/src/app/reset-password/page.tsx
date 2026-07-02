"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { supabase } from "@/services/auth/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase establishes a recovery session client-side from the email link's
  // URL fragment before firing PASSWORD_RECOVERY; updatePassword() needs that
  // session to exist first.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white flex flex-col justify-center items-center px-4 relative selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F5C4]/20 to-transparent" />
      <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F5C4]/10 to-transparent" />

      <div className="w-full max-w-md dense-panel p-8 border-[#23272F] space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00F5C4]" />
            <span className="font-primary font-black uppercase text-[10px] tracking-widest text-white">
              CAPITIONS<span className="text-[#00F5C4] font-accent italic lowercase text-xs font-light">easy</span>
            </span>
          </div>
          <h2 className="text-2xl font-primary font-black uppercase tracking-tight text-white">
            {done ? "Password updated" : "Choose a new password"}
          </h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center">
            {error}
          </div>
        )}

        {done ? (
          <p className="text-[11px] text-white uppercase tracking-wide leading-relaxed text-center">
            Redirecting you to sign in...
          </p>
        ) : !ready ? (
          <p className="text-[11px] text-white uppercase tracking-wide leading-relaxed text-center">
            Open this page using the reset link from your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                New Password
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
            <div className="space-y-1">
              <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3.5 py-2.5 focus:outline-none focus:border-[#00F5C4] transition-colors"
                disabled={loading}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider py-3.5 rounded-none hover:bg-[#00C2A0] disabled:bg-[#00A383]/50 disabled:text-[#0A0B0D]/50 transition-colors cursor-pointer"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
