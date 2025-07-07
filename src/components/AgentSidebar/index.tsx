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
import { useCallback, useState, useRef, useEffect } from "react";
import { SignInDialog } from "@/components/SignInDialog";
import { Attachment, Message } from "ai";
import { AgentProvider } from "./AgentContext";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useAgentChats } from "@/stores/agentChatsStore";
import { toast } from "sonner";
import { MentionData } from "@/components/CodeEditor";
import { AgentToolBox } from "@/types/agent";

interface AgentSidebarProps {
  // Agent configuration
  agentId: string;
  apiPath: string;
  toolBox: AgentToolBox;
  composerPlaceholder: string;

  // Chat configuration
  defaultChatId?: string;
  onChatIdChange?: (agentId: string, chatId: string | undefined) => void;

  // Agent-specific data and handlers
  mentionData: MentionData[];
  additionalAttachments?: Attachment[];
  processFile?: (file: File) => Promise<Attachment | null>;
  onRevert?: (messageId: string) => void;
  hasRevertState?: (messageId: string) => boolean;

  // File drop configuration
  acceptedFileTypes?: Record<string, string[]>;

  // Custom UI elements
  chatNamePrefix?: string;
}

export function AgentSidebar({
  agentId,
  apiPath,
  toolBox,
  composerPlaceholder,
  defaultChatId,
  onChatIdChange,
  mentionData,
  additionalAttachments,
  processFile,
  onRevert,
  hasRevertState,
  acceptedFileTypes = {
    "application/json": [".json"],
    "text/yaml": [".yaml"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  },
  chatNamePrefix = "New Chat",
}: AgentSidebarProps) {
  const { token, isAuthenticated } = useAuth();
  const { createChat, updateChat, getChat } = useAgentChats(agentId);

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
    api: `${process.env.PUBLIC_SUMMON_HOST}${apiPath}`,
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
    api: `${process.env.PUBLIC_SUMMON_HOST}/api/conversation-name`,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });

  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const scrollableContentRef = useRef<ScrollableContentRef>(null);
  const [currentChatName, setCurrentChatName] = useState<string | undefined>(
    chatNamePrefix,
  );

  useEffect(() => {
    if (additionalAttachments) {
      setAttachedFiles(additionalAttachments);
    }
  }, [additionalAttachments]);

  // Load default chat when defaultChatId changes
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
      setCurrentChatName(chatNamePrefix);
      // Clear attachments when switching agents
      setAttachedFiles([]);
      // Clear name generation messages
      setNameMessages([]);
    }
  }, [defaultChatId, getChat, setMessages, setNameMessages, chatNamePrefix]);

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

  const isRunning = status === "streaming" || status === "submitted";

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      acceptedFiles.forEach(async (file) => {
        const attachment = await processFile?.(file);

        if (attachment) {
          setAttachedFiles((prev) => [...prev, attachment]);
          return;
        }

        const reader = new FileReader();
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
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: acceptedFileTypes,
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
    // Clear name generation messages
    setNameMessages([]);
    setCurrentChatName(chatNamePrefix);
    onChatIdChange?.(agentId, undefined);
  }, [setMessages, setNameMessages, onChatIdChange, agentId, chatNamePrefix]);

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
        onChatIdChange?.(agentId, chatId);
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
      currentChatId,
      createChat,
      messages.length,
      setNameMessages,
      appendNameMessage,
      onChatIdChange,
      agentId,
    ],
  );

  const handleRevert = useCallback(
    (messageId: string) => {
      if (onRevert) {
        onRevert(messageId);
      }

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
    },
    [onRevert, setMessages],
  );

  const handleUpdateMessage = useCallback(
    (updatedMessage: Message) => {
      // Remove the current message and all messages after it
      setMessages((prevMessages) => {
        const messageIndex = prevMessages.findIndex(
          (msg) => msg.id === updatedMessage.id,
        );
        if (messageIndex !== -1) {
          return [...prevMessages.slice(0, messageIndex), updatedMessage];
        }
        return prevMessages;
      });

      reload();

      // Scroll to show the updated message at top
      setTimeout(() => {
        scrollableContentRef.current?.scrollToLatestUserMessage();
      }, 0);
    },
    [setMessages, reload],
  );

  const handleLoadChat = useCallback(
    (chatId: string, chatMessages: Message[]) => {
      setMessages(chatMessages);
      setCurrentChatId(chatId);
      // Clear name generation messages
      setNameMessages([]);
      setCurrentChatName(getChat(chatId)?.name || chatNamePrefix);
      // Notify parent about chat change
      onChatIdChange?.(agentId, chatId);
    },
    [
      setMessages,
      setNameMessages,
      onChatIdChange,
      agentId,
      getChat,
      chatNamePrefix,
    ],
  );

  const defaultHasRevertState = useCallback(() => false, []);

  return (
    <AgentProvider
      toolBox={toolBox}
      composerPlaceholder={composerPlaceholder}
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
      hasRevertState={hasRevertState || defaultHasRevertState}
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
                    Supported file types vary by agent
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
            mcpId={agentId}
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
