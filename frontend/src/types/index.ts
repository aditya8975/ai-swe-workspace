export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_email_verified: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  github_repo_url: string | null;
  github_default_branch: string;
  created_at: string;
  updated_at: string;
}

export type FileNodeType = "file" | "folder";

export interface ProjectFile {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  type: FileNodeType;
  content: string | null;
  language: string | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface FileTreeNode {
  id: string;
  parent_id: string | null;
  name: string;
  type: FileNodeType;
  children: FileTreeNode[];
}

export type ChatAction =
  | "chat"
  | "explain"
  | "generate"
  | "refactor"
  | "find_bugs"
  | "generate_tests"
  | "write_docs"
  | "optimize";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  action: ChatAction;
  content: string;
  file_id: string | null;
  created_at: string;
}

export const CHAT_ACTION_LABELS: Record<ChatAction, string> = {
  chat: "Ask",
  explain: "Explain",
  generate: "Generate",
  refactor: "Refactor",
  find_bugs: "Find Bugs",
  generate_tests: "Generate Tests",
  write_docs: "Write Docs",
  optimize: "Optimize",
};
