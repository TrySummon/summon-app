import React from "react";
import {
  FileText,
  MoreHorizontal,
  Eye,
  Play,
  Download,
  Trash2,
} from "lucide-react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DatasetItem as DatasetItemType } from "@/types/dataset";
import { formatDate } from "@/utils/formatDate";

interface DatasetItemProps {
  dataset: DatasetItemType;
  onView?: (dataset: DatasetItemType) => void;
  onLoad?: (dataset: DatasetItemType) => void;
  onExport?: (dataset: DatasetItemType) => void;
  onDelete?: (dataset: DatasetItemType) => void;
}

export function DatasetItem({
  dataset,
  onView,
  onLoad,
  onExport,
  onDelete,
}: DatasetItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="group/item">
        <FileText className="h-4 w-4" />
        <div className="flex-1 truncate">
          <div className="truncate font-medium">{dataset.name}</div>
          <div className="text-muted-foreground text-xs">
            {dataset.messages.length} messages • {formatDate(dataset.createdAt)}
          </div>
        </div>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction>
            <MoreHorizontal className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onView?.(dataset)}>
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onLoad?.(dataset)}>
            <Play className="h-4 w-4" />
            Load to Playground
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport?.(dataset)}>
            <Download className="h-4 w-4" />
            Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete?.(dataset)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
