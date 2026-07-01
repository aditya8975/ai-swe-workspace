"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useEditorStore } from "@/store/editorStore";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import AuthGuard from "@/components/auth/AuthGuard";
import FileTree from "@/components/workspace/FileTree";
import CodeEditor from "@/components/workspace/CodeEditor";
import ChatPanel from "@/components/workspace/ChatPanel";
import { ChevronLeft, Bot, Files, LayoutPanelLeft, LogOut } from "lucide-react";

type SidePanel = "explorer" | "ai";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { loadProject } = useEditorStore();
  const { projects, fetchProjects } = useProjectStore();
  const { user, logout } = useAuthStore();
  const [activePanel, setActivePanel] = useState<SidePanel>("explorer");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    loadProject(projectId);
    if (projects.length === 0) fetchProjects();
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-bg overflow-hidden">

        {/* ── Activity bar (leftmost narrow strip) ── */}
        <div className="flex flex-col items-center gap-1 w-12 bg-bg-panel border-r border-border py-2 shrink-0">
          {/* Logo */}
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold font-mono">
            AI
          </div>

          <button
            onClick={() => setActivePanel("explorer")}
            className={clsx(
              "p-2 rounded-md transition-colors w-9 flex justify-center",
              activePanel === "explorer" ? "bg-bg-hover text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
            title="Explorer"
          >
            <Files className="h-5 w-5" />
          </button>

          <button
            onClick={() => { setActivePanel("ai"); setRightPanelOpen(true); }}
            className={clsx(
              "p-2 rounded-md transition-colors w-9 flex justify-center",
              activePanel === "ai" ? "bg-bg-hover text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
            title="AI Assistant"
          >
            <Bot className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Toggle right AI panel */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="p-2 rounded-md text-text-muted hover:text-text-primary transition-colors w-9 flex justify-center"
            title={rightPanelOpen ? "Hide AI panel" : "Show AI panel"}
          >
            <LayoutPanelLeft className="h-5 w-5" />
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-md text-text-muted hover:text-text-primary transition-colors w-9 flex justify-center"
            title="Back to dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-md text-text-muted hover:text-danger transition-colors w-9 flex justify-center"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* ── Left side panel (Explorer or AI mini-view on mobile) ── */}
        <div className="w-56 border-r border-border bg-bg-panel flex flex-col shrink-0 overflow-hidden">
          {/* Panel header with project name */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-text-primary font-mono truncate">
              {project?.name || projectId}
            </p>
          </div>

          {activePanel === "explorer" ? (
            <div className="flex-1 overflow-hidden">
              <FileTree />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-2 text-xs text-text-muted">
              <p className="text-center pt-4">Switch to the right panel →</p>
            </div>
          )}
        </div>

        {/* ── Main editor area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditor />
        </div>

        {/* ── Right AI chat panel (collapsible) ── */}
        {rightPanelOpen && (
          <div className="w-80 border-l border-border flex flex-col shrink-0 overflow-hidden relative">
            {/* Amber "active rail" — the signature design element */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent/40" />
            <ChatPanel projectId={projectId} />
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
