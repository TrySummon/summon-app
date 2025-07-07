import React from "react";
import BaseLayout from "@/layouts/BaseLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { PostHogRouter } from "@/components/PostHogRouter";
import { useLocation } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DatasetAgentSidebar } from "@/components/DatasetAgent";

export const RootRoute = createRootRoute({
  component: Root,
});

function Root() {
  const location = useLocation();
  const isDatasetPage = location.pathname.startsWith("/datasets");

  // Extract dataset IDs from the route if on a dataset page
  const datasetRouteRegex = /^\/datasets\/([^/]+)(?:\/item\/([^/]+))?$/;
   
  const datasetIds = isDatasetPage
    ? (() => {
        const match = location.pathname.match(datasetRouteRegex);
        return match
          ? {
              datasetId: match[1],
              datasetItemId: match[2] || null,
            }
          : { datasetId: null, datasetItemId: null };
      })()
    : { datasetId: null, datasetItemId: null };

  const outlet = isDatasetPage ? (
    <SidebarProvider
      className="min-h-full"
      mobileBreakpoint={1}
      defaultWidth="21rem"
    >
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-auto">
        <Outlet />
      </SidebarInset>
      <DatasetAgentSidebar
        datasetId={datasetIds.datasetId}
        datasetItemId={datasetIds.datasetItemId}
      />
    </SidebarProvider>
  ) : (
    <Outlet />
  );

  return (
    <BaseLayout>
      <PostHogRouter />
      {outlet}
    </BaseLayout>
  );
}
