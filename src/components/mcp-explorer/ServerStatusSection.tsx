import React, { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  RefreshCw,
  Download,
  FileJson,
  Rocket,
  Edit2,
} from "lucide-react";
import CopyButton from "@/components/CopyButton";
import {
  downloadMcpZip,
  showFileInFolder,
  openUserDataMcpJsonFile,
} from "@/ipc/mcp/mcp-client";
import WaitlistButton from "../tool-sidebar/WaitlistButton";

interface ServerStatusSectionProps {
  status: "running" | "starting" | "error" | "stopped";
  url?: string;
  error?: Error | string | null;
  serverName: string;
  isExternal?: boolean;
  refreshStatus: () => void;
  mcpId: string;
  onEditName?: (newName: string) => void;
}

export const ServerStatusSection: React.FC<ServerStatusSectionProps> = ({
  status,
  url,
  error,
  serverName,
  refreshStatus,
  mcpId,
  isExternal,
  onEditName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

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

  const handleEditStart = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.focus();
        // Set cursor at the end
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(editRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 0);
  };

  const handleEditSave = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue !== serverName && onEditName) {
      onEditName(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave(e.currentTarget.textContent || "");
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const canEdit = !isExternal && onEditName;

  if (status === "running") {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Server Status Section */}

          <div className="flex items-center justify-between">
            <div className="group flex items-center gap-2">
              {isEditing ? (
                <div
                  ref={editRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={handleKeyDown}
                  onBlur={(e) =>
                    handleEditSave(e.currentTarget.textContent || "")
                  }
                  className="border-b border-dashed text-xl font-bold outline-none"
                >
                  {serverName}
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{serverName}</h2>
                  {canEdit && (
                    <Button
                      onClick={handleEditStart}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isExternal ? (
                <Button
                  onClick={() => openUserDataMcpJsonFile()}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <FileJson className="h-3 w-3" />
                  Edit
                </Button>
              ) : (
                <>
                  <WaitlistButton
                    featureName="MCP Server Deployment"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Rocket className="h-3 w-3" />
                    Deploy
                  </WaitlistButton>
                  <Button
                    onClick={handleDownload}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={isDownloading}
                  >
                    <Download className="h-3 w-3" />
                    {isDownloading ? "Downloading..." : "Download"}
                  </Button>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={refreshStatus} variant="ghost" size="sm">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Status</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {url ? (
            <div className="flex items-center justify-between rounded-md border p-1.5">
              <div className="flex items-center gap-2">
                <Badge className="border-green-500/20 bg-green-500/10 text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-400">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500"></span>
                  Running
                </Badge>
                <code className="font-mono text-sm">{url}</code>
              </div>
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
        </div>
      </TooltipProvider>
    );
  }

  if (status === "starting") {
    return (
      <TooltipProvider>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">MCP Server Status</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={refreshStatus}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Status</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Alert className="border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/5">
            <AlertCircle className="h-4 w-4 !text-yellow-600 dark:text-yellow-500" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-300">
              Server is starting
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              Your MCP server is currently starting up. Please wait a moment...
            </AlertDescription>
          </Alert>
        </div>
      </TooltipProvider>
    );
  }

  if (status === "error") {
    return (
      <TooltipProvider>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">MCP Server Status</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={refreshStatus}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Status</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
        </div>
      </TooltipProvider>
    );
  }

  // Default case: server is stopped
  return (
    <TooltipProvider>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">MCP Server Status</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={refreshStatus}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh Status</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Alert className="border-muted bg-muted/30">
          <AlertCircle className="text-muted-foreground h-4 w-4" />
          <AlertTitle className="text-foreground">
            Server is not running
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Your MCP server is currently stopped. Start the server to access it.
          </AlertDescription>
        </Alert>
      </div>
    </TooltipProvider>
  );
};
