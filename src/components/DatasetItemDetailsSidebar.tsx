import React, { useEffect, useState } from "react";
import { DatasetItem } from "@/types/dataset";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  X,
  Calendar,
  MessageSquare,
  Target,
  Wrench,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import CodeEditor from "@/components/CodeEditor";
import { Badge } from "@/components/ui/badge";
import { MessageContent } from "@/components/playground/Message/Content";
import { useNavigate } from "@tanstack/react-router";
import { usePlaygroundStore } from "@/components/playground/store";
import { useDatasets } from "@/hooks/useDatasets";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import CopyButton from "@/components/CopyButton";

interface DatasetItemDetailsSidebarProps {
  item: DatasetItem | null;
  onClose: () => void;
  datasetId?: string;
}

export const DatasetItemDetailsSidebar: React.FC<
  DatasetItemDetailsSidebarProps
> = ({ item, onClose, datasetId }) => {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { createTab } = usePlaygroundStore();
  const { deleteItem } = useDatasets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    systemPrompt: false,
    inputMessages: true,
    outputMessages: true,
    expectedToolCalls: true,
    settings: true,
  });

  const getInputMessages = (item: DatasetItem) => {
    const cutPosition = item.inputOutputCutPosition ?? item.messages.length;
    return item.messages.slice(0, cutPosition);
  };

  const getOutputMessages = (item: DatasetItem) => {
    const cutPosition = item.inputOutputCutPosition ?? item.messages.length;
    return item.messages.slice(cutPosition);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleOpenInPlayground = () => {
    if (!item) return;

    try {
      createTab(
        {
          systemPrompt: item.systemPrompt,
          messages: item.messages,
          settings: item.settings,
          model: item.model,
        },
        `${item.name}`,
      );

      navigate({ to: "/playground" });
      toast.success("Opened in playground");
    } catch {
      toast.error("Failed to open in playground");
    }
  };

  const handleDelete = async () => {
    if (!item || !datasetId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteItem(datasetId, item.id);
      toast.success("Dataset item deleted");
      onClose();
    } catch {
      toast.error("Failed to delete dataset item");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(!!item);
    } else {
      setOpen(!!item);
    }
  }, [isMobile, item, setOpen, setOpenMobile]);

  if (!item) return null;

  const inputMessages = getInputMessages(item);
  const outputMessages = getOutputMessages(item);

  return (
    <Sidebar
      side="right"
      className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]"
    >
      <SidebarHeader className="border-b p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl leading-tight font-semibold">{item.name}</h2>
            {item.description && (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-6">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            {formatDate(item.createdAt)}
          </div>
          {item.model && (
            <Badge variant="secondary" className="text-xs">
              {item.model}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button onClick={handleOpenInPlayground} className="flex-1" size="sm">
            <Play className="mr-2 h-4 w-4" />
            Open in Playground
          </Button>
          {datasetId && (
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 overflow-y-auto">
        {/* System Prompt */}
        {item.systemPrompt && (
          <div className="border-b">
            <Collapsible
              open={!collapsedSections.systemPrompt}
              onOpenChange={() => toggleSection("systemPrompt")}
            >
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">System Prompt</span>
                </div>
                {collapsedSections.systemPrompt ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {item.systemPrompt.length} characters
                    </span>
                    <CopyButton content={item.systemPrompt} />
                  </div>
                  <CodeEditor
                    defaultValue={item.systemPrompt}
                    language="markdown"
                    readOnly
                    height="120px"
                    className="rounded-md border"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Input Messages */}
        <div className="border-b">
          <Collapsible
            open={!collapsedSections.inputMessages}
            onOpenChange={() => toggleSection("inputMessages")}
          >
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span className="font-medium">Input Messages</span>
                <Badge variant="outline" className="text-xs">
                  {inputMessages.length}
                </Badge>
              </div>
              {collapsedSections.inputMessages ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    {inputMessages.length} message
                    {inputMessages.length !== 1 ? "s" : ""}
                  </span>
                  <CopyButton content={inputMessages} />
                </div>
                {!collapsedSections.inputMessages && (
                  <div className="max-h-[400px] space-y-3 overflow-y-auto">
                    {inputMessages.map((message, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 rounded-md border p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <Badge
                            variant={
                              message.role === "user" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {message.role}
                          </Badge>
                        </div>
                        <MessageContent message={message} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Output Messages */}
        {outputMessages.length > 0 && (
          <div className="border-b">
            <Collapsible
              open={!collapsedSections.outputMessages}
              onOpenChange={() => toggleSection("outputMessages")}
            >
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Output Messages</span>
                  <Badge variant="outline" className="text-xs">
                    {outputMessages.length}
                  </Badge>
                </div>
                {collapsedSections.outputMessages ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {outputMessages.length} message
                      {outputMessages.length !== 1 ? "s" : ""}
                    </span>
                    <CopyButton content={outputMessages} />
                  </div>
                  {!collapsedSections.outputMessages && (
                    <div className="max-h-[400px] space-y-3 overflow-y-auto">
                      {outputMessages.map((message, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 rounded-md border p-4"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <Badge
                              variant={
                                message.role === "user"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {message.role}
                            </Badge>
                          </div>
                          <MessageContent message={message} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Expected Tool Calls */}
        {item.expectedToolCalls && item.expectedToolCalls.length > 0 && (
          <div className="border-b">
            <Collapsible
              open={!collapsedSections.expectedToolCalls}
              onOpenChange={() => toggleSection("expectedToolCalls")}
            >
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Expected Tool Calls</span>
                  <Badge variant="outline" className="text-xs">
                    {item.expectedToolCalls.length}
                  </Badge>
                </div>
                {collapsedSections.expectedToolCalls ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {item.expectedToolCalls.length} tool call
                      {item.expectedToolCalls.length !== 1 ? "s" : ""}
                    </span>
                    <CopyButton content={item.expectedToolCalls} />
                  </div>
                  {!collapsedSections.expectedToolCalls && (
                    <div className="space-y-2">
                      {item.expectedToolCalls.map((toolCall, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 rounded-md border p-3"
                        >
                          <code className="text-sm">{toolCall}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Natural Language Criteria */}
        {item.naturalLanguageCriteria &&
          item.naturalLanguageCriteria.length > 0 && (
            <div className="border-b">
              <div className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Target className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Evaluation Criteria</span>
                  <Badge variant="outline" className="text-xs">
                    {item.naturalLanguageCriteria.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {item.naturalLanguageCriteria.map((criteria, index) => (
                    <div
                      key={index}
                      className="bg-muted/30 rounded-md border p-3"
                    >
                      <div className="text-sm">{criteria}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
