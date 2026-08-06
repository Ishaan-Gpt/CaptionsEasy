"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { workersService } from "@/services/workers";
import StudioShell from "@/components/studio/StudioShell";

const INSTALL_COMMANDS = {
  mac: "curl -fsSL https://captionseasy.vercel.app/install.sh | bash",
  windows: "irm https://captionseasy.vercel.app/install.ps1 | iex",
};

function ConnectedComputerSection() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<"mac" | "windows" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: workers, isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: () => workersService.getMyWorkers(),
    refetchInterval: 15000,
  });

  const handleCopy = (which: "mac" | "windows") => {
    navigator.clipboard.writeText(INSTALL_COMMANDS[which]);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await workersService.deleteWorker(id);
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="pt-10">
      <h2 className="font-sora text-[15px] font-bold text-ink">Processing</h2>

      <div className="mt-4 rounded-xl border border-sand-200 bg-white p-6">
        <p className="text-[14px] leading-relaxed text-sand-800 max-w-[60ch]">
          Cloud processing is <strong className="text-ink">coming soon</strong>. For now,
          videos are transcribed, captioned, and rendered on your own computer — connect it
          once below, and every project you process or export will run there automatically.
        </p>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-4 py-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-ink">
              {INSTALL_COMMANDS.mac}
            </code>
            <button
              onClick={() => handleCopy("mac")}
              className="shrink-0 rounded-full border border-sand-300 px-3 py-1 font-sora text-[11px] font-semibold text-sand-800 hover:border-ink hover:text-ink transition-colors cursor-pointer"
            >
              {copied === "mac" ? "Copied" : "Copy (Mac/Linux)"}
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-4 py-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-ink">
              {INSTALL_COMMANDS.windows}
            </code>
            <button
              onClick={() => handleCopy("windows")}
              className="shrink-0 rounded-full border border-sand-300 px-3 py-1 font-sora text-[11px] font-semibold text-sand-800 hover:border-ink hover:text-ink transition-colors cursor-pointer"
            >
              {copied === "windows" ? "Copied" : "Copy (Windows)"}
            </button>
          </div>
          <p className="text-[12px] text-sand-600">
            Run this in your terminal, then open the link it prints and click Confirm. No
            git clone, no setup screens.
          </p>
        </div>

        <div className="mt-6 border-t border-sand-200 pt-5">
          {isLoading ? (
            <div className="h-12 rounded-lg bg-sand-100 animate-pulse" />
          ) : !workers || workers.length === 0 ? (
            <p className="text-[13px] text-sand-600">No computer connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {workers.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-sand-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        w.status === "online" ? "bg-green-500" : "bg-sand-400"
                      }`}
                    />
                    <div>
                      <div className="font-sora text-[13px] font-semibold text-ink">{w.name}</div>
                      <div className="text-[12px] text-sand-600">
                        {w.status === "online" ? "Online" : "Offline"}
                        {w.lastSeenAt ? ` · last seen ${new Date(w.lastSeenAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="font-sora text-[12px] font-semibold text-sand-600 hover:text-red-600 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {deletingId === w.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    authService.getCurrentUser().then((user) => {
      if (user) {
        setDisplayName(user.name);
        setEmail(user.email);
        setAvatarUrl(user.avatar_url);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await authService.updateProfile({ name: displayName.trim() });
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetError(null);
    setResetSent(false);
    try {
      await authService.requestPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || "Couldn't send the reset email.");
    }
  };

  return (
    <StudioShell>
      <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto">
        <div className="pb-8 border-b border-sand-200">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.015em] text-ink">
            Account <em className="italic text-sand-600">settings</em>
          </h1>
          <p className="mt-2 text-[14px] text-sand-800">
            Your identity across projects and exports.
          </p>
        </div>

        {/* Profile */}
        <section className="pt-8">
          <h2 className="font-sora text-[15px] font-bold text-ink">Profile</h2>
          {loading ? (
            <div className="mt-4 h-24 rounded-xl bg-sand-100 animate-pulse" />
          ) : (
            <form
              onSubmit={handleSave}
              className="mt-4 rounded-xl border border-sand-200 bg-white p-6 space-y-5"
            >
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full border border-sand-200 bg-sand-50"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-sand-200" />
                )}
                <div className="text-[13px] leading-relaxed text-sand-800">
                  Your avatar comes from your sign-in provider
                  {avatarUrl?.includes("dicebear") ? " (generated from your name)" : ""}.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block font-sora text-[12px] font-semibold text-sand-800">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full rounded-lg border border-sand-300 bg-white px-4 py-3 text-[14px] text-ink outline-none transition-colors focus:border-sand-600 focus:ring-2 focus:ring-sand-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-sora text-[12px] font-semibold text-sand-800">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    title="Email changes require re-verification and aren't supported from this screen yet."
                    className="w-full rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-[14px] text-sand-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {saveError}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving || !displayName.trim()}
                  className="rounded-full bg-ink px-6 py-2.5 font-sora text-[12px] font-semibold text-dune-white hover:bg-sand-800 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span className="font-sora text-[12px] font-semibold text-sand-700">
                    ✓ Saved
                  </span>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Security */}
        <section className="pt-10">
          <h2 className="font-sora text-[15px] font-bold text-ink">Security</h2>
          <div className="mt-4 rounded-xl border border-sand-200 bg-white p-6">
            <p className="text-[14px] leading-relaxed text-sand-800 max-w-[52ch]">
              Password changes go through a verified email link, sent to{" "}
              <strong className="text-ink">{email || "your account email"}</strong>.
            </p>
            {resetError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {resetError}
              </div>
            )}
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={handlePasswordReset}
                disabled={!email || resetSent}
                className="rounded-full border border-sand-300 px-6 py-2.5 font-sora text-[12px] font-semibold text-sand-800 hover:border-ink hover:text-ink disabled:opacity-60 transition-colors cursor-pointer"
              >
                {resetSent ? "Email sent" : "Send password reset email"}
              </button>
              {resetSent && (
                <span className="text-[12px] text-sand-700">Check your inbox.</span>
              )}
            </div>
          </div>
        </section>

        <ConnectedComputerSection />
      </div>
    </StudioShell>
  );
}
