import * as Sentry from "@sentry/electron/renderer";

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional", context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional", context);
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>,
) {
  Sentry.addBreadcrumb({
    message,
    category: category || "custom",
    level: "info",
    data,
  });
}

/**
 * Set user context
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
}

/**
 * Set additional tags
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Set additional context
 */
export function setContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, context);
}
