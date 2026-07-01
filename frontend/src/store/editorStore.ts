import { create } from "zustand";
import { FileTreeNode, ProjectFile, FileNodeType } from "@/types";
import { api } from "@/lib/api";

interface EditorState {
  projectId: string | null;
  tree: FileTreeNode[];
  openFiles: ProjectFile[]; // tabs, in order opened
  activeFileId: string | null;
  isLoadingTree: boolean;
  dirtyFileIds: Set<string>; // files with unsaved changes

  loadProject: (projectId: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  openFile: (fileId: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => Promise<void>;
  createFile: (name: string, type: FileNodeType, parentId: string | null, content?: string) => Promise<ProjectFile>;
  deleteFile: (fileId: string) => Promise<void>;
  getActiveFile: () => ProjectFile | null;
}

function inferLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    json: "json", md: "markdown", html: "html", css: "css", yml: "yaml", yaml: "yaml",
    sh: "shell", go: "go", rs: "rust", java: "java", rb: "ruby", php: "php", sql: "sql",
    txt: "plaintext",
  };
  return map[ext || ""] || "plaintext";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  tree: [],
  openFiles: [],
  activeFileId: null,
  isLoadingTree: false,
  dirtyFileIds: new Set(),

  loadProject: async (projectId) => {
    set({ projectId, tree: [], openFiles: [], activeFileId: null });
    await get().refreshTree();
  },

  refreshTree: async () => {
    const { projectId } = get();
    if (!projectId) return;
    set({ isLoadingTree: true });
    try {
      const { data } = await api.get<FileTreeNode[]>(`/projects/${projectId}/files/tree`);
      set({ tree: data, isLoadingTree: false });
    } catch {
      set({ isLoadingTree: false });
    }
  },

  openFile: async (fileId) => {
    const { projectId, openFiles } = get();
    if (!projectId) return;

    const alreadyOpen = openFiles.find((f) => f.id === fileId);
    if (alreadyOpen) {
      set({ activeFileId: fileId });
      return;
    }

    const { data } = await api.get<ProjectFile>(`/projects/${projectId}/files/${fileId}`);
    set({ openFiles: [...openFiles, data], activeFileId: fileId });
  },

  closeFile: (fileId) => {
    const { openFiles, activeFileId } = get();
    const remaining = openFiles.filter((f) => f.id !== fileId);
    let newActive = activeFileId;
    if (activeFileId === fileId) {
      newActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    }
    set({ openFiles: remaining, activeFileId: newActive });
  },

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  updateFileContent: (fileId, content) => {
    const { openFiles, dirtyFileIds } = get();
    set({
      openFiles: openFiles.map((f) => (f.id === fileId ? { ...f, content } : f)),
      dirtyFileIds: new Set(dirtyFileIds).add(fileId),
    });
  },

  saveFile: async (fileId) => {
    const { projectId, openFiles, dirtyFileIds } = get();
    if (!projectId) return;
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;

    await api.patch(`/projects/${projectId}/files/${fileId}`, { content: file.content });
    const newDirty = new Set(dirtyFileIds);
    newDirty.delete(fileId);
    set({ dirtyFileIds: newDirty });
  },

  createFile: async (name, type, parentId, content = "") => {
    const { projectId } = get();
    if (!projectId) throw new Error("No project loaded");

    const { data } = await api.post<ProjectFile>(`/projects/${projectId}/files`, {
      name,
      type,
      parent_id: parentId,
      content: type === "file" ? content : undefined,
      language: type === "file" ? inferLanguage(name) : undefined,
    });
    await get().refreshTree();
    return data;
  },

  deleteFile: async (fileId) => {
    const { projectId } = get();
    if (!projectId) return;
    await api.delete(`/projects/${projectId}/files/${fileId}`);
    get().closeFile(fileId);
    await get().refreshTree();
  },

  getActiveFile: () => {
    const { openFiles, activeFileId } = get();
    return openFiles.find((f) => f.id === activeFileId) || null;
  },
}));
