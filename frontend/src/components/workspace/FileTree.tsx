"use client";

import { useState } from "react";
import clsx from "clsx";
import { FileTreeNode, FileNodeType } from "@/types";
import { useEditorStore } from "@/store/editorStore";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Plus, FilePlus, FolderPlus, Trash2,
} from "lucide-react";

// Language-to-icon color mapping
const LANGUAGE_COLORS: Record<string, string> = {
  python: "text-blue-400", typescript: "text-blue-300", javascript: "text-yellow-300",
  json: "text-yellow-200", html: "text-orange-400", css: "text-purple-400",
  markdown: "text-text-secondary", shell: "text-success", go: "text-info",
  rust: "text-orange-500", sql: "text-pink-400",
};

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "python", ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", html: "html", css: "css", md: "markdown", sh: "shell",
    go: "go", rs: "rust", sql: "sql",
  };
  return LANGUAGE_COLORS[map[ext || ""] || ""] || "text-text-secondary";
}

interface NewItemState {
  parentId: string | null;
  type: FileNodeType;
}

function NewItemInput({ parentId, type, onDone }: { parentId: string | null; type: FileNodeType; onDone: () => void }) {
  const { createFile } = useEditorStore();
  const [name, setName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { onDone(); return; }
    try {
      const file = await createFile(name.trim(), type, parentId);
      if (type === "file") useEditorStore.getState().openFile(file.id);
    } finally {
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1 px-2 py-0.5">
      {type === "folder" ? <Folder className="h-3.5 w-3.5 shrink-0 text-accent/70" /> : <File className="h-3.5 w-3.5 shrink-0 text-text-muted" />}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        className="flex-1 bg-bg-elevated border border-accent/50 rounded px-1 py-0.5 text-xs text-text-primary outline-none"
        placeholder={type === "folder" ? "folder name" : "filename"}
      />
    </form>
  );
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  onNewItem: (parentId: string, type: FileNodeType) => void;
}

function TreeNode({ node, depth, onNewItem }: TreeNodeProps) {
  const { openFile, deleteFile, activeFileId, dirtyFileIds } = useEditorStore();
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const isActive = activeFileId === node.id;
  const isDirty = dirtyFileIds.has(node.id);
  const isFolder = node.type === "folder";
  const indent = depth * 12;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${node.name}"?`)) return;
    await deleteFile(node.id);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => isFolder ? setExpanded(!expanded) : openFile(node.id)}
        onKeyDown={(e) => e.key === "Enter" && (isFolder ? setExpanded(!expanded) : openFile(node.id))}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={clsx(
          "group flex items-center gap-1 py-0.5 px-2 cursor-pointer select-none text-xs rounded",
          isActive ? "bg-accent/15 text-text-primary" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        )}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {/* Expand chevron */}
        {isFolder ? (
          <span className="shrink-0 w-3.5 text-text-muted">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        ) : <span className="w-3.5 shrink-0" />}

        {/* Icon */}
        {isFolder ? (
          expanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent/80" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-accent/80" />
        ) : (
          <File className={clsx("h-3.5 w-3.5 shrink-0", getFileColor(node.name))} />
        )}

        {/* Name */}
        <span className={clsx("flex-1 truncate font-mono", isDirty && "italic")}>{node.name}</span>

        {/* Dirty indicator */}
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}

        {/* Actions on hover */}
        {hovered && (
          <span className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isFolder && (
              <>
                <button onClick={() => onNewItem(node.id, "file")} className="p-0.5 hover:text-text-primary" title="New file">
                  <FilePlus className="h-3 w-3" />
                </button>
                <button onClick={() => onNewItem(node.id, "folder")} className="p-0.5 hover:text-text-primary" title="New folder">
                  <FolderPlus className="h-3 w-3" />
                </button>
              </>
            )}
            <button onClick={handleDelete} className="p-0.5 hover:text-danger" title="Delete">
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && expanded && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onNewItem={onNewItem} />
      ))}
    </div>
  );
}

export default function FileTree() {
  const { tree, isLoadingTree } = useEditorStore();
  const [newItem, setNewItem] = useState<NewItemState | null>(null);

  function handleNewItem(parentId: string | null, type: FileNodeType) {
    setNewItem({ parentId, type });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNewItem(null, "file")}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            title="New file"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleNewItem(null, "folder")}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoadingTree ? (
          <div className="flex justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
          </div>
        ) : (
          <>
            {newItem?.parentId === null && (
              <NewItemInput
                parentId={null}
                type={newItem.type}
                onDone={() => setNewItem(null)}
              />
            )}
            {tree.length === 0 && !newItem ? (
              <div className="px-3 py-4 text-xs text-text-muted text-center">
                No files yet.
                <br />
                <button onClick={() => handleNewItem(null, "file")} className="text-accent hover:text-accent-hover mt-1">
                  Create one
                </button>
              </div>
            ) : (
              tree.map((node) => (
                <div key={node.id}>
                  <TreeNode node={node} depth={0} onNewItem={handleNewItem} />
                  {newItem?.parentId === node.id && (
                    <NewItemInput
                      parentId={node.id}
                      type={newItem.type}
                      onDone={() => setNewItem(null)}
                    />
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
