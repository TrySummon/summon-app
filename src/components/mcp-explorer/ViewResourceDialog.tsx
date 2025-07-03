import React, { useState, useEffect } from "react";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, AlertCircle, CheckCircle, File, Download } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { readMcpResource } from "@/ipc/mcp/mcp-client";

interface ViewResourceDialogProps {
  resource: Resource | null;
  mcpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

interface ResourceResponse {
  success: boolean;
  result?: {
    contents?: ResourceContent[];
  };
  error?: string;
}

export const ViewResourceDialog: React.FC<ViewResourceDialogProps> = ({
  resource,
  mcpId,
  open,
  onOpenChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ResourceResponse | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  const handleViewResource = async () => {
    if (!resource) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Read the resource
      const result = await readMcpResource(mcpId, resource.uri);

      setResponse(result);
      // Switch to content tab if successful
      if (result.success) {
        setActiveTab("content");
      }
    } catch (error) {
      setResponse({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to read resource",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setResponse(null);
      setActiveTab("info");
    } else if (resource) {
      setResponse(null);
      setActiveTab("info");
    }
    onOpenChange(newOpen);
  };

  // Auto-load resource when dialog opens
  useEffect(() => {
    if (open && resource && !response && !isLoading) {
      handleViewResource();
    }
  }, [open, resource]);

  if (!resource) return null;

  const content = response?.result?.contents?.[0];
  const isTextContent = content?.text !== undefined;
  const isBinaryContent = content?.blob !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden sm:max-w-none">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <File className="text-primary h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span>View Resource</span>
              <span className="text-muted-foreground font-mono text-sm font-normal">
                {resource.name}
              </span>
            </div>
          </DialogTitle>
          {resource.description && (
            <p className="text-muted-foreground text-sm">
              {resource.description}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden pt-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="info"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Resource Info
              </TabsTrigger>
              <TabsTrigger
                value="content"
                disabled={!response || !response.success}
                className="data-[state=active]:bg-background disabled:opacity-50 data-[state=active]:shadow-sm"
              >
                Content
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="info"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URI</label>
                    <div className="bg-muted/30 rounded-lg border p-3">
                      <code className="font-mono text-sm break-all">
                        {resource.uri}
                      </code>
                    </div>
                  </div>

                  {resource.mimeType && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">MIME Type</label>
                      <div className="bg-muted/30 rounded-lg border p-3">
                        <Badge variant="outline" className="font-mono">
                          {resource.mimeType}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {resource.size ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Size</label>
                      <div className="bg-muted/30 rounded-lg border p-3">
                        <span className="font-mono text-sm">
                          {resource.size.toLocaleString()} bytes
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {resource.description && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <div className="bg-muted/30 rounded-lg border p-3">
                        <p className="text-sm">{resource.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  {response && (
                    <div className="flex items-center gap-2">
                      {response.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Loaded</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Error</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleViewResource}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6"
                  size="default"
                >
                  <Eye className="h-4 w-4" />
                  {isLoading ? "Loading..." : "Load Resource"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="content"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              {response && response.success && content ? (
                <>
                  <div className="flex flex-shrink-0 items-center justify-between">
                    <label className="text-sm font-medium">
                      Resource Content
                    </label>
                    <div className="flex items-center gap-2">
                      {content.mimeType && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {content.mimeType}
                        </Badge>
                      )}
                      {isTextContent && (
                        <Badge
                          variant="outline"
                          className="border-green-600/30 bg-green-50 text-green-600 dark:bg-green-950/20"
                        >
                          Text
                        </Badge>
                      )}
                      {isBinaryContent && (
                        <Badge
                          variant="outline"
                          className="border-blue-600/30 bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                        >
                          Binary
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg border p-3">
                    {isTextContent ? (
                      <CodeEditor
                        defaultValue={content.text || ""}
                        language={
                          content.mimeType?.includes("json")
                            ? "json"
                            : content.mimeType?.includes("xml")
                              ? "xml"
                              : content.mimeType?.includes("html")
                                ? "html"
                                : content.mimeType?.includes("css")
                                  ? "css"
                                  : content.mimeType?.includes("javascript")
                                    ? "javascript"
                                    : content.mimeType?.includes("python")
                                      ? "python"
                                      : "text"
                        }
                        height="100%"
                        readOnly
                        className="h-full"
                      />
                    ) : isBinaryContent ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <Download className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                          <p className="mb-2 text-sm font-medium">
                            Binary Content
                          </p>
                          <p className="text-muted-foreground mb-4 text-xs">
                            This resource contains binary data that cannot be
                            displayed directly.
                          </p>
                          <p className="text-muted-foreground font-mono text-xs">
                            {content.blob?.length
                              ? `${content.blob.length} base64 characters`
                              : "No data"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          No content available
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : response && !response.success ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                    <p className="mb-2 text-sm font-medium">
                      Failed to load resource
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {response.error || "An unknown error occurred"}
                    </p>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
