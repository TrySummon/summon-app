import React, { useState, useEffect, useRef } from "react";
import { getMcpLogs } from "@/ipc/mcp/mcp-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Trash2 } from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  mcpId: string;
  isExternal: boolean;
}

interface LogsListProps {
  mcpId: string;
}

const LogsList: React.FC<LogsListProps> = ({ mcpId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const previousLogCountRef = useRef(0);

  const fetchLogs = async () => {
    try {
      const response = await getMcpLogs(mcpId);
      if (response.success && response.data) {
        setLogs(response.data);
      } else {
        setError(response.message || "Failed to fetch logs");
      }
    } catch (err) {
      setError("Error fetching logs: " + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    previousLogCountRef.current = 0;
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [mcpId]);

  // Auto-scroll only when new logs are added and auto-scroll is enabled
  useEffect(() => {
    if (autoScroll && logs.length > previousLogCountRef.current) {
      scrollToBottom();
    }
    previousLogCountRef.current = logs.length;
  }, [logs, autoScroll]);

  // Auto-refresh logs every 5 seconds (but don't auto-scroll on refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [mcpId]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "text-destructive";
      case "warn":
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      case "debug":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatLogLevel = (level: string) => {
    return `[${level.toUpperCase()}]`;
  };

  if (isLoading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <div className="text-muted-foreground text-xs">Loading logs...</div>
      </div>
    );
  }
  return (
    <div className="flex flex-grow flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Logs ({logs.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <div className="flex items-center gap-2">
            <label
              htmlFor="auto-scroll"
              className="text-muted-foreground cursor-pointer text-xs"
            >
              Auto-scroll
            </label>
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              className="scale-75"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="h-6 px-2 text-xs"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border-destructive/20 rounded border p-2 text-xs">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <ScrollArea
        className="bg-sidebar h-0 flex-grow rounded border p-2"
        ref={scrollAreaRef}
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground flex h-20 items-center justify-center">
            <p className="text-xs">No logs available</p>
          </div>
        ) : (
          <div className="space-y-0">
            {logs.map((log, index) => (
              <div
                key={index}
                className="hover:bg-sidebar-accent text-sidebar-foreground flex items-start gap-2 px-2 py-1 font-mono text-xs transition-colors"
              >
                <span className="text-muted-foreground w-16 shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`w-14 shrink-0 ${getLevelColor(log.level)}`}>
                  {formatLogLevel(log.level)}
                </span>
                <p className="text-sidebar-foreground flex-1 leading-tight break-words">
                  {log.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LogsList;
