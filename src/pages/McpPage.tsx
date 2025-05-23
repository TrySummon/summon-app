import React, { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useMcps } from "@/hooks/useMcps";
import { useMcpServerStatus } from "@/hooks/useMcpServerStatus";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Server, AlertCircle, RefreshCw } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@modelcontextprotocol/sdk/types";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";



// Helper function to extract parameters from a tool's inputSchema
const extractToolParameters = (tool: Tool) => {
  // Check if inputSchema exists and has properties
  if (!tool.inputSchema || !tool.inputSchema.properties) return [];
  
  const properties = tool.inputSchema.properties;
  const required = tool.inputSchema.required || [];
  
  console.log(tool)
  
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    description: (prop as any).description,
    type: (prop as any).type,
    required: required.includes(name),
    properties: (prop as any).properties
  }));
};

export default function McpPage() {
  const { mcpId } = useParams({ from: "/mcp/$mcpId" });
  const { mcps } = useMcps();
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);

  
  const { 
    status,
    url,
    error,
    isLoading: statusLoading, 
    refreshStatus
  } = useMcpServerStatus(mcpId);
  
  const mcp = mcps.find(m => m.id === mcpId);
  
  useEffect(() => {
    const fetchMcpTools = async () => {
      if (status === "running" && url && mcp) {
        try {
          // Create the transport configuration based on the MCP data
          const transport = {
            type: mcp.transport,
            url: url
          };
          
          const response = await window.mcpApi.getMcpTools(transport);
          if (response.success && response.data) {
            setMcpTools(response.data);

          }
        } catch (err) {
          console.error("Failed to fetch MCP tools:", err);
        }
      }
    };
    
    fetchMcpTools();
  }, [mcpId, status, url, mcp]);
  
  if (!mcp) {
    return (
      <NotFound
        title="MCP Not Found"
        message="The MCP you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "MCP Not Found", isActive: true }
        ]}
      />
    );
  }

  console.log(mcpTools)

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/mcp/$mcpId" params={{mcpId: mcp.id}}>
                <BreadcrumbPage>
                  <Server className="size-3 mr-2" /> {mcp.name}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
 
      <div className="flex flex-col overflow-y-auto flex-1">
        <div className="container py-6 max-w-4xl mx-auto">
          {statusLoading ? (
            <div className="bg-white p-6 rounded-md shadow-sm">
              <div className="flex items-center justify-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p>Checking server status...</p>
              </div>
            </div>
          ) : status === "running" ? (
            <div className="space-y-6">
              {/* Server Status Section */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{mcp.name} MCP Server</h2>
                    <p className="text-muted-foreground text-sm">Transport: {mcp.transport}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 inline-block"></span>
                    Running
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <code className="text-sm font-mono">{url}</code>
                  <div className="flex items-center gap-2">
                    <CopyButton content={url} />
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button onClick={refreshStatus} variant="outline" size="sm" className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Status
                  </Button>
                </div>

              {/* Tools Section */}
              {mcpTools.length > 0 && (
                <div className="space-y-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">Available MCP Tools</h2>
                    <p className="text-muted-foreground text-sm">Expand a tool to view its details and parameters</p>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full border rounded-md">
                    {mcpTools.map((tool, index) => (
                      <AccordionItem key={tool.name} value={`tool-${index}`} className="px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-col items-start gap-1 text-left w-full">
                            <span className="font-medium">{tool.name}</span>
                            {tool.description && (
                              <p className="text-sm text-muted-foreground font-normal">{tool.description}</p>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 bg-accent">
                            {/* Display tool schema details */}
                            {tool.inputSchema && tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                              <div className="border-t pt-4">
                                <div className="space-y-4">
                                  {extractToolParameters(tool).map((param, idx) => (
                                    <div key={idx}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-xs font-semibold text-foreground">{param.name}</span>
                                   

          <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                                          {param.type}
                                        </Badge>

                                        {param.required && (
                                                  <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
                                                    required
                                                  </Badge>
                                                )}
                                      </div>
                                      
                                      {param.description && (
                                        <p className="text-xs text-muted-foreground mb-2">{param.description}</p>
                                      )}
                                      
                                      {param.properties && Object.keys(param.properties).length > 0 && (
                                        <div className="mt-2 p-2 rounded border bg-muted/50">
                                          <h5 className="text-sm font-medium mb-1">Properties:</h5>
                                          <pre className="text-xs overflow-auto p-2 rounded">
                                            {JSON.stringify(param.properties, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">This tool has no parameters.</p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          ) : status === "starting" ? (
            <div>
              <h2 className="text-xl font-bold mb-4">MCP Server Status</h2>
              <Alert className="bg-yellow-50 border-yellow-500">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-700">Server is starting</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  Your MCP server is currently starting up. Please wait a moment...
                </AlertDescription>
              </Alert>
              <div className="flex justify-end mt-4">
                <Button onClick={refreshStatus} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : status === "error" ? (
            <div>
              <h2 className="text-xl font-bold mb-4">MCP Server Status</h2>
              <Alert variant="destructive" className="border-red-500">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Server error</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : error ? String(error) : "There was an error starting your MCP server."}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end mt-4">
                <Button onClick={refreshStatus} variant="outline" className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold mb-4">MCP Server Status</h2>
              <Alert className="border-gray-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Server is not running</AlertTitle>
                <AlertDescription>
                  Your MCP server is currently stopped. Start the server to access it.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end mt-4">
                <Button onClick={refreshStatus} variant="outline" className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
