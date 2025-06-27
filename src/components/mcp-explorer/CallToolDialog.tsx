import React, { useState } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, AlertCircle, CheckCircle, Shuffle } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { callMcpTool } from "@/ipc/mcp/mcp-client";
import { faker } from "@faker-js/faker";
import { JSONSchema7 } from "json-schema";
import { JSONSchemaFaker } from "json-schema-faker";
import { toast } from "sonner";

// Configure JSON Schema Faker
JSONSchemaFaker.extend("faker", () => faker);

// Configure options for better compatibility
JSONSchemaFaker.option({
  // Don't fail on unknown formats, just use string
  failOnInvalidFormat: false,
  // Don't fail on unknown types, use string as fallback
  failOnInvalidTypes: false,
  // Use more realistic fake data
  useDefaultValue: true,
  // Handle edge cases gracefully
  ignoreMissingRefs: true,
});

interface CallToolDialogProps {
  tool: Tool | null;
  mcpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ToolResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

export const CallToolDialog: React.FC<CallToolDialogProps> = ({
  tool,
  mcpId,
  open,
  onOpenChange,
}) => {
  const [inputJson, setInputJson] = useState("{}");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ToolResponse | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  // Generate fake data based on tool schema
  const generateFakeData = async (): Promise<void> => {
    if (!tool?.inputSchema) {
      setInputJson("{}");
      return;
    }

    try {
      const fakeData = await JSONSchemaFaker.resolve(
        tool.inputSchema as JSONSchema7,
      );
      setInputJson(JSON.stringify(fakeData, null, 2));
    } catch (error) {
      toast.error(`Failed to generate fake data: ${error}`);
    }
  };

  const handleCall = async () => {
    if (!tool) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Parse the JSON input
      const args = JSON.parse(inputJson);

      // Call the tool
      const result = await callMcpTool(mcpId, tool.name, args);

      setResponse(result);
      // Switch to response tab to show the result
      setActiveTab("response");
    } catch (error) {
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : "Invalid JSON input",
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
      setInputJson("{}");
      setResponse(null);
      setActiveTab("input");
    } else if (tool) {
      setResponse(null);
      setActiveTab("input");
    }
    onOpenChange(newOpen);
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden sm:max-w-none">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Play className="text-primary h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span>Call Tool</span>
              <span className="text-muted-foreground font-mono text-sm font-normal">
                {tool.name}
              </span>
            </div>
          </DialogTitle>
          {tool.description && (
            <p className="text-muted-foreground text-sm">{tool.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden pt-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="input"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Input
              </TabsTrigger>
              <TabsTrigger
                value="schema"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Schema
              </TabsTrigger>
              <TabsTrigger
                value="response"
                disabled={!response}
                className="data-[state=active]:bg-background disabled:opacity-50 data-[state=active]:shadow-sm"
              >
                Response
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="input"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Payload</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateFakeData}
                    className="flex items-center gap-2 font-mono text-xs"
                  >
                    <Shuffle className="h-3 w-3" />
                    Generate Fake Data
                  </Button>
                </div>
                <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg border p-3">
                  <CodeEditor
                    value={inputJson}
                    defaultValue={inputJson}
                    onChange={setInputJson}
                    language="json"
                    height="100%"
                    className="h-full"
                  />
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  {response && (
                    <div className="flex items-center gap-2">
                      {response.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Success</span>
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
                  onClick={handleCall}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6"
                  size="default"
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? "Calling..." : "Call Tool"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="schema"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              <div className="flex flex-shrink-0 items-center justify-between">
                <label className="text-sm font-medium">Input Schema</label>
                <Badge variant="outline" className="font-mono text-xs">
                  JSON Schema
                </Badge>
              </div>
              <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg border p-3">
                <CodeEditor
                  defaultValue={JSON.stringify(tool.inputSchema || {}, null, 2)}
                  language="json"
                  height="100%"
                  readOnly
                  className="h-full"
                />
              </div>
            </TabsContent>

            <TabsContent
              value="response"
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
            >
              {response && (
                <>
                  <div className="flex flex-shrink-0 items-center justify-between">
                    <label className="text-sm font-medium">Tool Response</label>
                    {response.success ? (
                      <Badge
                        variant="outline"
                        className="border-green-600/30 bg-green-50 text-green-600 dark:bg-green-950/20"
                      >
                        Success
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
