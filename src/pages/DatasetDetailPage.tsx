import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useDatasets } from "@/hooks/useDatasets";
import { DatasetItemsTable } from "@/components/DatasetItemsTable";
import { DatasetItemDetailsSidebar } from "@/components/DatasetItemDetailsSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DatasetItem } from "@/types/dataset";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Database } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";

const DatasetDetailPage: React.FC = () => {
  const { datasetId } = useParams({
    from: "/datasets/$datasetId",
  });
  const { getDataset, isLoading } = useDatasets();
  const [selectedItem, setSelectedItem] = useState<DatasetItem | null>(null);

  const dataset = getDataset(datasetId);

  const handleSelectItem = (item: DatasetItem) => {
    setSelectedItem(item);
  };

  const handleCloseSidebar = () => {
    setSelectedItem(null);
  };

  if (isLoading) return null;

  if (!dataset) {
    return (
      <NotFound
        title="Dataset Not Found"
        message="The dataset you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Datasets", to: "/datasets" },
          { label: "Dataset Not Found", isActive: true },
        ]}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb className="flex-shrink-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/datasets">
                <BreadcrumbPage>
                  <Database className="mr-2 size-3" /> Datasets
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dataset.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SidebarProvider
        className="flex min-h-0 flex-1"
        mobileBreakpoint={1200}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        style={
          {
            "--sidebar-width": "28rem",
          } as React.CSSProperties
        }
      >
        <SidebarInset className="container flex flex-1 flex-col gap-4 overflow-y-auto py-4">
          <DatasetItemsTable
            items={dataset.items}
            isLoading={false}
            onSelectItem={handleSelectItem}
          />
        </SidebarInset>
        <DatasetItemDetailsSidebar
          item={selectedItem}
          onClose={handleCloseSidebar}
          datasetId={datasetId}
        />
      </SidebarProvider>
    </div>
  );
};

export default DatasetDetailPage;
