import React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ApiDropdownMenuProps {
  apiId: string;
  apiTitle: string;
  onRename: (apiId: string, currentName: string) => void;
  onDelete: (apiId: string, apiName: string) => void;
  editableNameRef: React.RefObject<HTMLSpanElement | null>;
  renameInitiatedRef: React.MutableRefObject<boolean>;
}

export function ApiDropdownMenu({
  apiId,
  apiTitle,
  onRename,
  onDelete,
  editableNameRef,
  renameInitiatedRef
}: ApiDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover>
          <MoreHorizontal className="h-3 w-3" />
          <span className="sr-only">More</span>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-38"
        side="right"
        align="start"
        onCloseAutoFocus={(event) => {
          if (renameInitiatedRef.current) {
            event.preventDefault();
            if(editableNameRef.current){
              // Set cursor at the end
              const el = editableNameRef.current;
              const selection = window.getSelection();
              if (selection) { 
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false); 
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
            renameInitiatedRef.current = false; // Reset the flag
          }
        }}
      >
        <DropdownMenuItem 
          className="text-xs" 
          onSelect={() => onRename(apiId, apiTitle)}
        >
          <Pencil className="mr-2 !size-3 text-muted-foreground" />
          <span>Rename API</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-xs" 
          onSelect={() => onDelete(apiId, apiTitle)}
        >
          <Trash2 className="mr-2 !size-3 text-muted-foreground" />
          <span>Delete API</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
