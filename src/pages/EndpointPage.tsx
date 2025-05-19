import React from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useApis } from "@/hooks/useApis";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Server } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { OpenAPIV3 } from "openapi-types";

// Define the search params interface
interface EndpointSearchParams {
    method: string;
  }

export default function EndpointPage() {
  const { apiId, endpointId } = useParams({ from: "/api/$apiId/endpoint/$endpointId" });
  const {method} = useSearch({ from: "/api/$apiId/endpoint/$endpointId" }) as EndpointSearchParams;
  const { apis } = useApis();
  
  const api = apis.find(a => a.id === apiId);
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
                <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/api/$apiId" params={{apiId: api.id}}>
                <BreadcrumbPage>
         <Server className="size-3 mr-2" /> {api.api.info.title}
       </BreadcrumbPage></Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{endpoint.operationId || endpointId}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
  
 
      <div className="flex flex-col overflow-y-auto flex-1">
  
      </div>
    </div>
  );
}
