import React, { useState, useMemo } from "react";
import { Database, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalDatasets } from "@/hooks/useLocalDatasets";
import { DatasetItem } from "./DatasetItem";
import { DatasetDetailsDialog } from "./DatasetDetailsDialog";
import { DatasetItem as DatasetItemType } from "@/types/dataset";

interface DatasetNavProps {
  className?: string;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <Database className="text-muted-foreground mb-2 h-8 w-8" />
    <p className="text-muted-foreground mb-1 text-sm">No datasets yet</p>
    <p className="text-muted-foreground text-xs">
      Save conversations to create your first dataset
    </p>
  </div>
);

export function DatasetNav({ className }: DatasetNavProps) {
  const { datasets, deleteDataset, count } = useLocalDatasets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataset, setSelectedDataset] =
    useState<DatasetItemType | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filter datasets based on search query
  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;

    const query = searchQuery.toLowerCase();
    return datasets.filter(
      (dataset) =>
        dataset.name.toLowerCase().includes(query) ||
        dataset.description?.toLowerCase().includes(query) ||
        dataset.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [datasets, searchQuery]);

  const handleViewDataset = (dataset: DatasetItemType) => {
    setSelectedDataset(dataset);
    setShowDetailsDialog(true);
  };

  const handleLoadDataset = (dataset: DatasetItemType) => {
    // This will be implemented in TICKET_007
    console.log("Load dataset:", dataset.id);
  };

  const handleExportDataset = (dataset: DatasetItemType) => {
    // Export dataset as JSON file
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      dataset,
      metadata: {
        messageCount: dataset.messages.length,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    toast.success(`Dataset "${dataset.name}" exported successfully`);
  };

  const handleDeleteDataset = (dataset: DatasetItemType) => {
    // Show confirmation dialog
    if (confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
      const success = deleteDataset(dataset.id);
      if (success) {
        toast.success(`Dataset "${dataset.name}" deleted successfully`);
      } else {
        toast.error(`Failed to delete dataset "${dataset.name}"`);
      }
    }
  };

  return (
    <>
      <SidebarGroup className={className}>
        <SidebarGroupLabel>
          <Database className="h-4 w-4" />
          Datasets
          <SidebarGroupAction asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupAction>
        </SidebarGroupLabel>

        <SidebarGroupContent>
          {/* Search/Filter Section */}
          <div className="px-2 pb-2">
            <Input
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>

          {/* Dataset List */}
          <SidebarMenu>
            {filteredDatasets.map((dataset) => (
              <DatasetItem
                key={dataset.id}
                dataset={dataset}
                onView={handleViewDataset}
                onLoad={handleLoadDataset}
                onExport={handleExportDataset}
                onDelete={handleDeleteDataset}
              />
            ))}
          </SidebarMenu>

          {/* Empty State */}
          {datasets.length === 0 && <EmptyState />}

          {/* Footer with count info */}
          <div className="text-muted-foreground px-2 pt-2 text-xs">
            {count} dataset{count !== 1 ? "s" : ""}
            {searchQuery && filteredDatasets.length !== count && (
              <span> • {filteredDatasets.length} filtered</span>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Details Dialog */}
      <DatasetDetailsDialog
        dataset={selectedDataset}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </>
  );
}
