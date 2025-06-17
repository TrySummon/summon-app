import React, { useState } from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { CreateDatasetDialog } from "@/components/CreateDatasetDialog";
import { DatasetsTable } from "@/components/DatasetsTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Database } from "lucide-react";

const DatasetsPage: React.FC = () => {
  const { datasets, isLoading } = useDatasets();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <BreadcrumbPage>
                <Database className="mr-2 size-3" /> Datasets
              </BreadcrumbPage>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="container flex flex-grow flex-col py-4">
        <DatasetsTable
          datasets={datasets}
          isLoading={isLoading}
          onCreateDataset={() => setCreateDialogOpen(true)}
        />
      </div>
      <CreateDatasetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          // The useDatasets hook will automatically update the datasets list
          // when a new dataset is created due to query invalidation
        }}
      />
    </div>
  );
};

export default DatasetsPage;
