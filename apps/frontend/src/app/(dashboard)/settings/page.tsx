"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    authService.getCurrentUser().then((user) => {
      if (user) {
        setDisplayName(user.name);
        setEmail(user.email);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await authService.updateProfile({ name: displayName });
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white p-12 selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-[#23272F]">
          <div>
            <h1 className="text-2xl font-primary font-black uppercase tracking-tight text-white">
              Account <span className="text-[#00F5C4] font-accent italic lowercase font-light text-3xl">settings</span>
            </h1>
            <p className="text-[10px] text-white uppercase tracking-wider mt-1">
              Manage your personal credentials and API integrations.
            </p>
          </div>
          <button 
            onClick={() => router.push("/dashboard")}
            className="border border-[#23272F] bg-[#111317] text-white hover:text-[#00F5C4] font-primary font-black uppercase text-[9px] tracking-wider px-4 py-2 hover:border-[#00F5C4] transition-colors cursor-pointer"
          >
            Dashboard
          </button>
        </div>

        {/* Profile Card */}
        <div className="dense-panel p-6 border-[#23272F] space-y-4">
          <h3 className="text-xs font-primary font-black uppercase text-white tracking-wider">Profile Details</h3>
          {loading ? (
            <p className="text-[10px] text-white uppercase tracking-wider">Loading profile...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-white">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3.5 py-2.5 focus:outline-none focus:border-[#00F5C4]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-white">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    title="Email changes require re-verification and aren't supported from this screen yet."
                    className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white/50 px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
              </div>
              {saveError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold tracking-wider p-3">
                  {saveError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim()}
                  className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[9px] tracking-wider px-5 py-2.5 hover:bg-[#00C2A0] disabled:bg-[#00A383]/50 disabled:text-[#0A0B0D]/50 transition-colors cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
                {saved && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#00F5C4]">Saved</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Account security */}
        <div className="dense-panel p-6 border-[#23272F] space-y-4">
          <h3 className="text-xs font-primary font-black uppercase text-white tracking-wider">Account security</h3>
          <p className="text-[10px] text-white uppercase tracking-wider leading-relaxed">
            Password changes are handled through a verified email link.
          </p>
          <button
            onClick={() => router.push("/forgot-password")}
            className="border border-[#23272F] bg-[#111317] text-white hover:text-[#00F5C4] font-primary font-black uppercase text-[9px] tracking-wider px-5 py-2.5 hover:border-[#00F5C4] transition-colors cursor-pointer"
          >
            Send Password Reset Email
          </button>
        </div>

      </div>
    </div>
  );
}
