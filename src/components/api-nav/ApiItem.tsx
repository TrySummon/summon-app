import React, { useRef, useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import { ApiDropdownMenu } from "./ApiDropdownMenu";
import { ApiEndpointList } from "./ApiEndpointList";
import { toast } from "sonner";
import { useApis } from "@/hooks/useApis";
import { OpenAPIV3 } from "openapi-types";
import { extractTimestampFromApiId } from "@/utils/formatDate";

interface ApiItemProps {
  apiItem: { id: string; api: OpenAPIV3.Document };
  isOpen: boolean;
  isActive: boolean;
  onToggle: (apiId: string) => void;
}

export function ApiItem({ apiItem, isOpen, isActive, onToggle }: ApiItemProps) {
  const { renameApi, deleteApi } = useApis();
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [tempApiName, setTempApiName] = useState<string>("");

  const editableNameRef = useRef<HTMLSpanElement>(null);
  const renameInitiatedRef = useRef<boolean>(false);

  // Extract timestamp information from API ID
  const timestampInfo = extractTimestampFromApiId(apiItem.id);

  useEffect(() => {
    if (editingApiId === apiItem.id && editableNameRef.current) {
      editableNameRef.current.focus();
      // Set cursor at the end
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editableNameRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [editingApiId, apiItem.id]);

  // Handle delete API
  const handleDeleteApi = (apiId: string, apiName: string) => {
    if (confirm(`Are you sure you want to delete the API "${apiName}"?`)) {
      deleteApi(apiId, {
        onSuccess: () => {
          toast.success(`API "${apiName}" deleted successfully`);
        },
        onError: (error: unknown) => {
          toast.error(
            `Failed to delete API: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        },
      });
    }
  };

  // Start rename process
  const startRenameApi = (apiId: string, currentName: string) => {
    setEditingApiId(apiId);
    setTempApiName(currentName);
    renameInitiatedRef.current = true;
  };

  // Finish rename process
  const finishRenameApi = () => {
    if (!editingApiId) {
      setEditingApiId(null);
      return;
    }

    if (editableNameRef.current) {
      const newName = editableNameRef.current.textContent?.trim();
      if (newName && newName !== tempApiName) {
        renameApi(
          { apiId: editingApiId, newName },
          {
            onSuccess: () => {
              toast.success(`API renamed to "${newName}" successfully`);
              setEditingApiId(null);
            },
            onError: (error: unknown) => {
              toast.error(
                `Failed to rename API: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
              setEditingApiId(null);
            },
          },
        );
      } else {
        setEditingApiId(null);
      }
    } else {
      setEditingApiId(null);
    }
  };

  // Handle keyboard events during rename
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishRenameApi();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingApiId(null);
    }
  };

  return (
    <Collapsible
      key={apiItem.id}
      open={isOpen}
      onOpenChange={() => onToggle(apiItem.id)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <Link to="/api/$apiId" params={{ apiId: apiItem.id }}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton isActive={isActive} className="flex-1 text-xs">
              <div className="flex items-center pl-4">
                <SidebarMenuAction
                  onClick={(e) => {
                    onToggle(apiItem.id);
                    e.preventDefault();
                  }}
                  className="chevron left-0 flex items-center"
                >
                  <ChevronRight className="ml-auto h-3 w-3 group-data-[state=open]/collapsible:hidden" />
                  <ChevronDown className="ml-auto h-3 w-3 group-data-[state=closed]/collapsible:hidden" />
                </SidebarMenuAction>
                {editingApiId === apiItem.id ? (
                  <span
                    ref={editableNameRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => finishRenameApi()}
                    onKeyDown={handleRenameKeyDown}
                    className="border-primary border-b border-dashed px-1 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {apiItem.api.info.title}
                  </span>
                ) : (
                  <div className="flex flex-col">
                    <span className="hover:text-primary cursor-pointer transition-colors">
                      {apiItem.api.info.title}
                    </span>
                    {timestampInfo.hasTimestamp && timestampInfo.formattedTimestamp && (
                      <span className="text-muted-foreground text-[10px] leading-tight">
                        {timestampInfo.formattedTimestamp}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </Link>

        <ApiDropdownMenu
          apiId={apiItem.id}
          apiTitle={apiItem.api.info.title}
          onRename={startRenameApi}
          onDelete={handleDeleteApi}
          editableNameRef={editableNameRef}
          renameInitiatedRef={renameInitiatedRef}
        />

        <CollapsibleContent>
          <ApiEndpointList
            apiId={apiItem.id}
            paths={apiItem.api?.paths || {}}
            isOpen={isOpen}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
