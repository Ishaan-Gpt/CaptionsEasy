"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Film, Calendar, Trash2, ArrowRight, Video, AlertCircle, RefreshCw } from "lucide-react";
import { projectsService } from "@/services/projects";
import { Project } from "@/services/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch projects
  const {
    data: projects,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: projectsService.getProjects,
  });

  // Create Project mutation
  const createMutation = useMutation({
    mutationFn: projectsService.createProject,
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsModalOpen(false);
      setNewTitle("");
      router.push(`/projects/${newProj.id}`);
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to create project");
    },
  });

  // Delete Project mutation
  const deleteMutation = useMutation({
    mutationFn: projectsService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid navigating
    if (confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(id);
    }
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

  const hasProjects = projects && projects.length > 0;

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

      {/* Grid displays */}
      {!hasProjects ? (
        // 3. EMPTY STATE
        <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-4 bg-zinc-900/10 mt-12 animate-fade-in-up">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Film size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">No projects found</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-xs">
              Upload a talking head video to auto-generate cinematic caption styles.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="secondary" className="gap-2">
            <FolderPlus size={14} />
            Create First Project
          </Button>
        </div>
      ) : (
        // 4. PROJECTS LIST
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const isProcessing = project.status === "PROCESSING";
            
            return (
              <Card
                key={project.id}
                hoverable
                onClick={() => router.push(`/projects/${project.id}`)}
                className="cursor-pointer flex flex-col h-64 border-zinc-900 relative group overflow-hidden"
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
                    {project.status.toLowerCase()}
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="p-1 text-zinc-650 group-hover:text-indigo-400 transition-colors">
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
    </div>
  );
}
