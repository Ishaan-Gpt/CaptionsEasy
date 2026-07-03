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
  style: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  archived_at: string | null;
}

function toProject(p: BackendProject): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? undefined,
    status: (p.status as ProjectStatus) ?? "CREATED",
    style: p.style ?? undefined,
    thumbnail_url: p.thumbnail_url ?? undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
    deleted_at: p.deleted_at ?? undefined,
    archived_at: p.archived_at ?? undefined,
  };
}

export interface ProjectPage {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

export const projectsService = {
  /** Source: contracts/api.md > GET /projects (paginated). */
  async getProjectsPage(opts?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }): Promise<ProjectPage> {
    const params = new URLSearchParams();
    params.set("limit", String(opts?.limit ?? 20));
    params.set("offset", String(opts?.offset ?? 0));
    if (opts?.includeArchived) params.set("include_archived", "true");

    const { data, meta } = await apiClient.getWithMeta<BackendProject[]>(
      `/projects?${params.toString()}`
    );
    return {
      projects: data.map(toProject),
      total: (meta.total as number) ?? data.length,
      limit: (meta.limit as number) ?? opts?.limit ?? 20,
      offset: (meta.offset as number) ?? opts?.offset ?? 0,
    };
  },

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

  async archiveProject(id: string): Promise<Project> {
    const project = await apiClient.post<BackendProject>(`/projects/${id}/archive`);
    return toProject(project);
  },

  async unarchiveProject(id: string): Promise<Project> {
    const project = await apiClient.post<BackendProject>(`/projects/${id}/unarchive`);
    return toProject(project);
  },

  async duplicateProject(id: string): Promise<Project> {
    const project = await apiClient.post<BackendProject>(`/projects/${id}/duplicate`);
    return toProject(project);
  },

  async updateProjectStyle(id: string, style: string): Promise<Project> {
    const project = await apiClient.patch<BackendProject>(`/projects/${id}`, { json: { style } });
    return toProject(project);
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

  async generateMotionScript(id: string): Promise<any> {
    return apiClient.post<any>(`/projects/${id}/motion-script`);
  },

  async getMotionScript(id: string): Promise<any> {
    return apiClient.get<any>(`/projects/${id}/motion-script`);
  },

  async getProjectVideo(id: string): Promise<{ download_url: string }> {
    return apiClient.get<{ download_url: string }>(`/projects/[id]/video`.replace("[id]", id));
  },

  async saveCustomStyle(
    id: string,
    styleData: {
      font: string;
      size: number;
      weight: string;
      color: string;
      alignment: string;
      shadow: number;
      outline: number;
      highlight_color: string;
      background_style: string;
      y_position_percent: number;
      caption_template: string;
      staggered_layout?: string;
      accent_period_enabled?: boolean;
      word_limit?: number;
      caption_spacing_ms?: number;
      word_pacing?: string;
      pause_handling?: string;
      text_transform?: string;
      underline?: boolean;
      letter_spacing?: number;
      word_spacing?: number;
      line_spacing?: number;
      color_mode?: string;
      color2?: string | null;
      x_position_percent?: number | null;
      box_top?: number | null;
      box_bottom?: number | null;
      box_left?: number | null;
      box_right?: number | null;
    }
  ): Promise<{ style: string }> {
    return apiClient.post<{ style: string }>(`/projects/${id}/custom-style`, {
      json: styleData
    });
  },

  async getCustomStyle(id: string): Promise<any> {
    return apiClient.get<any>(`/projects/${id}/custom-style`);
  },

  /** Upserts a per-caption-card bounding-box override, keyed by the card's
   * own start_ms (the only anchor stable across MotionScript
   * regenerations — see docs/REMOTION_REVAMP_HANDOFF.md Phase C). */
  async setFragmentOverride(
    id: string,
    startMs: number,
    box: { top: number; bottom: number; left: number; right: number }
  ): Promise<{ start_ms: number }> {
    return apiClient.put<{ start_ms: number }>(`/projects/${id}/fragment-override/${startMs}`, {
      json: box,
    });
  },

  async deleteFragmentOverride(id: string, startMs: number): Promise<void> {
    await apiClient.delete(`/projects/${id}/fragment-override/${startMs}`);
  },
};
