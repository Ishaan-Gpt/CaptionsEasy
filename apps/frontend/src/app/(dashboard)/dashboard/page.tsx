"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderPlus,
  Film,
  Calendar,
  Trash2,
  ArrowRight,
  Video,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Pencil,
  Copy,
  Archive,
  ArchiveRestore,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { projectsService, ProjectPage } from "@/services/projects";
import { authService } from "@/services/auth";
import { Project } from "@/services/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

const PAGE_SIZE = 9;
const SEARCH_PAGE_SIZE = 100;

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const isSearching = searchQuery.trim().length > 0;

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId]);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const {
    data: projectPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProjectPage>({
    queryKey: ["projects", { page, isSearching, showArchived }],
    queryFn: () =>
      projectsService.getProjectsPage({
        limit: isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
        offset: isSearching ? 0 : page * PAGE_SIZE,
        includeArchived: showArchived,
      }),
    // DashboardLayout redirects unauthenticated visitors to /login, but that
    // redirect runs in an effect after first render — without this gate,
    // this query fires immediately on mount regardless, hitting the backend
    // with no token and logging a 401 every time someone lands here signed out.
    enabled: authService.isAuthenticated(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const createMutation = useMutation({
    mutationFn: projectsService.createProject,
    onSuccess: (newProj) => {
      invalidate();
      setIsModalOpen(false);
      setNewTitle("");
      router.push(`/projects/${newProj.id}`);
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to create project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsService.deleteProject,
    onSuccess: () => {
      setDeleteTarget(null);
      invalidate();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => projectsService.renameProject(id, title),
    onSuccess: () => {
      setRenameTarget(null);
      invalidate();
    },
    onError: (err: any) => {
      setRenameError(err.message || "Failed to rename project");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: projectsService.duplicateProject,
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: projectsService.archiveProject,
    onSuccess: invalidate,
  });

  const unarchiveMutation = useMutation({
    mutationFn: projectsService.unarchiveProject,
    onSuccess: invalidate,
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTitle.trim()) {
      setCreateError("Project title cannot be empty");
      return;
    }
    createMutation.mutate(newTitle.trim());
  };

  const openRename = (project: Project) => {
    setOpenMenuId(null);
    setRenameTarget(project);
    setRenameValue(project.title);
    setRenameError(null);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    if (!renameValue.trim()) {
      setRenameError("Project title cannot be empty");
      return;
    }
    renameMutation.mutate({ id: renameTarget.id, title: renameValue.trim() });
  };

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-3 animate-fade-in-up">
        <Spinner className="w-8 h-8 text-indigo-500" />
        <p className="text-sm text-zinc-400 font-medium">Retrieving workspace projects...</p>
      </div>
    );
  }

  // 2. ERROR STATE
  if (isError) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center text-center max-w-md mx-auto gap-4 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-200">Failed to load projects</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {error instanceof Error ? error.message : "An error occurred while connecting to local database."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} className="gap-2">
          <RefreshCw size={14} />
          Retry Connection
        </Button>
      </div>
    );
  }

  const allProjects = projectPage?.projects ?? [];
  const visibleProjects = isSearching
    ? allProjects.filter((p) => p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : allProjects;
  const hasProjects = visibleProjects.length > 0;
  const totalPages = projectPage ? Math.max(1, Math.ceil(projectPage.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Upper stats row & header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-150">My Projects</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage and export your captioned social video assets</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-indigo-600/10">
          <FolderPlus size={16} />
          New Project
        </Button>
      </div>

      {/* Search + archive toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
        <button
          onClick={() => {
            setShowArchived((v) => !v);
            setPage(0);
          }}
          className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
            showArchived
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
              : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </button>
      </div>

      {/* Grid displays */}
      {!hasProjects ? (
        // 3. EMPTY STATE
        <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-4 bg-zinc-900/10 mt-12 animate-fade-in-up">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Film size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">
              {isSearching ? "No projects match your search" : "No projects found"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-xs">
              {isSearching
                ? "Try a different title, or clear the search."
                : "Upload a talking head video to auto-generate cinematic caption styles."}
            </p>
          </div>
          {!isSearching && (
            <Button onClick={() => setIsModalOpen(true)} variant="secondary" className="gap-2">
              <FolderPlus size={14} />
              Create First Project
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 4. PROJECTS LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project) => {
              const isProcessing = project.status === "PROCESSING";
              const isArchived = !!project.archived_at;

              return (
                <Card
                  key={project.id}
                  hoverable
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className={`cursor-pointer flex flex-col h-64 border-zinc-900 relative group overflow-hidden ${
                    isArchived ? "opacity-60" : ""
                  }`}
                >
                  {/* Project status glow */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 group-hover:bg-indigo-500 transition-colors" />

                  {/* Card thumbnail or placeholder */}
                  <div className="h-32 -mx-6 -mt-6 bg-zinc-950 border-b border-zinc-900/60 relative overflow-hidden flex items-center justify-center">
                    {project.thumbnail_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      />
                    ) : (
                      <Video size={28} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    )}

                    {/* Status label overlay */}
                    <span
                      className={`absolute top-3 right-3 text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-0.5 border ${
                        project.status === "COMPLETED"
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : isProcessing
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {isArchived ? "archived" : project.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between pt-4">
                    <div>
                      <h3 className="font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate mt-1">
                        {project.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-550 border-t border-zinc-900 pt-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                          className="p-1 rounded text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                        >
                          <MoreVertical size={13} />
                        </button>
                        <span className="p-1 text-zinc-650 group-hover:text-indigo-400 transition-colors">
                          <ArrowRight size={13} />
                        </span>

                        {openMenuId === project.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full right-0 mb-2 w-40 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl py-1 z-20 animate-fade-in"
                          >
                            <button
                              onClick={() => openRename(project)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                              <Pencil size={12} /> Rename
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                duplicateMutation.mutate(project.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                              <Copy size={12} /> Duplicate
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                if (isArchived) {
                                  unarchiveMutation.mutate(project.id);
                                } else {
                                  archiveMutation.mutate(project.id);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                              {isArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                              {isArchived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteTarget(project);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/5 transition-colors"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* PAGINATION (hidden while searching, since search spans a wider fetched window) */}
          {!isSearching && projectPage && projectPage.total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-zinc-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* CREATE DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-fade-in-up relative">
            <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

            <div>
              <h3 className="text-base font-bold text-zinc-100">Create new workspace</h3>
              <p className="text-xs text-zinc-400 mt-1">Provide a project title to start uploading your media</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                id="title"
                label="Project Title"
                placeholder="Marketing Shorts, Podcast Highlight..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                error={createError || undefined}
                disabled={createMutation.isPending}
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Initialize
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME DIALOG MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setRenameTarget(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-fade-in-up relative">
            <div>
              <h3 className="text-base font-bold text-zinc-100">Rename project</h3>
            </div>

            <form onSubmit={submitRename} className="space-y-4">
              <Input
                id="rename"
                label="Project Title"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                error={renameError || undefined}
                disabled={renameMutation.isPending}
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRenameTarget(null)}
                  disabled={renameMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={renameMutation.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteTarget(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-fade-in-up relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Delete &ldquo;{deleteTarget.title}&rdquo;?</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This permanently removes the project, its uploads, and exports. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
