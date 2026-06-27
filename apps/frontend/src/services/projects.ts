/**
 * Real projects service. Source: contracts/api.md > Projects. Sprint 1.6
 * replaces the previous localStorage-backed mock (list/rename/status/
 * delete) with the backend endpoints added this sprint
 * (apps/backend/app/api/v1/projects.py).
 */

import { Project, ProjectStatus } from "./types";
import { apiClient, ApiError } from "./api-client";

interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toProject(p: BackendProject): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? undefined,
    status: (p.status as ProjectStatus) ?? "CREATED",
    thumbnail_url: p.thumbnail_url ?? undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
    deleted_at: p.deleted_at ?? undefined,
  };
}

export const projectsService = {
  async getProjects(): Promise<Project[]> {
    const projects = await apiClient.get<BackendProject[]>("/projects");
    return projects.map(toProject);
  },

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const project = await apiClient.get<BackendProject>(`/projects/${id}`);
      return toProject(project);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  },

  async createProject(title: string): Promise<Project> {
    const project = await apiClient.post<BackendProject>("/projects", { json: { title } });
    return toProject(project);
  },

  async renameProject(id: string, title: string): Promise<Project> {
    const project = await apiClient.patch<BackendProject>(`/projects/${id}`, { json: { title } });
    return toProject(project);
  },

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    const project = await apiClient.patch<BackendProject>(`/projects/${id}`, { json: { status } });
    return toProject(project);
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  /** Source: contracts/api.md > POST /projects/{id}/process. Queues the AI
   * pipeline job for the project's latest uploaded video. */
  async startProcessing(id: string): Promise<{ jobId: string }> {
    return apiClient.post<{ jobId: string }>(`/projects/${id}/process`);
  },

  async startExport(id: string, resolution: string = "1080p", quality: string = "high"): Promise<{ jobId: string }> {
    return apiClient.post<{ jobId: string }>(`/projects/${id}/export`, {
      json: { resolution, quality }
    });
  },

  async getExports(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/projects/${id}/exports`);
  },
};
