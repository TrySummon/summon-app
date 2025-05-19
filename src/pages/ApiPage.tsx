import React, { useState } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Server, Globe, ExternalLink, Copy } from "lucide-react";
import { SubNav } from "@/components/SubNav";
import { Markdown } from "@/components/markdown";
import { AuthorizationTab } from "@/components/AuthorizationTab";
import { Toaster } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// Define the search params interface
interface ApiPageSearchParams {
  tab?: string;
}

export default function ApiPage() {
  const { apiId } = useParams({ from: "/api/$apiId" });
  const navigate = useNavigate();
  const search = useSearch({ from: "/api/$apiId" }) as ApiPageSearchParams;
  const { apis } = useApis();
  const [activeTab, setActiveTab] = useState<string>(search.tab || "overview");
  
  const api = apis.find(a => a.id === apiId);
  

  
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
        <Button variant="ghost" size="sm"><Server className="size-3 mr-2" /> {api.api.info.title}</Button>
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
            {/* Server Information Section */}
            {api.api.servers && api.api.servers.length > 0 && (
              <Card className="mb-8">
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <Globe className="mr-2 h-5 w-5 text-muted-foreground" />
                    <CardTitle>Servers</CardTitle>
                  </div>
                  <CardDescription>
                    Available server endpoints for this API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {api.api.servers.map((server, index) => (
                      <div key={index} className="rounded-md border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Server className="mr-2 h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium">
                              {server.description || `Server ${index + 1}`}
                            </h4>
                          </div>
                          <div className="flex space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.writeText(server.url);
                                      toast.success("Server URL copied to clipboard");
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy URL</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {server.url.startsWith('http') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(server.url, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Open in new tab</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {server.url}
                          </Badge>
                        </div>
                        {server.variables && Object.keys(server.variables).length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2">Variables:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(server.variables).map(([name, variable]) => (
                                <div key={name} className="flex items-center space-x-2 text-sm">
                                  <span className="font-medium">{name}:</span>
                                  <span>{variable.default}</span>
                                  {variable.enum && (
                                    <Badge variant="secondary" className="text-xs">
                                      {variable.enum.length} options
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* API Description */}
            <Markdown>
            {api.api.info.description || '* No description provided *'}
            </Markdown>
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
