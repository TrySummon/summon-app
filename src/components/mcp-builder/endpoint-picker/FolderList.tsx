import React from "react";
import { Folder } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface FolderListProps {
  folders: string[];
  selectedFolder: string | null;
  selectedCountByFolder: Record<string, number>;
  onSelectFolder: (folderName: string) => void;
}

export function FolderList({
  folders,
  selectedFolder,
  selectedCountByFolder,
  onSelectFolder,
}: FolderListProps) {
  if (folders.length === 0) {
    return (
      <div className="bg-muted/5 w-1/4 overflow-y-auto border-r">
        <div className="text-muted-foreground p-4 text-center">
          No API endpoints available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/5 w-1/4 overflow-y-auto border-r">
      <ul className="flex w-full min-w-0 flex-col gap-1 p-2">
        {folders.map((folderName) => {
          const selectedCount = selectedCountByFolder[folderName] || 0;
          return (
            <li key={folderName} className="relative">
              <div
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-1.5 text-left text-sm",
                  selectedFolder === folderName
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "",
                )}
                onClick={() => onSelectFolder(folderName)}
              >
                <Folder className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="truncate">
                  {folderName === "root" ? "Root" : folderName}
                </span>
                {selectedCount > 0 && (
                  <span className="ml-auto rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {selectedCount}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
