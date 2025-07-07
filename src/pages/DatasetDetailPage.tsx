import React from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useDatasets } from "@/hooks/useDatasets";
import { DatasetItemsTable } from "@/components/DatasetItemsTable";
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

  const dataset = getDataset(datasetId);

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
      <div className="flex-shrink-0">
        <Breadcrumb>
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
      </div>

      <div className="container flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
        <DatasetItemsTable items={dataset.items} isLoading={false} />
      </div>
    </div>
  );
};

export default DatasetDetailPage;
