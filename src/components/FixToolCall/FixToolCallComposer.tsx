import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp } from "lucide-react";
import CodeMirrorEditor from "@/components/CodeEditor";
import { EditorView } from "codemirror";
import { Extension } from "@codemirror/state";
import { placeholder, keymap } from "@codemirror/view";
import { usePostHog } from "@/hooks/usePostHog";
import { extractMentions, MentionData } from "@/components/CodeEditor";
import { AttachmentsDisplay } from "../AgentSidebar/AttachmentsDisplay";
import { cn } from "@/utils/tailwind";
import { usePlaygroundStore } from "@/stores/playgroundStore";
import { useMcps } from "@/hooks/useMcps";
import { useExternalMcps } from "@/hooks/useExternalMcps";
import { ToolDefinition } from "@/lib/mcp/tool";
import { MentionedTool } from "./types";

interface FixToolCallComposerProps {
  className?: string;
  toolName?: string;
  onSubmit: (message: string, mentionedTools: MentionedTool[]) => void;
}

export function FixToolCallComposer({
  className,
  toolName,
  onSubmit,
}: FixToolCallComposerProps) {
  const { captureEvent } = usePostHog();
  const { mcps } = useMcps();
  const { externalMcps } = useExternalMcps();
  const [message, setMessage] = useState("");
  const editorRef = useRef<EditorView | null>(null);

  // Get toolMap from playground store
  const toolMap = usePlaygroundStore((state) => state.mcpToolMap);

  // Create mentionData from toolMap similar to AgentSidebar
  const mentionData = useMemo(() => {
    const data: MentionData[] = [];

    // Add MCP Tools
    if (toolMap) {
      for (const [mcpId, mcpData] of Object.entries(toolMap)) {
        if (mcpData.tools) {
          for (const tool of mcpData.tools) {
            data.push({
              id: `mcp-tool-${tool.name}`,
              name: tool.name,
              type: "tool",
              mcpId: mcpId,
            });
          }
        }
      }
    }

    return data;
  }, [toolMap]);

  const isEmpty = !message.trim();

  const mentions = useMemo(
    () => extractMentions(message, mentionData),
    [message, mentionData],
  );

  // Pre-populate with toolName if it exists in the toolMap
  useEffect(() => {
    if (toolName && mentionData.some((mention) => mention.name === toolName)) {
      const initialMessage = `@${toolName} should not have been called...`;
      setMessage(initialMessage);

      // Set the editor content if it exists
      if (editorRef.current) {
        editorRef.current.dispatch({
          changes: {
            from: 0,
            to: editorRef.current.state.doc.length,
            insert: initialMessage,
          },
        });
      }
    }
  }, [toolName, mentionData]);

  const handleSubmit = useCallback(() => {
    if (!editorRef.current) return;
    const currentMessage = editorRef.current.state.doc.toString();
    const trimmedMessage = currentMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    const extractedMentions = extractMentions(trimmedMessage, mentionData);

    const mentionedTools = extractedMentions
      .map((mention) => {
        if (mention.type === "tool" && mention.mcpId) {
          // Check if this is an external MCP
          const isExternal = !!externalMcps[mention.mcpId];

          if (isExternal) {
            const tool = toolMap[mention.mcpId].tools?.find(
              (tool) => tool.name === mention.name,
            );

            if (tool) {
              return {
                mcpId: mention.mcpId,
                isExternal: true,
                definition: tool,
                originalToolName: (
                  tool.annotations?.originalDefinition as ToolDefinition
                ).name,
              };
            }
          } else {
            // Find the corresponding regular MCP
            const mcp = mcps.find((m) => m.id === mention.mcpId);
            if (mcp) {
              // Find the API group that contains this tool
              for (const [apiId, apiGroup] of Object.entries(mcp.apiGroups)) {
                const toolPrefix = apiGroup.toolPrefix || "";

                const tool = apiGroup.tools?.find(
                  (tool) => mention.name === toolPrefix + tool.name,
                );
                if (tool) {
                  return {
                    apiId,
                    mcpId: mention.mcpId,
                    isExternal: false,
                    originalToolName: tool.name,
                    definition: tool.optimised
                      ? tool.optimised
                      : {
                          name: tool.name,
                          description: tool.description,
                          inputSchema: tool.inputSchema,
                        },
                  };
                }
              }
            }

            return null;
          }
        }

        return null;
      })
      .filter((c) => c !== null) as MentionedTool[];

    captureEvent("fix_tool_call_submitted", {
      messageLength: trimmedMessage.length,
      mentionCount: mentionedTools.length,
    });

    onSubmit(trimmedMessage, mentionedTools);
  }, [captureEvent, mcps, toolMap, externalMcps, onSubmit, mentionData]);

  const extensions: Extension[] = useMemo(
    () => [
      placeholder("@ to mention a tool"),
      keymap.of([
        {
          key: "Enter",
          run: () => {
            handleSubmit();
            return true;
          },
        },
      ]),
    ],
    [handleSubmit],
  );

  return (
    <div
      className={cn(
        "dark:bg-sidebar-accent/50 bg-card dark:sidebar-border flex min-h-[100px] flex-col gap-2 rounded-lg border p-3",
        className,
      )}
    >
      {/* Mentions section */}
      <AttachmentsDisplay mentions={mentions} />

      <CodeMirrorEditor
        autoFocus
        editorRef={editorRef}
        defaultValue={message}
        maxHeight="300px"
        language="markdown"
        additionalExtensions={extensions}
        mentionData={mentionData}
        fontSize={15}
        regularFont
        onChange={setMessage}
      />

      <div className="mt-auto flex items-center justify-end pt-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-6 w-6 rounded-full"
                size="icon"
                disabled={isEmpty}
                onClick={handleSubmit}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Submit fix (Enter)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
