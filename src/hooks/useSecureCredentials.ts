import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AuthCredentials } from "../types/auth";

export function useSecureCredentials(apiId: string) {
  const [credentials, setCredentials] = useState<AuthCredentials | null>(null);
  const [loading, setLoading] = useState(true);

  // Load credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        setLoading(true);
        const savedCredentials = await window.auth.getCredentials(apiId);
        setCredentials(savedCredentials);
      } catch (error) {
        console.error("Error loading credentials:", error);
        toast.error("Failed to load credentials");
      } finally {
        setLoading(false);
      }
    };

    loadCredentials();
  }, [apiId]);

  // Save credentials
  const saveCredentials = useCallback(
    async (newCredentials: AuthCredentials) => {
      try {
        const success = await window.auth.saveCredentials(apiId, newCredentials);
        if (success) {
          setCredentials(newCredentials);
          toast.success("Authentication credentials saved", {
            description: "Your authentication credentials have been securely saved.",
          });
          return true;
        } else {
          toast.error("Failed to save credentials");
          return false;
        }
      } catch (error) {
        console.error("Error saving credentials:", error);
        toast.error("Failed to save credentials");
        return false;
      }
    },
    [apiId]
  );

  // Clear credentials
  const clearCredentials = useCallback(async () => {
    try {
      const success = await window.auth.clearCredentials(apiId);
      if (success) {
        setCredentials(null);
        toast.info("Authentication credentials cleared", {
          description: "Your authentication credentials have been removed.",
        });
        return true;
      } else {
        toast.error("Failed to clear credentials");
        return false;
      }
    } catch (error) {
      console.error("Error clearing credentials:", error);
      toast.error("Failed to clear credentials");
      return false;
    }
  }, [apiId]);

  return {
    credentials,
    loading,
    saveCredentials,
    clearCredentials,
  };
}
