import { create } from "zustand";
import { User } from "@/types";
import { api, setTokens, clearTokens, getAccessToken } from "@/lib/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  init: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const { data } = await api.get<User>("/auth/me");
      set({ user: data, isInitialized: true });
    } catch {
      clearTokens();
      set({ user: null, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.access_token, data.refresh_token);
      set({ user: data.user, isLoading: false });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Login failed. Check your credentials.";
      set({ error: detail, isLoading: false });
      throw err;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/register", { email, password, full_name: fullName });
      // Auto-login after registration for a smooth first-run experience
      await get().login(email, password);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Registration failed.";
      set({ error: typeof detail === "string" ? detail : "Registration failed.", isLoading: false });
      throw err;
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
