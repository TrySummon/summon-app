import posthog from "posthog-js";
import packageJson from "../../package.json";
import { v4 as uuidv4 } from "uuid";

// Generate or retrieve persistent user ID
export const getUserId = (): string => {
  const storageKey = "summon_user_id";

  try {
    // Try to get existing user ID from localStorage
    let userId = localStorage.getItem(storageKey);

    if (!userId) {
      // Generate new UUID if none exists
      userId = uuidv4();
      localStorage.setItem(storageKey, userId);
    }

    return userId;
  } catch (error) {
    // Fallback if localStorage is not available
    console.warn(
      "Unable to access localStorage for user ID, using session-based ID:",
      error,
    );
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

export const initPostHog = () => {
  // Check if analytics is disabled
  if (process.env.DISABLE_ANALYTICS === "true") {
    // Mock PostHog object
    posthog.__loaded = true;
    posthog.init = () => posthog;
    posthog.capture = () => undefined;
    posthog.identify = () => undefined;
    posthog.register = () => undefined;
    posthog.reset = () => undefined;
    console.log("Analytics disabled - PostHog mocked");
    return;
  }

  // Only initialize PostHog in the renderer process and if we have the required env vars
  const posthogKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.VITE_PUBLIC_POSTHOG_HOST;

  if (typeof window !== "undefined" && posthogKey) {
    try {
      const userId = getUserId();

      posthog.init(posthogKey, {
        api_host: posthogHost || "https://eu.i.posthog.com",
        // Important for Electron apps - disable automatic pageview capture
        capture_pageview: false,
        // Disable automatic session recording for privacy
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
          },
        },
        // Disable automatic feature flag calls on init
        bootstrap: {},
        // Important for Electron - handle CSP issues
        cross_subdomain_cookie: false,
        // Use localStorage for persistence to maintain user identity across sessions
        persistence: "localStorage",
        // Disable automatic error tracking
        capture_performance: false,
        // Custom configuration for Electron
        loaded: () => {
          // Identify the user with consistent ID
          posthog.identify(userId, {
            app_type: "Summon",
            app_version: packageJson.version,
          });
          console.log("PostHog loaded successfully with user ID:", userId);
        },
        // Handle errors gracefully
        on_xhr_error: (failedRequest: unknown) => {
          console.warn("PostHog request failed:", failedRequest);
        },
      });

      // Register global properties
      posthog.register({
        app_type: "Summon",
        app_version: packageJson.version,
      });
    } catch (error) {
      console.error("Failed to initialize PostHog:", error);
    }
  } else {
    console.warn(
      "PostHog not initialized: missing VITE_PUBLIC_POSTHOG_KEY or not in browser environment",
    );
  }
};

// Helper function to safely capture events
export const captureEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(eventName, properties);
    }
  } catch (error) {
    console.error("Failed to capture PostHog event:", error);
  }
};

// Helper function to safely capture page views
export const capturePageView = (
  pageName: string,
  properties?: Record<string, unknown>,
) => {
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
};

// Helper function to identify authenticated users
export const identifyUser = (
  userId: string,
  userInfo: {
    email?: string;
    name?: string;
    image?: string;
  },
) => {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      // Use email as the primary identifier, fallback to UUID
      const distinctId = userInfo.email || userId;
      
      posthog.identify(distinctId, {
        email: userInfo.email,
        name: userInfo.name,
        image: userInfo.image,
        app_type: "Summon",
        app_version: packageJson.version,
        user_id: userId, // Keep original UUID as a property
      });
      
      console.log("PostHog user identified:", {
        distinctId,
        email: userInfo.email,
        name: userInfo.name,
      });
    }
  } catch (error) {
    console.error("Failed to identify user in PostHog:", error);
  }
};

// Helper function to reset PostHog on logout
export const resetPostHogUser = () => {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.reset();
      
      // Re-identify with the anonymous UUID
      const userId = getUserId();
      posthog.identify(userId, {
        app_type: "Summon",
        app_version: packageJson.version,
      });
      
      console.log("PostHog user reset and re-identified with UUID:", userId);
    }
  } catch (error) {
    console.error("Failed to reset PostHog user:", error);
  }
};

export default posthog;
