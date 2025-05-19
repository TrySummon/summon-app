import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useApis } from "@/hooks/useApis";
import { listApiTools } from "@/helpers/ipc/openapi/openapi-client";
import { McpToolDefinition } from "@/helpers/openapi/types";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Server } from "lucide-react";
import { SubNav } from "@/components/SubNav";
import { Markdown } from "@/components/ui/markdown";
import { AuthorizationTab } from "@/components/AuthorizationTab";
import { Toaster } from "@/components/ui/sonner";

// Define the search params interface
interface ApiPageSearchParams {
  tab?: string;
}

export default function ApiPage() {
  const { apiId } = useParams({ from: "/api/$apiId" });
  const navigate = useNavigate();
  const search = useSearch({ from: "/api/$apiId" }) as ApiPageSearchParams;
  const { apis } = useApis();
  const [apiTools, setApiTools] = useState<McpToolDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(search.tab || "overview");
  
  const api = apis.find(a => a.id === apiId);
  
  useEffect(() => {
    async function fetchApiTools() {
      if (!apiId) return;
      
      setIsLoading(true);
      try {
        const result = await listApiTools(apiId);
        if (result.success) {
          setApiTools(result.tools || []);
        } else {
          setError("Failed to load API tools");
        }
      } catch (err) {
        console.error('Failed to load API tools:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchApiTools();
  }, [apiId]);
  
  if (!api) {
    return (
      <div className="p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>API Not Found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">API Not Found</h1>
          <p className="mt-2">The API you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }
  
  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Use the to parameter with search params to avoid type errors
    navigate({
      to: `/api/${apiId}`,
      search: { tab: value },
      replace: true
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b -mt-[1px] flex-shrink-0">
        <Button variant="ghost" size="sm"><Server className="size-3 mr-2" /> {api.api.name}</Button>
      </div>
      <div className="p-3 flex-shrink-0">
        <SubNav 
          items={[
            { name: "Overview", href: `/api/${api.id}`, value: "overview" },
            { name: "Authorization", href: `/api/${api.id}`, value: "auth" },
          ]} 
          value={activeTab}
          onValueChange={handleTabChange}
        />
      </div>
      <div className="flex flex-col overflow-y-auto flex-1">
        {activeTab === "overview" && (
          <div className="mx-20 mt-6 mb-4">
            <Markdown content={api.api.description || ''} />
          </div>
        )}
        {activeTab === "auth" && (
          <AuthorizationTab apiId={api.id} />
        )}
      </div>
      <Toaster />
    </div>
  );
}
