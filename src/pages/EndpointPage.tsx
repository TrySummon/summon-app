import React from "react";
import { useParams, useSearch, Link } from "@tanstack/react-router";
import { useApi } from "@/hooks/useApis";
import { OpenAPIV3 } from "openapi-types";
import { NotFound } from "@/components/ui/NotFound";
import { Server } from "lucide-react";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ApiExplorer } from "@/components/api-explorer";

// Define the search params interface
interface EndpointSearchParams {
    method: string;
  }

export default function EndpointPage() {
  const { apiId, endpointId } = useParams({ from: "/api/$apiId/endpoint/$endpointId" });
  const {method} = useSearch({ from: "/api/$apiId/endpoint/$endpointId" }) as EndpointSearchParams;
  const { api } = useApi(apiId);
  
  const path = api?.api.paths?.[endpointId]

  const endpoint = path && method in path ? path[method as keyof typeof path] as OpenAPIV3.OperationObject : undefined

  if (!api || !endpoint) {
    return (
      <NotFound
        title="Endpoint Not Found"
        message="The endpoint you're looking for doesn't exist or has been removed."
        breadcrumbs={
          api ? [
            { label: "Home", to: "/" },
            {
              label: api.api.info.title,
              to: "/api/$apiId",
              params: { apiId: api.id }
            },
            { label: "Endpoint Not Found", isActive: true }
          ] : [
            { label: "Home", to: "/" },
            { label: "Endpoint Not Found", isActive: true }
          ]
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
        <Breadcrumb className="flex-shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/api/$apiId" params={{apiId: api.id}}>
                <BreadcrumbPage>
                  <Server className="size-3 mr-2" /> {api.api.info.title}
                </BreadcrumbPage>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{endpoint.operationId || endpointId}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">
            <ApiExplorer
              openapiSpec={api.api}
              endpointPath={endpointId}
              endpointMethod={method as any}
            />
          </div>
        </div>
    </div>
  );
}
