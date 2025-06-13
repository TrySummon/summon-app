import React from "react";
import { Database, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocalDatasets } from "@/hooks/useLocalDatasets";
import { cn } from "@/utils/tailwind";

interface DatasetSelectorProps {
  selectedDatasetId?: string;
  onDatasetChange: (datasetId: string | undefined) => void;
  className?: string;
}

export function DatasetSelector({
  selectedDatasetId,
  onDatasetChange,
  className,
}: DatasetSelectorProps) {
  const { datasets } = useLocalDatasets();

  const selectedDataset = selectedDatasetId
    ? datasets.find((d) => d.id === selectedDatasetId)
    : undefined;

  return (
    <div className={cn("flex", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" role="combobox" className="gap-2" size="sm">
            <Database className="h-3.5 w-3.5" />
            {selectedDataset ? (
              <span className="max-w-[120px] truncate">
                {selectedDataset.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Select dataset...</span>
            )}
            <ChevronsUpDown className="text-muted-foreground h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem
            onClick={() => onDatasetChange(undefined)}
            className={cn("cursor-pointer", {
              "bg-accent": !selectedDatasetId,
            })}
          >
            <span className="text-muted-foreground">No dataset selected</span>
          </DropdownMenuItem>
          {datasets.length > 0 && (
            <>
              {datasets.map((dataset) => (
                <DropdownMenuItem
                  key={dataset.id}
                  onClick={() => onDatasetChange(dataset.id)}
                  className={cn("cursor-pointer", {
                    "bg-accent": selectedDatasetId === dataset.id,
                  })}
                >
                  <div className="flex w-full flex-col gap-1">
                    <span className="truncate font-medium">{dataset.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {dataset.items.length} items
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {datasets.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">
                No datasets available
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
