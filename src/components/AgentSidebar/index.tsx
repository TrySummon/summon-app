import React from "react";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { MessageComposer } from "./MessageComposer";
import { ScrollableContent, ScrollableContentRef } from "./ScrollableContent";
import { useChat } from "@ai-sdk/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "../ui/button";
import { AlertCircle, Plus, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { McpData } from "@/lib/db/mcp-db";
import { importApi } from "@/ipc/openapi/openapi-client";
import { SignInDialog } from "@/components/SignInDialog";
import { Attachment, Message } from "ai";
import { useMcps } from "@/hooks/useMcps";
import { AgentProvider } from "./AgentContext";
import { useApis } from "@/hooks/useApis";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useAgentChats } from "@/stores/agentChatsStore";
import { toast } from "sonner";

export interface MentionData {
  id: string;
  name: string;
  type: "tool" | "api" | "file";
}

interface Props {
  mcpId: string;
  defaultChatId?: string;
  onChatIdChange?: (mcpId: string, chatId: string | undefined) => void;
}

export function AgentSidebar({ mcpId, defaultChatId, onChatIdChange }: Props) {
  const { token, isAuthenticated } = useAuth();
  const { apis, refetch: refetchApis } = useApis();
  const { mcps } = useMcps();
  const mcp = mcps.find((m) => m.id === mcpId);

  const { createChat, updateChat, getChat } = useAgentChats(mcpId);

  // Local state for current chat ID
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    defaultChatId,
  );

  const {
    messages,
    append,
    status,
    error,
    stop,
    setMessages,
    addToolResult,
    reload,
  } = useChat({
    api: `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/agent`,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
    maxSteps: 25,
  });

  // Separate useChat hook for generating conversation names
  const {
    messages: nameMessages,
    append: appendNameMessage,
    setMessages: setNameMessages,
  } = useChat({
    api: `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/conversation-name`,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });

  const { updateMcp } = useMcps();
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const scrollableContentRef = useRef<ScrollableContentRef>(null);
  const mcpVersionsRef = useRef<Record<string, McpData>>({});
  const [currentChatName, setCurrentChatName] = useState<string | undefined>(
    "New Chat",
  );

  // Load default chat when defaultChatId changes (including MCP switches)
  useEffect(() => {
    if (defaultChatId) {
      const chat = getChat(defaultChatId);
      if (chat) {
        setCurrentChatId(defaultChatId);
        setMessages(chat.messages);
        setCurrentChatName(chat.name);
      }
    } else {
      // No default chat, reset to new chat state
      setCurrentChatId(undefined);
      setMessages([]);
      setCurrentChatName("New Chat");
      // Clear attachments when switching MCPs
      setAttachedFiles([]);
      // Clear revert states
      mcpVersionsRef.current = {};
      // Clear name generation messages
      setNameMessages([]);
    }
  }, [defaultChatId, getChat, setMessages, setNameMessages]);

  // Handle conversation name generation
  useEffect(() => {
    if (nameMessages.length > 0 && currentChatId) {
      // Find the latest assistant message with the generated name
      const latestAssistantMessage = nameMessages
        .slice()
        .reverse()
        .find((msg) => msg.role === "assistant");

      if (latestAssistantMessage?.content) {
        // Extract the name from the content (trim any extra whitespace)
        const generatedName = latestAssistantMessage.content.trim();
        setCurrentChatName(generatedName);
        // Update the chat name in the store
        updateChat(currentChatId, {
          name: generatedName,
        });
      }
    }
  }, [nameMessages, currentChatId, setCurrentChatName, updateChat]);

  const mentionData = useMemo(() => {
    const data: MentionData[] = [];

    // 1. MCP Tools
    if (mcp?.apiGroups) {
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

  const isRunning = status === "streaming" || status === "submitted";

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
              refetchApis();
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
    [refetchApis],
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
    setCurrentChatId(undefined);
    // Clear revert states when starting a new chat
    mcpVersionsRef.current = {};
    // Clear name generation messages
    setNameMessages([]);
    setCurrentChatName("New Chat");
    onChatIdChange?.(mcpId, undefined);
  }, [setMessages, setNameMessages, onChatIdChange, mcpId]);

  // Save messages to current chat when they change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      updateChat(currentChatId, {
        messages,
      });
    }
  }, [currentChatId, messages, updateChat]);

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

      if (!mcp) {
        return false;
      }

      if (isRunning) {
        toast.info(
          "Please wait for the agent to finish processing the previous message.",
        );
        return false;
      }

      // Check if this is the first message in a new conversation
      const isFirstMessage = messages.length === 0;

      // Create a new chat if one doesn't exist
      let chatId = currentChatId;
      if (!chatId) {
        chatId = createChat();
        setCurrentChatId(chatId);
        onChatIdChange?.(mcpId, chatId);
      }

      // Store the current mcp state before sending the message
      if (message.id) {
        mcpVersionsRef.current[message.id] = mcp;
      }

      append(message);

      // Generate conversation name for first message
      if (isFirstMessage && message.role === "user" && message.content) {
        // Clear previous name generation messages
        setNameMessages([]);
        // Generate new conversation name
        appendNameMessage({
          role: "user",
          content: message.content,
        });
      }

      // Scroll to show the new message at top
      setTimeout(() => {
        scrollableContentRef.current?.scrollToLatestUserMessage();
      }, 0);

      return true;
    },
    [
      isAuthenticated,
      append,
      isRunning,
      mcp,
      currentChatId,
      createChat,
      messages.length,
      setNameMessages,
      appendNameMessage,
      onChatIdChange,
      mcpId,
    ],
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
      if (!mcp) {
        return;
      }

      // Remove the current message and all messages after it (since append will re-add the updated message)
      setMessages((prevMessages) => {
        const messageIndex = prevMessages.findIndex(
          (msg) => msg.id === updatedMessage.id,
        );
        if (messageIndex !== -1) {
          return [...prevMessages.slice(0, messageIndex), updatedMessage];
        }
        return prevMessages;
      });

      // Store the current mcp state before sending the message
      if (updatedMessage.id) {
        mcpVersionsRef.current[updatedMessage.id] = mcp;
      }
      reload();

      // Scroll to show the updated message at top
      setTimeout(() => {
        scrollableContentRef.current?.scrollToLatestUserMessage();
      }, 0);
    },
    [setMessages, mcp, reload],
  );

  const handleLoadChat = useCallback(
    (chatId: string, chatMessages: Message[]) => {
      setMessages(chatMessages);
      setCurrentChatId(chatId);
      // Clear revert states when loading a different chat
      mcpVersionsRef.current = {};
      // Clear name generation messages
      setNameMessages([]);
      setCurrentChatName(getChat(chatId)?.name || "New Chat");
      // Notify parent about chat change
      onChatIdChange?.(mcpId, chatId);
    },
    [setMessages, setNameMessages, onChatIdChange, mcpId, getChat],
  );

  // Function to check if a message has revert state available
  const hasRevertState = useCallback((messageId: string): boolean => {
    return messageId in mcpVersionsRef.current;
  }, []);

  if (!mcp) {
    return null;
  }

  return (
    <AgentProvider
      mcp={mcp}
      onRefreshApis={refetchApis}
      isRunning={isRunning}
      attachedFiles={attachedFiles}
      mentionData={mentionData}
      autoApprove={autoApprove}
      addToolResult={addToolResult}
      setAutoApprove={setAutoApprove}
      onSendMessage={handleSendMessage}
      onStopAgent={stop}
      onRevert={handleRevert}
      onUpdateMessage={handleUpdateMessage}
      onRemoveFile={handleRemoveFile}
      onClearAttachments={clearAttachments}
      handleNewChat={handleNewChat}
      handleStarterClick={handleStarterClick}
      handleLoadChat={handleLoadChat}
      hasRevertState={hasRevertState}
    >
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
                    {currentChatName}
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

          <ScrollableContent
            ref={scrollableContentRef}
            mcpId={mcpId}
            messages={messages}
            isRunning={isRunning}
          />

          {error && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error.message ||
                    "An error occurred while processing your request. Please try again."}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <SidebarFooter className="p-3 pt-0">
            {messages.length > 0 ? <MessageComposer /> : null}
          </SidebarFooter>

          <SidebarRail direction="left" showIndicator />
        </Sidebar>

        <SignInDialog
          open={showSignInDialog}
          onOpenChange={setShowSignInDialog}
        />
      </div>
    </AgentProvider>
  );
}
