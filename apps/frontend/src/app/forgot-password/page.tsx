"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
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
            {sent ? "Check your email" : "Reset your password"}
          </h2>
          <p className="text-[10px] text-white uppercase tracking-wider">
            {sent
              ? "We sent a password reset link to your inbox."
              : "Enter your account email and we'll send a reset link."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center">
            {error}
          </div>
        )}

        {sent ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-4 border border-[#23272F] bg-[#111317] space-y-2">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#00F5C4]">Reset link sent</span>
              <p className="text-[11px] text-white uppercase tracking-wide leading-relaxed">
                Click the link sent to <strong className="text-[#00F5C4]">{email}</strong> to choose a new password.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider py-3.5 rounded-none hover:bg-[#00C2A0] disabled:bg-[#00A383]/50 disabled:text-[#0A0B0D]/50 transition-colors cursor-pointer"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-[9px] font-bold uppercase tracking-wider text-white hover:text-[#00F5C4] transition-colors"
          >
            &larr; Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
