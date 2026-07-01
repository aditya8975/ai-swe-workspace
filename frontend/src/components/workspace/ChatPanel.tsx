"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { ChatMessage, ChatAction, CHAT_ACTION_LABELS } from "@/types";
import { useEditorStore } from "@/store/editorStore";
import { api, getAccessToken } from "@/lib/api";
import { Send, Bot, User, Code2, Loader2, Eraser } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const ACTION_GROUPS: { label: string; actions: ChatAction[] }[] = [
  { label: "Chat", actions: ["chat"] },
  { label: "Code", actions: ["explain", "generate", "refactor", "find_bugs"] },
  { label: "Quality", actions: ["generate_tests", "write_docs", "optimize"] },
];

interface StreamingMessage {
  role: "assistant";
  content: string;
  isStreaming: true;
  action: ChatAction;
}

export default function ChatPanel({ projectId }: { projectId: string }) {
  const { getActiveFile } = useEditorStore();
  const [history, setHistory] = useState<(ChatMessage | StreamingMessage)[]>([]);
  const [input, setInput] = useState("");
  const [action, setAction] = useState<ChatAction>("chat");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    api.get(`/ai/projects/${projectId}/history`).then(({ data }) => {
      setHistory(data.messages);
      setIsLoadingHistory(false);
    }).catch(() => setIsLoadingHistory(false));
  }, [projectId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const activeFile = getActiveFile();

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      action,
      content: text,
      file_id: activeFile?.id ?? null,
      created_at: new Date().toISOString(),
    };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Start the streaming message placeholder
    const streamingMsg: StreamingMessage = { role: "assistant", content: "", isStreaming: true, action };
    setHistory((h) => [...h, streamingMsg]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          file_id: activeFile?.id || null,
          message: text,
          action,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(await response.text());

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.delta) {
              setHistory((h) => {
                const last = h[h.length - 1];
                if ("isStreaming" in last) {
                  return [...h.slice(0, -1), { ...last, content: last.content + json.delta }];
                }
                return h;
              });
            }
            if (json.error) {
              setHistory((h) => [
                ...h.slice(0, -1),
                { id: Date.now().toString(), role: "assistant" as const, action, content: `Error: ${json.error}`, file_id: null, created_at: new Date().toISOString() },
              ]);
            }
            if (json.done) {
              // Replace streaming placeholder with a real ChatMessage
              setHistory((h) => {
                const last = h[h.length - 1];
                if ("isStreaming" in last) {
                  const real: ChatMessage = {
                    id: Date.now().toString(),
                    role: "assistant",
                    action: last.action,
                    content: last.content,
                    file_id: null,
                    created_at: new Date().toISOString(),
                  };
                  return [...h.slice(0, -1), real];
                }
                return h;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setHistory((h) => {
          const last = h[h.length - 1];
          const fallback: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            action,
            content: `Something went wrong: ${err.message}`,
            file_id: null,
            created_at: new Date().toISOString(),
          };
          return "isStreaming" in last ? [...h.slice(0, -1), fallback] : [...h, fallback];
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, action, isStreaming, projectId, getActiveFile]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const activeFile = getActiveFile();

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      {/* Header */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-text-primary">AI Assistant</span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-cursor" />
                Thinking
              </span>
            )}
          </div>
          <button
            onClick={() => setHistory([])}
            title="Clear chat"
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Action selector */}
        <div className="flex flex-wrap gap-1">
          {ACTION_GROUPS.map((group) =>
            group.actions.map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={clsx(
                  "px-2 py-0.5 rounded text-xs transition-colors",
                  action === a
                    ? "bg-accent text-bg font-medium"
                    : "bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                {CHAT_ACTION_LABELS[a]}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active file context indicator */}
      {activeFile && (
        <div className="border-b border-border px-3 py-1.5 flex items-center gap-1.5 text-xs text-text-muted bg-bg-elevated">
          <Code2 className="h-3 w-3 text-accent/60" />
          <span>Context: <span className="text-accent/80 font-mono">{activeFile.name}</span></span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isLoadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot className="h-10 w-10 text-accent/30 mb-3" />
            <p className="text-sm text-text-secondary font-medium">AI ready</p>
            <p className="text-xs text-text-muted mt-1 max-w-48">
              {activeFile ? `Open file: ${activeFile.name}` : "Open a file, then ask AI to explain, refactor, or find bugs."}
            </p>
          </div>
        ) : (
          history.map((msg, i) => (
            <div key={"id" in msg ? msg.id : i} className={clsx("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
              {/* Avatar */}
              <div className={clsx(
                "h-6 w-6 shrink-0 rounded-full flex items-center justify-center mt-0.5",
                msg.role === "user" ? "bg-bg-elevated" : "bg-accent/10"
              )}>
                {msg.role === "user"
                  ? <User className="h-3.5 w-3.5 text-text-secondary" />
                  : <Bot className="h-3.5 w-3.5 text-accent" />}
              </div>

              {/* Bubble */}
              <div className={clsx(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-bg-elevated text-text-primary"
                  : clsx(
                      "bg-bg text-text-primary border",
                      "isStreaming" in msg ? "border-accent/40" : "border-border"
                    )
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-bg-panel [&_pre]:rounded [&_pre]:p-2 [&_code]:text-xs [&_code]:font-mono [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2">
                    <ReactMarkdown>{msg.content || ("isStreaming" in msg ? "" : "…")}</ReactMarkdown>
                    {"isStreaming" in msg && msg.content === "" && (
                      <Loader2 className="h-3 w-3 animate-spin text-accent" />
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.action !== "chat" && (
                  <span className="mt-1 block text-[10px] text-text-muted opacity-60">{CHAT_ACTION_LABELS[msg.action]}</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${CHAT_ACTION_LABELS[action]}… (Enter to send, Shift+Enter for newline)`}
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none bg-bg-elevated border border-border-subtle rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            className="btn-primary p-2 rounded-md"
            title="Send (Enter)"
          >
            {isStreaming
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
