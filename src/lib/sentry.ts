import * as Sentry from "@sentry/electron/main";
import { app } from "electron";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn(
      "SENTRY_DSN not found in environment variables. Sentry will not be initialized.",
    );
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || "production",
    release: app?.getVersion() || "unknown",

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
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        node: process.versions.node,
      },
    },
  });

  console.log("Sentry initialized successfully");
}

export { Sentry };
