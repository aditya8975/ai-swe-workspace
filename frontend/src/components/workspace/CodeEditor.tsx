"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import clsx from "clsx";
import { useEditorStore } from "@/store/editorStore";
import { X, File } from "lucide-react";

// Monaco must be loaded client-side only (no SSR)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const MONACO_THEME_OPTIONS = {
  theme: "vs-dark",
  options: {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 13,
    lineHeight: 1.6,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: "gutter" as const,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    bracketPairColorization: { enabled: true },
    formatOnPaste: true,
    tabSize: 2,
  },
};

function EditorTabs() {
  const { openFiles, activeFileId, setActiveFile, closeFile, dirtyFileIds } = useEditorStore();

  return (
    <div className="flex items-end overflow-x-auto border-b border-border bg-bg scrollbar-none" style={{ scrollbarWidth: "none" }}>
      {openFiles.map((file) => {
        const isActive = file.id === activeFileId;
        const isDirty = dirtyFileIds.has(file.id);
        return (
          <button
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={clsx(
              "group flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 text-xs font-mono transition-colors",
              isActive
                ? "bg-bg text-text-primary border-t-2 border-t-accent"
                : "bg-bg-panel text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            )}
          >
            <File className="h-3 w-3 shrink-0" />
            <span className={clsx("max-w-32 truncate", isDirty && "italic")}>{file.name}</span>
            {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
              onKeyDown={(e) => e.key === "Enter" && closeFile(file.id)}
              className={clsx(
                "ml-0.5 rounded p-0.5 transition-colors",
                isActive
                  ? "opacity-60 hover:opacity-100 hover:bg-bg-hover"
                  : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-bg-hover"
              )}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function CodeEditor() {
  const { openFiles, activeFileId, updateFileContent, saveFile, getActiveFile } = useEditorStore();
  const activeFile = getActiveFile();

  // Ctrl/Cmd + S saves the current file
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeFileId) saveFile(activeFileId);
      }
    },
    [activeFileId, saveFile]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (openFiles.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1 text-center px-8">
          <div>
            <File className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-text-secondary">Select a file from the explorer to start editing</p>
            <p className="text-xs text-text-muted mt-1">or create a new file with the + button</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <EditorTabs />
      <div className="flex-1 overflow-hidden relative">
        {activeFile ? (
          <MonacoEditor
            key={activeFile.id}
            height="100%"
            language={activeFile.language || "plaintext"}
            value={activeFile.content ?? ""}
            theme={MONACO_THEME_OPTIONS.theme}
            options={MONACO_THEME_OPTIONS.options}
            onChange={(value) => {
              if (value !== undefined) updateFileContent(activeFile.id, value);
            }}
          />
        ) : null}
      </div>
      {/* Status bar */}
      {activeFile && (
        <div className="flex items-center justify-between border-t border-border bg-bg-panel px-3 py-0.5 text-xs text-text-muted font-mono">
          <span>{activeFile.name}</span>
          <div className="flex items-center gap-4">
            <span>{activeFile.language || "plaintext"}</span>
            <span>UTF-8</span>
            <button
              onClick={() => saveFile(activeFile.id)}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Save (⌘S)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
