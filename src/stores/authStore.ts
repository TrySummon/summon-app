import { create } from "zustand";
import type { UserInfo } from "@/ipc/auth/auth-listeners";
import { toast } from "sonner";
import { identifyUser, resetPostHogUser } from "@/lib/posthog";

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthStore extends AuthState {
  // Actions
  setAuthState: (state: Partial<AuthState>) => void;
  setLoading: (isLoading: boolean) => void;
  setUser: (user: UserInfo | null, token: string | null) => void;
  clearAuth: () => void;

  // API methods
  loadUserData: () => Promise<void>;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
}

const createDefaultState = (): AuthState => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
});

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...createDefaultState(),

  setAuthState: (state) => {
    set((current) => ({ ...current, ...state }));
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setUser: (user, token) => {
    set({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading: false,
    });
    
    // Identify user in PostHog with their email
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
        image: user.image,
      });
    }
  },

  clearAuth: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Reset PostHog user on logout
    resetPostHogUser();
  },

  loadUserData: async () => {
    const isServerUrlAvailable = Boolean(process.env.PUBLIC_SUMMON_HOST);

    if (!isServerUrlAvailable) {
      set({ isLoading: false });
      return;
    }

    try {
      const result = await window.auth.getUser();
      if (result.success && result.user && result.token) {
        get().setUser(result.user, result.token);
      } else {
        get().clearAuth();
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      get().clearAuth();
    }
  },

  authenticate: async () => {
    const isServerUrlAvailable = Boolean(process.env.PUBLIC_SUMMON_HOST);

    if (!isServerUrlAvailable) {
      toast.error("Server URL not configured");
      return;
    }

    set({ isLoading: true });

    try {
      const result = await window.auth.authenticate();

      if (result.success && result.user && result.token) {
        get().setUser(result.user, result.token);
        toast.success(`Welcome back, ${result.user.name}!`);
      } else {
        set({ isLoading: false });
        toast.error(result.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      set({ isLoading: false });
      toast.error("Authentication failed");
    }
  },

  logout: async () => {
    try {
      await window.auth.logout();
      get().clearAuth(); // This will also call resetPostHogUser()
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  },
}));
