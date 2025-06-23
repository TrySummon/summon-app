import type { UserInfo } from "@/ipc/auth/auth-listeners";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const isServerUrlAvailable = Boolean(process.env.VITE_PUBLIC_SUMMON_HOST);

  // Load user data on mount
  const loadUserData = useCallback(async () => {
    if (!isServerUrlAvailable) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const result = await window.auth.getUser();
      if (result.success && result.user && result.token) {
        setAuthState({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [isServerUrlAvailable]);

  // Authenticate user
  const authenticate = useCallback(async () => {
    if (!isServerUrlAvailable) {
      toast.error("Server URL not configured");
      return;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await window.auth.authenticate();

      if (result.success && result.user && result.token) {
        setAuthState({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
          isLoading: false,
        });
        toast.success(`Welcome back, ${result.user.name}!`);
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        toast.error(result.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      toast.error("Authentication failed");
    }
  }, [isServerUrlAvailable]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await window.auth.logout();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    ...authState,
    authenticate,
    logout,
    isServerUrlAvailable,
    refreshUser: loadUserData,
  };
}
