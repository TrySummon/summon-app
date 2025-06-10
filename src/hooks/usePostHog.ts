import { useCallback } from "react";
import posthog from "posthog-js";

export const usePostHog = () => {
  const captureEvent = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      try {
        if (typeof window !== "undefined" && posthog.__loaded) {
          posthog.capture(eventName, properties);
        }
      } catch (error) {
        console.error("Failed to capture PostHog event:", error);
      }
    },
    [],
  );

  const capturePageView = useCallback(
    (pageName: string, properties?: Record<string, unknown>) => {
      try {
        if (typeof window !== "undefined" && posthog.__loaded) {
          posthog.capture("$pageview", {
            $current_url: pageName,
            ...properties,
          });
        }
      } catch (error) {
        console.error("Failed to capture PostHog pageview:", error);
      }
    },
    [],
  );

  const identify = useCallback(
    (userId: string, properties?: Record<string, unknown>) => {
      try {
        if (typeof window !== "undefined" && posthog.__loaded) {
          posthog.identify(userId, properties);
        }
      } catch (error) {
        console.error("Failed to identify user in PostHog:", error);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    try {
      if (typeof window !== "undefined" && posthog.__loaded) {
        posthog.reset();
      }
    } catch (error) {
      console.error("Failed to reset PostHog:", error);
    }
  }, []);

  return {
    captureEvent,
    capturePageView,
    identify,
    reset,
    isLoaded: typeof window !== "undefined" && posthog.__loaded,
  };
};
