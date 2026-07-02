"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
import { Project } from "@/services/types";

type HealthChecks = { database: boolean; redis: boolean };

// /health/ready is mounted at the API root, not under /api/v1 — strip the
// versioned prefix from the configured API base URL to reach it.
const HEALTH_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/api\/v1\/?$/,
  ""
) + "/health/ready";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Check auth and load user
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    authService.getCurrentUser().then((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Fetch projects list
  const {
    data: projects = [],
    isLoading,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsService.getProjects(),
    enabled: !!currentUser,
  });

  // Live backend health — GET /health/ready checks Postgres + Redis for real.
  const { data: health } = useQuery<HealthChecks | null>({
    queryKey: ["health"],
    queryFn: async () => {
      try {
        const res = await fetch(HEALTH_URL);
        const body = await res.json();
        return body.checks as HealthChecks;
      } catch {
        return null;
      }
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
    retry: false,
  });

  const handleSignOut = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await projectsService.createProject(newProjectTitle.trim());
      setNewProjectModalOpen(false);
      setNewProjectTitle("");
      router.push(`/projects/${created.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create project.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid navigating into project
    if (!confirm("Are you sure you want to delete this project workspace?")) return;
    try {
      await projectsService.deleteProject(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      
      {/* LEFT SIDEBAR MENU */}
      <aside className="w-64 bg-[#111317] border-r border-[#23272F] flex flex-col justify-between shrink-0">
        <div className="p-6 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00F5C4]" />
            <span className="font-primary font-black uppercase text-xs tracking-widest text-white">
              CAPITIONS<span className="text-[#00F5C4] font-accent italic lowercase text-xs font-light">easy</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#181B21] border border-[#23272F] text-[10px] font-bold uppercase tracking-wider text-[#00F5C4] text-left">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
              Projects
            </button>
            
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#181B21] text-[10px] font-bold uppercase tracking-wider text-white hover:text-[#00F5C4] text-left transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* System Health Indicators — live from GET /health/ready */}
        <div className="p-6 border-t border-[#23272F] space-y-4">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-white">
            <span>System Health</span>
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  health === undefined ? "bg-white/30" : health ? "bg-[#00F5C4]" : "bg-red-500"
                }`}
              />
              {health === undefined ? "Checking..." : health ? "Online" : "Unreachable"}
            </span>
          </div>
          <div className="space-y-1.5 text-[8px] font-mono text-white uppercase">
            <div className="flex justify-between">
              <span>Database (PSQL):</span>
              <span className={health?.database ? "text-[#00F5C4]" : "text-red-450"}>
                {health === undefined ? "..." : health?.database ? "CONNECTED" : "DOWN"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Job Queue (Redis):</span>
              <span className={health?.redis ? "text-[#00F5C4]" : "text-red-450"}>
                {health === undefined ? "..." : health?.redis ? "CONNECTED" : "DOWN"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-[#23272F]">
            <div>
              <h1 className="text-2xl font-primary font-black uppercase tracking-tight text-white">
                Creator <span className="text-[#00F5C4] font-accent italic lowercase font-light text-3xl">studio</span> dashboard
              </h1>
              <p className="text-[10px] text-white uppercase tracking-wider mt-1">
                Welcome back, {currentUser?.name || "Creator"}. Manage your active video workspaces.
              </p>
            </div>
            
            <button
              onClick={() => setNewProjectModalOpen(true)}
              className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider px-5 py-2.5 rounded-none hover:bg-[#00C2A0] transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Project
            </button>
          </div>

          {/* Projects display */}
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-[#00F5C4] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-white">Querying databases...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="border border-dashed border-[#23272F] p-16 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-primary font-black uppercase text-white">No workspace projects found</h3>
                <p className="text-[10px] text-white uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                  Start by creating a new video editing project workspace. You will be able to upload MP4 clips and customize template layouts.
                </p>
              </div>
              <button
                onClick={() => setNewProjectModalOpen(true)}
                className="border border-[#00F5C4] text-[#00F5C4] bg-[#111317]/50 font-primary font-black uppercase text-[10px] tracking-wider px-6 py-2.5 rounded-none hover:bg-[#00F5C4] hover:text-[#0A0B0D] transition-all cursor-pointer"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="dense-panel p-5 border-[#23272F] hover:border-[#00F5C4] transition-all cursor-pointer flex flex-col justify-between h-40 group relative"
                >
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-white uppercase block tracking-wider">PROJECT ID: {project.id.slice(0, 8)}</span>
                    <h3 className="text-sm font-primary font-black uppercase text-white tracking-tight truncate pr-6">
                      {project.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F5C4]" />
                      <span className="text-[8px] font-bold uppercase tracking-wider text-white">{project.status}</span>
                    </div>
                    <span className="text-[8px] font-mono text-white">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Absolute Delete Button */}
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="absolute top-4 right-4 text-white hover:text-red-450 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                    title="Delete workspace"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* NEW PROJECT MODAL */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 bg-[#0A0B0D]/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md dense-panel p-8 border-[#23272F] space-y-6 animate-fade-in-up">
            
            <div className="flex justify-between items-center pb-3 border-b border-[#23272F]">
              <h3 className="text-sm font-primary font-black uppercase text-white">New Studio Project</h3>
              <button 
                onClick={() => setNewProjectModalOpen(false)}
                className="text-white hover:text-[#00F5C4] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {createError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold tracking-wider p-3">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold uppercase tracking-wider text-white">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. My Cinematic Short"
                  className="w-full bg-[#181B21] border border-[#23272F] text-xs text-white px-3 py-2.5 focus:outline-none focus:border-[#00F5C4]"
                  required
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
                  className="border border-[#23272F] bg-[#111317] text-white font-primary font-black uppercase text-[9px] tracking-wider px-4 py-2 hover:border-[#00F5C4] hover:text-white transition-colors cursor-pointer"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[9px] tracking-wider px-6 py-2 hover:bg-[#00C2A0] transition-colors cursor-pointer"
                  disabled={isCreating}
                >
                  {isCreating ? "Initializing..." : "Create Workspace"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
