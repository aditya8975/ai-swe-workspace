import { create } from "zustand";
import { Project } from "@/types";
import { api } from "@/lib/api";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<Project[]>("/projects");
      set({ projects: data, isLoading: false });
    } catch (err: any) {
      set({ error: "Failed to load projects.", isLoading: false });
    }
  },

  createProject: async (name, description) => {
    const { data } = await api.post<Project>("/projects", { name, description });
    set({ projects: [data, ...get().projects] });
    return data;
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
