import { Project, ProjectStatus } from "./types";
import { apiClient } from "./api-client";

const PROJECTS_KEY = "motionai_mock_projects";

// Prepopulate storage with some mock projects for visual demo
const getPrepopulatedProjects = (): Project[] => {
  return [
    {
      id: "proj_1",
      title: "Viral Reels - Tech Setup",
      description: "Short promo clip showing new mechanical keyboard setup.",
      status: "COMPLETED",
      thumbnail_url: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&q=80",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "proj_2",
      title: "Podcast Ep 12 Highlight",
      description: "Snippet about AI agents coding on developer machines.",
      status: "PROCESSING",
      thumbnail_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "proj_3",
      title: "Fitness VLog Intro",
      description: "Motivation monologue.",
      status: "CREATED",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    }
  ];
};

const getProjectsFromStorage = (): Project[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PROJECTS_KEY);
  if (!stored) {
    const initial = getPrepopulatedProjects();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored) as Project[];
  } catch {
    return [];
  }
};

const saveProjectsToStorage = (projects: Project[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
};

export const projectsService = {
  async getProjects(): Promise<Project[]> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return getProjectsFromStorage().filter((p) => !p.deleted_at);
  },

  async getProjectById(id: string): Promise<Project | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const project = getProjectsFromStorage().find((p) => p.id === id && !p.deleted_at);
    return project || null;
  },

  async createProject(title: string): Promise<Project> {
    // Real backend project row — required because the upload endpoint
    // validates project ownership against the database (contracts/api.md,
    // contracts/database.md > RLS). Status/listing stay on the local mock
    // store below until Phase 3 (project CRUD) lands on the backend.
    const backendProject = await apiClient.post<{ id: string; title: string }>("/projects", {
      json: { title },
    });

    const newProj: Project = {
      id: backendProject.id,
      title,
      status: "CREATED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const projects = getProjectsFromStorage();
    projects.unshift(newProj);
    saveProjectsToStorage(projects);
    return newProj;
  },

  async renameProject(id: string, title: string): Promise<Project> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const projects = getProjectsFromStorage();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Project not found");
    
    projects[index] = {
      ...projects[index],
      title,
      updated_at: new Date().toISOString()
    };
    saveProjectsToStorage(projects);
    return projects[index];
  },

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    const projects = getProjectsFromStorage();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Project not found");
    
    projects[index] = {
      ...projects[index],
      status,
      updated_at: new Date().toISOString()
    };
    saveProjectsToStorage(projects);
    return projects[index];
  },

  async deleteProject(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const projects = getProjectsFromStorage();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Project not found");
    
    // Soft delete
    projects[index] = {
      ...projects[index],
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    saveProjectsToStorage(projects);
  }
};
