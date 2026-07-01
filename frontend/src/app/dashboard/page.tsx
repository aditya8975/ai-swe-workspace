"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { Project } from "@/types";
import AuthGuard from "@/components/auth/AuthGuard";
import { FolderOpen, Plus, Trash2, Code2, LogOut, GitBranch } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { createProject } = useProjectStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const project = await createProject(name.trim(), desc.trim() || undefined);
      router.push(`/project/${project.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4">
      <div className="panel w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">New Project</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Project name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. my-api-server"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Description (optional)</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="input-field"
              placeholder="What are you building?"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1">
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const { user, logout } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchProjects(); }, []);

  async function handleDelete(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeletingId(project.id);
    await deleteProject(project.id);
    setDeletingId(null);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg">
        {/* Top nav */}
        <header className="border-b border-border bg-bg-panel px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-sm font-bold font-mono">AI</div>
            <span className="text-sm font-semibold text-text-primary">Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">{user?.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">
                {user?.full_name ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Your Projects"}
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                {projects.length} project{projects.length !== 1 ? "s" : ""} — click any to open the workspace
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New project
            </button>
          </div>

          {isLoading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Code2 className="h-12 w-12 text-text-muted mb-4" />
              <h2 className="text-lg font-medium text-text-primary">No projects yet</h2>
              <p className="text-sm text-text-secondary mt-1 mb-5">
                Create your first project to start coding with AI
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="panel p-4 text-left hover:border-border-subtle hover:bg-bg-elevated transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate font-mono text-sm">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-text-secondary truncate mt-0.5">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, project)}
                      disabled={deletingId === project.id}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-text-muted hover:text-danger transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
                    <span>Updated {timeAgo(project.updated_at)}</span>
                    {project.github_repo_url && (
                      <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{project.github_default_branch}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </div>
    </AuthGuard>
  );
}
