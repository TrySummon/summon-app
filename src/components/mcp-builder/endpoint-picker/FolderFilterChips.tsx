import React from "react";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface FolderFilterChipsProps {
  searchFolderCounts: Record<string, number>;
  selectedSearchFolders: string[];
  onToggleSearchFolder: (folderName: string) => void;
}

export function FolderFilterChips({
  searchFolderCounts,
  selectedSearchFolders,
  onToggleSearchFolder,
}: FolderFilterChipsProps) {
  if (Object.keys(searchFolderCounts).length <= 1) {
    return null;
  }

  return (
    <div className="px-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(searchFolderCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([folderName, count]) => (
            <Button
              key={folderName}
              variant={
                selectedSearchFolders.includes(folderName)
                  ? "default"
                  : "outline"
              }
              size="sm"
              className={cn(
                "flex h-7 items-center gap-1.5 transition-all",
                selectedSearchFolders.includes(folderName)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted",
              )}
              onClick={() => onToggleSearchFolder(folderName)}
            >
              <Folder className="h-3 w-3" />
              <span className="text-sm font-medium">
                {folderName === "root" ? "Root" : folderName}
              </span>
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  selectedSearchFolders.includes(folderName)
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Button>
          ))}
      </div>
    </div>
  );
}
