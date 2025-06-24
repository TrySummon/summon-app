import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { MessageComposer } from "./MessageComposer";
import { ChatStarters } from "./ChatStarters";
import { MessagesList } from "./MessagesList";
import { useChat } from "@ai-sdk/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "../ui/button";
import { Plus, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { McpData } from "@/lib/db/mcp-db";
import { OpenAPIV3 } from "openapi-types";
import { importApi } from "@/ipc/openapi/openapi-client";
import { SignInDialog } from "@/components/SignInDialog";
import { Attachment, Message } from "ai";
import { useMcps } from "@/hooks/useMcps";
import { capitalize } from "@/lib/string";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export interface MentionData {
  id: string;
  name: string;
  type: "tool" | "api" | "file";
}

interface Props {
  mcp: McpData;
  apis: { id: string; api: OpenAPIV3.Document }[];
  onRefreshApis?: () => void;
}

export function AgentSidebar({ mcp, apis, onRefreshApis }: Props) {
  const { token, isAuthenticated } = useAuth();
  const { updateMcp } = useMcps();
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const placeholderHeightRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestUserMessageRef = useRef<HTMLDivElement>(null);
  const mcpVersionsRef = useRef<Record<string, McpData>>({});

  const mentionData = useMemo(() => {
    const data: MentionData[] = [];

    // 1. MCP Tools
    if (mcp && mcp.apiGroups) {
      for (const group of Object.values(mcp.apiGroups)) {
        if (group.tools) {
          for (const tool of group.tools) {
            data.push({
              id: `mcp-tool-${tool.name}`,
              name: tool.name,
              type: "tool",
            });
          }
        }
      }
    }

    // 2. APIs and their endpoints
    if (apis) {
      apis.forEach(({ id: apiId }) => {
        // Add API itself
        data.push({
          id: `api-${apiId}`,
          name: apiId,
          type: "api",
        });
      });
    }

    return data;
  }, [mcp, apis]);

  const { messages, append, status, error, stop, setMessages } = useChat({
    api: `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/agent`,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });

  const isRunning = status === "streaming" || status === "submitted";

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Check if user is near bottom
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const threshold = 50; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll events to detect dock out/in
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const nearBottom = isNearBottom();

    // If user scrolled up and we're not near bottom, disable auto-scroll
    if (!nearBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    }
    // If user scrolled back to bottom, re-enable auto-scroll
    else if (nearBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
  }, [isAutoScrollEnabled, isNearBottom]);

  // Auto-scroll when agent is running and auto-scroll is enabled
  useEffect(() => {
    if (isRunning && isAutoScrollEnabled && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isRunning, isAutoScrollEnabled, scrollToBottom]);

  // Enable auto-scroll when agent starts running
  useEffect(() => {
    if (isRunning) {
      setIsAutoScrollEnabled(true);
    }
  }, [isRunning]);

  // Calculate placeholder height to ensure scroll space
  const calculatePlaceholderHeight = useCallback(() => {
    if (!scrollContainerRef.current || !latestUserMessageRef.current) {
      return 0;
    }

    const containerScrollHeight = scrollContainerRef.current.scrollHeight;
    const containerClientHeight = scrollContainerRef.current.clientHeight;
    const messageElement = latestUserMessageRef.current;
    const messageOffsetTop = messageElement.offsetTop;

    const requiredTotalHeight = messageOffsetTop + containerClientHeight;
    const currentContentHeight =
      containerScrollHeight - placeholderHeightRef.current;
    const requiredPlaceholder = Math.max(
      0,
      requiredTotalHeight - currentContentHeight - 100,
    );
    return requiredPlaceholder;
  }, []); // No dependencies since we use ref instead of state

  // Update placeholder height when messages change
  useEffect(() => {
    const newHeight = calculatePlaceholderHeight();
    placeholderHeightRef.current = newHeight;
    setPlaceholderHeight(newHeight);
  }, [messages, calculatePlaceholderHeight]);

  // Scroll to position the latest user message at the top
  const scrollToLatestUserMessage = useCallback(() => {
    if (!scrollContainerRef.current || !latestUserMessageRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const messageElement = latestUserMessageRef.current;

    // Get the message's position relative to the scrollable container
    const messageOffsetTop = messageElement.offsetTop;

    // Scroll to position the message at the top (with small offset for padding)
    container.scrollTop = messageOffsetTop - 16; // 16px offset for padding
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(async (file) => {
        let apiId: string | null = null;

        // Check if it's a JSON file and try to import as OpenAPI spec
        if (file.type === "application/json" || file.name.endsWith(".json")) {
          try {
            const result = await importApi(file);
            if (result.success) {
              // Refresh the APIs list to update mentions
              if (onRefreshApis) {
                onRefreshApis();
              }
              apiId = result.apiId ?? null;
            }
          } catch (error) {
            // If import fails, treat as regular file attachment
            console.error(
              `Failed to import ${file.name} as OpenAPI spec:`,
              error,
            );
          }
        }

        // If successfully imported as API, create API attachment
        if (apiId) {
          const apiContent = `User uploaded OpenAPI spec for API with ID: ${apiId}`;
          const dataUrl = `data:text/plain;base64,${btoa(apiContent)}`;

          const newFile: Attachment = {
            name: apiId,
            contentType: "application/x-summon-api",
            url: dataUrl,
          };
          setAttachedFiles((prev) => [...prev, newFile]);
          return;
        }

        // Handle file attachments (images and other files)
        const reader = new FileReader();
        reader.onabort = () => console.info("file reading was aborted");
        reader.onerror = () => console.error("file reading has failed");
        reader.onload = () => {
          const content = reader.result as string;

          const newFile: Attachment = {
            name: file.name,
            contentType: file.type || "application/octet-stream",
            url: content,
          };

          setAttachedFiles((prev) => [...prev, newFile]);
        };

        reader.readAsDataURL(file);
      });
    },
    [onRefreshApis],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "application/json": [".json"],
      "text/yaml": [".yaml"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
  });

  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.name !== fileId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setAttachedFiles([]);
    setIsAutoScrollEnabled(true);
  }, [setMessages]);

  // Authentication wrapper functions
  const handleStarterClick = useCallback(
    (prompt: string) => {
      if (!isAuthenticated) {
        setShowSignInDialog(true);
        return;
      }

      append({ role: "user", content: prompt });
    },
    [isAuthenticated, append],
  );

  const handleSendMessage = useCallback(
    (message: Message): boolean => {
      if (!isAuthenticated) {
        setShowSignInDialog(true);
        return false;
      }

      console.log("message", message);

      // Store the current mcp state before sending the message
      if (message.id) {
        mcpVersionsRef.current[message.id] = mcp;
      }

      append(message);

      // Disable auto-scroll temporarily and then scroll to show the new message at top
      setIsAutoScrollEnabled(false);

      // Wait for the message to be rendered, then scroll
      setTimeout(() => {
        scrollToLatestUserMessage();
      }, 0);

      return true;
    },
    [isAuthenticated, append, scrollToLatestUserMessage, mcp],
  );

  const handleRevert = useCallback(
    (messageId: string) => {
      const storedMcp = mcpVersionsRef.current[messageId];
      if (storedMcp) {
        // Convert McpData to McpSubmitData by omitting id, createdAt, updatedAt
        const mcpSubmitData = {
          name: storedMcp.name,
          transport: storedMcp.transport,
          apiGroups: storedMcp.apiGroups,
        };
        updateMcp({
          mcpId: storedMcp.id,
          mcpData: mcpSubmitData,
        });

        // Remove all messages after the reverted message
        setMessages((prevMessages) => {
          const messageIndex = prevMessages.findIndex(
            (msg) => msg.id === messageId,
          );
          if (messageIndex !== -1) {
            return prevMessages.slice(0, messageIndex + 1);
          }
          return prevMessages;
        });

        // Clean up stored versions after revert
        delete mcpVersionsRef.current[messageId];
      }
    },
    [updateMcp, setMessages],
  );

  const handleUpdateMessage = useCallback(
    (updatedMessage: Message) => {
      // Remove the current message and all messages after it (since append will re-add the updated message)
      setMessages((prevMessages) => {
        const messageIndex = prevMessages.findIndex(
          (msg) => msg.id === updatedMessage.id,
        );
        if (messageIndex !== -1) {
          return prevMessages.slice(0, messageIndex);
        }
        return prevMessages;
      });

      // Store the current mcp state before sending the message
      if (updatedMessage.id) {
        mcpVersionsRef.current[updatedMessage.id] = mcp;
      }

      // Call the agent with the updated message
      append(updatedMessage);

      // Disable auto-scroll temporarily and then scroll to show the new message at top
      setIsAutoScrollEnabled(false);

      // Wait for the message to be rendered, then scroll
      setTimeout(() => {
        scrollToLatestUserMessage();
      }, 0);
    },
    [
      setMessages,
      mcp,
      append,
      setIsAutoScrollEnabled,
      scrollToLatestUserMessage,
    ],
  );

  return (
    <div {...getRootProps()} className="relative h-full">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="border-primary/60 bg-background/90 rounded-xl border-2 border-dashed p-8 shadow-lg">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex items-center space-x-2">
                <Upload className="text-primary h-8 w-8 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-lg font-semibold">
                  Drop files to attach
                </h3>
                <p className="text-muted-foreground text-sm">
                  Images, JSON, TXT, and Markdown files supported
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <Sidebar
        side="right"
        className="top-[var(--header-height)] flex !h-[calc(100svh-var(--header-height))] flex-col"
      >
        <SidebarHeader className="border-b">
          <div className="flex items-center justify-between">
            <SidebarMenu>
              <SidebarMenuItem>
                <Button className="h-8 px-2" variant="ghost">
                  {capitalize(mcp.name)} Chat
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent
          className="flex min-h-0 flex-1 flex-col"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className="flex flex-1 flex-col p-4 pb-0">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error.message ||
                    "An error occurred while processing your request. Please try again."}
                </AlertDescription>
              </Alert>
            )}
            {messages.length === 0 ? (
              <ChatStarters onStarterClick={handleStarterClick} />
            ) : (
              <MessagesList
                messages={messages}
                isRunning={isRunning}
                latestUserMessageRef={latestUserMessageRef}
                placeholderHeight={placeholderHeight}
                onStop={stop}
                onRevert={handleRevert}
                onUpdateMessage={handleUpdateMessage}
                mentionData={mentionData}
              />
            )}
          </div>
        </SidebarContent>

        <SidebarFooter className="p-3 pt-0">
          <MessageComposer
            onSendMessage={handleSendMessage}
            onStopAgent={stop}
            isRunning={isRunning}
            attachedFiles={attachedFiles}
            onRemoveFile={handleRemoveFile}
            onClearAttachments={clearAttachments}
            mentionData={mentionData}
          />
        </SidebarFooter>

        <SidebarRail direction="left" />
      </Sidebar>

      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />
    </div>
  );
}
