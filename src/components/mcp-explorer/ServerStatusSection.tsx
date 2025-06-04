import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Download } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { downloadMcpZip, showFileInFolder } from "@/helpers/ipc/mcp/mcp-client";

interface ServerStatusSectionProps {
  status: "running" | "starting" | "error" | "stopped";
  url?: string;
  error?: Error | string | null;
  serverName: string;
  transport?: string;
  refreshStatus: () => void;
  mcpId: string;
}

export const ServerStatusSection: React.FC<ServerStatusSectionProps> = ({
  status,
  url,
  error,
  serverName,
  transport,
  refreshStatus,
  mcpId,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await downloadMcpZip(mcpId);

      if (result.success && result.data?.success) {
        // Open folder and highlight the downloaded file
        if (result.data.filePath) {
          await showFileInFolder(result.data.filePath);
        }
      } else {
        setDownloadError(
          result.data?.message || result.message || "Download failed",
        );
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Download failed",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === "running") {
    return (
      <div className="space-y-6">
        {/* Server Status Section */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{serverName} MCP Server</h2>
            <p className="text-muted-foreground text-sm">
              Transport: {transport}
            </p>
          </div>
          <Badge className="border-green-500/20 bg-green-500/10 text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-400">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500"></span>
            Running
          </Badge>
        </div>

        {url ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <code className="font-mono text-sm">{url}</code>
            <div className="flex items-center gap-2">
              <CopyButton content={url || ""} />
            </div>
          </div>
        ) : null}

        {downloadError && (
          <Alert variant="destructive" className="border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Download Error</AlertTitle>
            <AlertDescription>{downloadError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={refreshStatus}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Status
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={isDownloading}
          >
            <Download className="h-3 w-3" />
            {isDownloading ? "Downloading..." : "Download MCP"}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "starting") {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold">MCP Server Status</h2>
        <Alert className="border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/5">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-300">
            Server is starting
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            Your MCP server is currently starting up. Please wait a moment...
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={refreshStatus}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold">MCP Server Status</h2>
        <Alert variant="destructive" className="border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Server error</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : error
                ? String(error)
                : "There was an error starting your MCP server."}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button onClick={refreshStatus} variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  // Default case: server is stopped
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">MCP Server Status</h2>
      <Alert className="border-muted bg-muted/30">
        <AlertCircle className="text-muted-foreground h-4 w-4" />
        <AlertTitle className="text-foreground">
          Server is not running
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Your MCP server is currently stopped. Start the server to access it.
        </AlertDescription>
      </Alert>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={refreshStatus}
          variant="outline"
          size="sm"
          className="gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Status
        </Button>
      </div>
    </div>
  );
};
