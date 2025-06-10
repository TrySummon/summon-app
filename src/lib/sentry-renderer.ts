import * as Sentry from "@sentry/electron/renderer";

export function initSentryRenderer() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",

    // Set sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // Configure beforeSend to filter out sensitive data
    beforeSend(event) {
      // Filter out sensitive information from file paths
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach((frame) => {
              if (frame.filename) {
                frame.filename = frame.filename.replace(
                  /\/Users\/[^/]+/,
                  "/Users/***",
                );
              }
            });
          }
        });
      }

      return event;
    },

    // Add tags for better error categorization
    initialScope: {
      tags: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        process: "renderer",
      },
    },
  });
}

export { Sentry };
