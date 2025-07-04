import React, { useState } from "react";
import { Prompt } from "@modelcontextprotocol/sdk/types.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { getMcpPrompt } from "@/ipc/mcp/mcp-client";

interface UsePromptDialogProps {
  prompt: Prompt | null;
  mcpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PromptResponse {
  success: boolean;
  result?: {
    description?: string;
    messages?: Array<{
      role: string;
      content: {
        type: string;
        text?: string;
      };
    }>;
  };
  error?: string;
}

export const UsePromptDialog: React.FC<UsePromptDialogProps> = ({
  prompt,
  mcpId,
  open,
  onOpenChange,
}) => {
  const [arguments_, setArguments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PromptResponse | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  const handleArgumentChange = (name: string, value: string) => {
    setArguments((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUsePrompt = async () => {
    if (!prompt) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Call the prompt
      const result = await getMcpPrompt(mcpId, prompt.name, arguments_);

      setResponse(result);
      // Switch to response tab to show the result
      setActiveTab("response");
    } catch (error) {
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : "Failed to use prompt",
      });
      // Switch to response tab to show the error
      setActiveTab("response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setArguments({});
      setResponse(null);
      setActiveTab("input");
    } else if (prompt) {
      setResponse(null);
      setActiveTab("input");
      // Initialize arguments with empty strings
      const initialArgs: Record<string, string> = {};
      if (prompt.arguments) {
        prompt.arguments.forEach((arg) => {
          initialArgs[arg.name] = "";
        });
      }
      setArguments(initialArgs);
    }
    onOpenChange(newOpen);
  };

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden sm:max-w-none">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <MessageSquare className="text-primary h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span>Render Prompt</span>
              <span className="text-muted-foreground font-mono text-sm font-normal">
                {prompt.name}
              </span>
            </div>
          </DialogTitle>
          {prompt.description && (
            <p className="text-muted-foreground text-sm">
              {prompt.description}
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
                value="input"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Template Variables
              </TabsTrigger>
              <TabsTrigger
                value="response"
                disabled={!response}
                className="data-[state=active]:bg-background disabled:opacity-50 data-[state=active]:shadow-sm"
              >
                Rendered Output
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="input"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <label className="text-sm font-medium">
                  Template Variables
                </label>

                {prompt.arguments && prompt.arguments.length > 0 ? (
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {prompt.arguments.map((arg) => (
                      <div key={arg.name} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={arg.name}
                            className="font-mono text-xs"
                          >
                            {arg.name}
                          </Label>
                          {arg.required && (
                            <Badge
                              variant="outline"
                              className="border-red-500/50 bg-red-500/10 font-mono text-xs text-red-500"
                            >
                              required
                            </Badge>
                          )}
                        </div>
                        {arg.description && (
                          <p className="text-muted-foreground text-xs">
                            {arg.description}
                          </p>
                        )}
                        <Input
                          id={arg.name}
                          placeholder={`Enter value for ${arg.name}...`}
                          value={arguments_[arg.name] || ""}
                          onChange={(e) =>
                            handleArgumentChange(arg.name, e.target.value)
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/30 flex flex-1 items-center justify-center rounded-lg border">
                    <p className="text-muted-foreground text-sm">
                      This prompt template has no variables.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-shrink-0 items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  {response && (
                    <div className="flex items-center gap-2">
                      {response.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Rendered</span>
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
                  onClick={handleUsePrompt}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6"
                  size="default"
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? "Rendering..." : "Render Prompt"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="response"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              {response && (
                <>
                  <div className="flex flex-shrink-0 items-center justify-between">
                    <label className="text-sm font-medium">
                      Rendered Output
                    </label>
                    {response.success ? (
                      <Badge
                        variant="outline"
                        className="border-green-600/30 bg-green-50 text-green-600 dark:bg-green-950/20"
                      >
                        Rendered
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-red-600/30 bg-red-50 text-red-600 dark:bg-red-950/20"
                      >
                        Error
                      </Badge>
                    )}
                  </div>

                  <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg border p-3">
                    <CodeEditor
                      defaultValue={
                        response ? JSON.stringify(response, null, 2) : ""
                      }
                      language="json"
                      height="100%"
                      readOnly
                      className="h-full"
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
