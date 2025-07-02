import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export function useAuth() {
  const store = useAuthStore();
  const isServerUrlAvailable = Boolean(process.env.PUBLIC_SUMMON_HOST);

  // Load user data on mount
  useEffect(() => {
    store.loadUserData();
  }, [store.loadUserData]);

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    authenticate: store.authenticate,
    logout: store.logout,
    isServerUrlAvailable,
    refreshUser: store.loadUserData,
  };
}
