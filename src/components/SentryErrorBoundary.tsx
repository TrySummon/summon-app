import React, { Component, ReactNode } from "react";
import * as Sentry from "@sentry/electron/renderer";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SentryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to Sentry
    Sentry.withScope((scope) => {
      scope.setTag("errorBoundary", true);
      scope.setContext("errorInfo", {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-background flex min-h-screen items-center justify-center">
            <div className="mx-auto max-w-md text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h1 className="text-foreground mb-2 text-2xl font-bold">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-4">
                An unexpected error occurred. The error has been reported and
                we'll look into it.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
              >
                Reload Application
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
