import React, { useRef, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { ApiDropdownMenu } from "./ApiDropdownMenu";
import { ApiEndpointList } from "./ApiEndpointList";

interface ApiItemProps {
  apiItem: {
    id: string;
    api: {
      info: {
        title: string;
      };
      paths: Record<string, any>;
    };
  };
  isOpen: boolean;
  isActive: boolean;
  editingApiId: string | null;
  onToggle: (apiId: string) => void;
  onRename: (apiId: string, currentName: string) => void;
  onDelete: (apiId: string, apiName: string) => void;
  onFinishRename: (newName?: string) => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  tempApiName: string;
}

export function ApiItem({
  apiItem,
  isOpen,
  isActive,
  editingApiId,
  onToggle,
  onRename,
  onDelete,
  onFinishRename,
  onRenameKeyDown,
  tempApiName
}: ApiItemProps) {
  // Create refs with proper types to avoid TypeScript errors
  const editableNameRef = useRef<HTMLSpanElement>(null);
  const renameInitiatedRef = useRef<boolean>(false);

  // Set focus on the editable element when editing starts
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

  const handleFinishRename = () => {
    if (editableNameRef.current) {
      const newName = editableNameRef.current.textContent?.trim();
      if (newName && newName !== tempApiName) {
        onFinishRename(newName);
      } else {
        onFinishRename();
      }
    } else {
      onFinishRename();
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
        <Link to="/api/$apiId" params={{apiId: apiItem.id}}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isActive}
              className="flex-1 text-xs"
            >
              <div className="flex items-center">
                <div onClick={() => onToggle(apiItem.id)} className="mr-2 flex items-center chevron">
                  <ChevronRight className="h-3 w-3 ml-auto group-data-[state=open]/collapsible:hidden" />
                  <ChevronDown className="h-3 w-3 ml-auto group-data-[state=closed]/collapsible:hidden" />
                </div>
                {editingApiId === apiItem.id ? (
                  <span 
                    ref={editableNameRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handleFinishRename()}
                    onKeyDown={onRenameKeyDown}
                    className="outline-none border-b border-dashed border-primary px-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {apiItem.api.info.title}
                  </span>
                ) : (
                  <span 
                    className="cursor-pointer hover:text-primary transition-colors"
                  >
                    {apiItem.api.info.title}
                  </span>
                )}
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </Link>
        
        <ApiDropdownMenu
          apiId={apiItem.id}
          apiTitle={apiItem.api.info.title}
          onRename={onRename}
          onDelete={onDelete}
          editableNameRef={editableNameRef}
          renameInitiatedRef={renameInitiatedRef}
        />
        
        <CollapsibleContent>
          <ApiEndpointList
            apiId={apiItem.id}
            paths={apiItem.api.paths}
            isOpen={isOpen}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
