import React, { useMemo, useState, useEffect } from "react";
import { useApis } from "@/hooks/useApis";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { PlusCircle, Rocket, Wrench } from "lucide-react";
import { EndpointPickerDialog } from "@/components/mcp-builder/EndpointPickerDialog";
import { ApiPickerDialog } from "@/components/mcp-builder/ApiPickerDialog";
import { SelectedEndpointsDisplay } from "@/components/mcp-builder/SelectedEndpointsDisplay";
import { ApiGroup, StartMcpDialog } from "@/components/mcp-builder/start-mcp-dialog";
import { useSearch } from "@tanstack/react-router";
import { McpEndpoint } from "@/helpers/db/mcp-db";
import { OpenAPIV3 } from "openapi-types";

export default function BuildMcpPage() {
  const { apis, isLoading } = useApis();
  // Get search params from Tanstack Router
  const search = useSearch({ from: '/build-mcp' });
  const editParam = search.edit as string | undefined;
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMcpId, setEditMcpId] = useState<string | null>(null);
  const [editMcpData, setEditMcpData] = useState<any>(null);
  const [isLoadingMcp, setIsLoadingMcp] = useState(false);
  
  // State for API picker dialog
  const [apiPickerOpen, setApiPickerOpen] = useState(false);
  
  // State for endpoint picker dialog
  const [selectedApi, setSelectedApi] = useState<{id: string, api: OpenAPIV3.Document} | null>(null);
  const [endpointPickerOpen, setEndpointPickerOpen] = useState(false);
  // State for start MCP dialog
  const [startMcpOpen, setStartMcpOpen] = useState(false);
  
  // State for selected endpoints
  const [selectedEndpoints, setSelectedEndpoints] = useState<Array<McpEndpoint>>([]);
  
  // Check for edit mode from Tanstack Router search params
  useEffect(() => {
    if (editParam) {
      setIsEditMode(true);
      setEditMcpId(editParam);
      loadMcpData(editParam);
    } else {
      // Reset edit mode when edit parameter is removed
      setIsEditMode(false);
      setEditMcpId(null);
      setEditMcpData(null);
      setSelectedEndpoints([]);
    }
  }, [editParam]);
  
  // Load MCP data for edit mode
  const loadMcpData = async (mcpId: string) => {
    setIsLoadingMcp(true);
    try {
      const result = await window.mcpApi.getMcp(mcpId);
      if (result.success && result.mcp) {
        setEditMcpData(result.mcp);
        
        // Extract endpoints from the MCP data
        const endpoints: any[] = [];
        
        // Process each API group to extract endpoints
        Object.entries(result.mcp.apiGroups).forEach(([apiId, apiConfig]: [string, any]) => {
          if (apiConfig.endpoints && apiConfig.endpoints.length > 0) {
            endpoints.push(...apiConfig.endpoints);
          }
        });
        
        setSelectedEndpoints(endpoints);
      }
    } catch (error) {
      console.error('Error loading MCP data:', error);
    } finally {
      setIsLoadingMcp(false);
    }
  };

    // Group endpoints by API
    const apiGroups = useMemo(() => selectedEndpoints.reduce((acc, endpoint) => {
      const apiName = endpoint.apiName.split(' ')[0].trim().toLowerCase();
      if (!acc[endpoint.apiId]) {
        acc[endpoint.apiId] = {
          apiId: endpoint.apiId,
          apiName,
          endpoints: [],
        };
      }   
      acc[endpoint.apiId].endpoints.push(endpoint);
      return acc;
    }, {} as Record<string, ApiGroup>), [selectedEndpoints, apis]);
  
  
  // Handler for opening the API picker dialog
  const handlePickEndpoints = () => {
    setApiPickerOpen(true);
  };
  
  // Handler for selecting an API from the API picker dialog
  const handleApiSelect = (api: {id: string, api: OpenAPIV3.Document}) => {
    setSelectedApi(api);
    setApiPickerOpen(false);
    setEndpointPickerOpen(true);
  };
  
  // Handler for back button click in the endpoint picker dialog
  const handleEndpointPickerBack = () => {
    setApiPickerOpen(true);
  };
  
  // Handler for updating selected endpoints from the endpoint picker dialog
  const handleEndpointsUpdate = (apiId: string, apiName: string, selectedEndpointIds: string[]) => {
    // First, remove any existing endpoints for this API
    const filteredEndpoints = selectedEndpoints.filter(endpoint => endpoint.apiId !== apiId);
    
    // Then add the newly selected endpoints
    const api = apis.find(a => a.id === apiId);
    if (!api) return;
    
    const newEndpoints = selectedEndpointIds.map(id => {
      const [method, path] = id.split('-');
      const pathObj = api.api.paths[path] || {};
      const operation = (method in pathObj ? pathObj[method as keyof typeof pathObj] : {}) as OpenAPIV3.OperationObject;
      
      return {
        apiId,
        apiName,
        method,
        path,
        operation,
      };
    });
    
    setSelectedEndpoints([...filteredEndpoints, ...newEndpoints]);
  };
  
  // Handler for removing an endpoint
  const handleRemoveEndpoint = (apiId: string, method: string, path: string) => {
    setSelectedEndpoints(prev => 
      prev.filter(endpoint => 
        !(endpoint.apiId === apiId && endpoint.method === method && endpoint.path === path)
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/build-mcp" search={{ edit: undefined }}>
                <BreadcrumbPage>
                  <Wrench className="size-3 mr-2" /> Build an MCP Server
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-1 overflow-y-auto">

      <div className="flex flex-col items-center p-10 mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">{isEditMode ? `Edit MCP Server ${editMcpData?.name}` : 'Build an MCP Server'}</h1>
        <p className="text-muted-foreground mb-8">
          Generate your own MCP Server using your APIs.
        </p>

        {isLoading || isLoadingMcp ? (
          <div className="flex items-center justify-center w-full">
            <p>Loading APIs...</p>
          </div>
        ) : apis.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/20 w-full">
            <p className="text-lg mb-2">No APIs Available</p>
            <p className="text-muted-foreground">
              You can only build an MCP out of uploaded APIs. Please upload an API first.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-8">
            {/* Button to pick endpoints */}
            <div className="flex justify-center">
              <Button 
                onClick={handlePickEndpoints}
                className="w-full gap-2"
                variant="outline"
              >
                <PlusCircle className="h-4 w-4" />
                {isEditMode ? 'Edit Endpoints' : 'Pick Endpoints'}
              </Button>
            </div>
            
            {/* Selected endpoints display or no endpoints message */}
            {selectedEndpoints.length > 0 ? (
                <SelectedEndpointsDisplay 
                  selectedEndpoints={selectedEndpoints}
                  onRemoveEndpoint={handleRemoveEndpoint}
                />
            ) : (
              <div className="text-center py-6 w-full">
                <p className="text-sm font-medium mb-1">No Endpoints Selected</p>
                <p className="text-xs text-muted-foreground">
                  Click "Pick Endpoints" to select endpoints for your MCP server.
                </p>
              </div>
            )}
            
              <div className="flex justify-center mt-8">
                <Button 
                  className="w-full" 
                  disabled={selectedEndpoints.length === 0}
                  onClick={() => setStartMcpOpen(true)}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update & Restart Server' : 'Create & Start Server'}
                </Button>
              </div>
            
            {/* API Picker Dialog */}
            <ApiPickerDialog
              open={apiPickerOpen}
              onOpenChange={setApiPickerOpen}
              apis={apis}
              onApiSelect={handleApiSelect}
            />
            
            {/* Endpoint Picker Dialog */}
            {selectedApi && (
              <EndpointPickerDialog
                open={endpointPickerOpen}
                onOpenChange={setEndpointPickerOpen}
                api={selectedApi}
                onEndpointsUpdate={(selectedEndpointIds) => {
                  handleEndpointsUpdate(
                    selectedApi.id, 
                    selectedApi.api.info.title, 
                    selectedEndpointIds
                  );
                }}
                initialSelectedEndpoints={selectedEndpoints
                  .filter(endpoint => endpoint.apiId === selectedApi.id)
                  .map(endpoint => `${endpoint.method}-${endpoint.path}`)
                }
                onBackClick={handleEndpointPickerBack}
              />
            )}
            
            {/* Start MCP Dialog */}
            <StartMcpDialog
              open={startMcpOpen}
              onOpenChange={setStartMcpOpen}
              apiGroups={apiGroups}
              isEditMode={isEditMode}
              editMcpData={editMcpData}
              editMcpId={editMcpId}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
