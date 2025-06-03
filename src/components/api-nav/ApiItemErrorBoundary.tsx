import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiItemErrorBoundaryProps {
  children: ReactNode;
  apiId: string;
}

interface ApiItemErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ApiItemErrorBoundary extends Component<
  ApiItemErrorBoundaryProps,
  ApiItemErrorBoundaryState
> {
  constructor(props: ApiItemErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ApiItemErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Error in API Item (${this.props.apiId}):`, error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleDeleteApi = async (): Promise<void> => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete this API?",
      );
      if (confirmed) {
        const result = await window.openapi.db.deleteApi(this.props.apiId);
        if (result.success) {
          // Reload the page or update the UI as needed
          window.location.reload();
        } else {
          console.error("Failed to delete API:", result.message);
          alert(`Failed to delete API: ${result.message}`);
        }
      }
    } catch (error) {
      console.error("Error deleting API:", error);
      alert("An error occurred while deleting the API");
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="text-destructive flex items-center justify-between gap-2 p-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            <div>
              <p className="font-semibold">Can't load API.</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 h-3 w-3 p-0"
            onClick={this.handleDeleteApi}
            title="Delete API"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
