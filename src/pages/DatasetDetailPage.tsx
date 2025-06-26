import React, { useState, useEffect } from "react";
import {
  useParams,
  useSearch,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useDatasets } from "@/hooks/useDatasets";
import { DatasetItemsTable } from "@/components/DatasetItemsTable";
import { DatasetItemDetailsSidebar } from "@/components/DatasetItemDetailsSidebar";
import { SafeDatasetEvaluation } from "@/components/dataset-evaluation";
import { SubNav, NavItem } from "@/components/SubNav";
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

const navItems: NavItem[] = [
  { name: "Items", href: "#", value: "items" },
  { name: "Evaluation", href: "#", value: "eval" },
];

const DatasetDetailPage: React.FC = () => {
  const { datasetId } = useParams({
    from: "/datasets/$datasetId",
  });
  const search = useSearch({ from: "/datasets/$datasetId" });
  const navigate = useNavigate();
  const { getDataset, isLoading } = useDatasets();
  const [selectedItem, setSelectedItem] = useState<DatasetItem | null>(null);
  const [activeTab, setActiveTab] = useState("items");

  // Set initial tab from URL search params
  useEffect(() => {
    if (search?.tab && (search.tab === "items" || search.tab === "eval")) {
      setActiveTab(search.tab);
    }
  }, [search?.tab]);

  const dataset = getDataset(datasetId);

  const handleSelectItem = (item: DatasetItem) => {
    setSelectedItem(item);
  };

  const handleCloseSidebar = () => {
    setSelectedItem(null);
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate({
      to: "/datasets/$datasetId",
      params: { datasetId },
      search: { tab: newTab },
      replace: true,
    });
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "eval":
        return (
          <SafeDatasetEvaluation items={dataset.items} datasetId={datasetId} />
        );
      case "items":
      default:
        return (
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
            <SidebarInset className="container flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
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
        );
    }
  };

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
        <div className="p-3 pb-0">
          <SubNav
            items={navItems}
            value={activeTab}
            onValueChange={handleTabChange}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{renderTabContent()}</div>
    </div>
  );
};

export default DatasetDetailPage;
