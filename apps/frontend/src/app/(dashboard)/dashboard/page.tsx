"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
import { Project, ProjectStatus, User } from "@/services/types";
import StudioShell from "@/components/studio/StudioShell";

const STATUS_CHIP: Record<ProjectStatus, { label: string; cls: string; pulse?: boolean }> = {
  CREATED: { label: "draft", cls: "border border-sand-300 text-sand-700 bg-white" },
  UPLOADED: { label: "ready to style", cls: "bg-sand-200 text-sand-800" },
  PROCESSING: { label: "processing", cls: "bg-sand-200 text-sand-800", pulse: true },
  COMPLETED: { label: "rendered", cls: "bg-ink text-dune-white" },
  FAILED: { label: "failed", cls: "border border-red-300 text-red-700 bg-red-50" },
};

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    authService.getCurrentUser().then(setCurrentUser);
  }, [router]);

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsService.getProjects(),
    enabled: !!currentUser,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await projectsService.createProject(newTitle.trim());
      setCreateOpen(false);
      setNewTitle("");
      router.push(`/projects/${created.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Couldn't create the project. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectsService.deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err.message || "Couldn't delete the project.");
    } finally {
      setDeleting(false);
    }
  };

  const firstName = currentUser?.name?.split(" ")[0];

  return (
    <StudioShell>
      <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-8 border-b border-sand-200">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.015em] text-ink">
              {firstName ? (
                <>
                  Welcome back, <em className="italic text-sand-600">{firstName}.</em>
                </>
              ) : (
                "Your projects"
              )}
            </h1>
            <p className="mt-2 text-[14px] text-sand-800">
              Every clip you're captioning, in one place.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-full bg-ink px-6 py-3 font-sora text-[13px] font-semibold text-dune-white hover:bg-sand-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            + New project
          </button>
        </div>

        {/* Body */}
        <div className="pt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-sand-100 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
              <p className="font-sora text-[14px] font-semibold text-red-700">
                Couldn't load your projects.
              </p>
              <p className="text-[13px] text-red-700/80">
                The backend may be offline. Start it, then try again.
              </p>
              <button
                onClick={() => refetch()}
                className="rounded-full border border-red-300 px-5 py-2 font-sora text-[12px] font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50 px-8 py-16 text-center">
              <p className="font-serif text-2xl font-semibold text-ink">
                Nothing here yet — <em className="italic text-sand-600">let's fix that.</em>
              </p>
              <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-sand-800">
                Create a project, drop in a talking-head clip, and you'll have
                cinematic captions on it in minutes.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-7 rounded-full bg-ink px-7 py-3 font-sora text-[13px] font-semibold text-dune-white hover:bg-sand-800 transition-all cursor-pointer"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => {
                const chip = STATUS_CHIP[project.status] ?? STATUS_CHIP.CREATED;
                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="group relative flex h-40 cursor-pointer flex-col justify-between rounded-xl border border-sand-200 bg-white p-5 transition-all hover:border-sand-500 hover:shadow-sand-soft"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate pr-8 font-sora text-[15px] font-bold text-ink">
                        {project.title}
                      </h3>
                      <p className="mt-1 font-mono text-[11px] text-sand-600">
                        {project.id.slice(0, 8)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 font-sora text-[11px] font-semibold ${chip.cls}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {chip.pulse && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sand-600" />
                          )}
                          {chip.label}
                        </span>
                      </span>
                      <span className="text-[12px] text-sand-600">{timeAgo(project.created_at)}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError(null);
                        setDeleteTarget(project);
                      }}
                      title="Delete project"
                      className="absolute right-4 top-4 rounded-lg p-1.5 text-sand-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sand-deep animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-2xl font-semibold text-ink">New project</h3>
            <p className="mt-1 text-[13px] text-sand-800">
              Name it after the clip — you can change this later.
            </p>

            {createError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-5 space-y-5">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Podcast ep. 12 — hook cut"
                autoFocus
                required
                disabled={creating}
                className="w-full rounded-lg border border-sand-300 bg-white px-4 py-3 text-[14px] text-ink placeholder:text-sand-500 outline-none transition-colors focus:border-sand-600 focus:ring-2 focus:ring-sand-200"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="rounded-full border border-sand-300 px-5 py-2.5 font-sora text-[12px] font-semibold text-sand-800 hover:border-ink hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="rounded-full bg-ink px-6 py-2.5 font-sora text-[12px] font-semibold text-dune-white hover:bg-sand-800 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {creating ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sand-deep animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-2xl font-semibold text-ink">Delete this project?</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-sand-800">
              <strong className="text-ink">"{deleteTarget.title}"</strong> and its uploads,
              transcript, and exports will be removed. This can't be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-full border border-sand-300 px-5 py-2.5 font-sora text-[12px] font-semibold text-sand-800 hover:border-ink hover:text-ink transition-colors cursor-pointer"
              >
                Keep it
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-6 py-2.5 font-sora text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-all cursor-pointer"
              >
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioShell>
  );
}
