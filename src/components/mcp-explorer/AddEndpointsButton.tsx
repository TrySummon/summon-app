import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { OpenAPIV3 } from "openapi-types";
import { useApis } from "@/hooks/useApis";
import { ApiPickerDialog } from "@/components/mcp-builder/ApiPickerDialog";
import { EndpointPickerDialog } from "@/components/mcp-builder/endpoint-picker";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";

interface AddToolsButtonProps {
  onAddEndpoints: (apiId: string, tools: SelectedEndpoint[]) => void;
}

export const AddEndpointsButton = ({ onAddEndpoints }: AddToolsButtonProps) => {
  const { apis, isLoading: apisLoading } = useApis();

  // State for dialogs
  const [apiPickerOpen, setApiPickerOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<{
    id: string;
    api: OpenAPIV3.Document;
  } | null>(null);
  const [endpointPickerOpen, setEndpointPickerOpen] = useState(false);

  // Handler for selecting an API from the API picker dialog
  const handleApiSelect = (api: { id: string; api: OpenAPIV3.Document }) => {
    setSelectedApi(api);
    setApiPickerOpen(false);
    setEndpointPickerOpen(true);
  };

  // Handler for back button click in the endpoint picker dialog
  const handleEndpointPickerBack = () => {
    setApiPickerOpen(true);
  };

  return (
    <>
      <Button
        onClick={() => setApiPickerOpen(true)}
        className="w-full gap-2"
        disabled={apisLoading}
      >
        <PlusCircle className="h-4 w-4" />
        Add Tools Manually
      </Button>

      {/* Dialogs */}
      <ApiPickerDialog
        open={apiPickerOpen}
        onOpenChange={setApiPickerOpen}
        apis={apis}
        onApiSelect={handleApiSelect}
      />

      {selectedApi && (
        <EndpointPickerDialog
          open={endpointPickerOpen}
          onOpenChange={setEndpointPickerOpen}
          api={selectedApi}
          onAddEndpoints={(selectedEndpoints) =>
            onAddEndpoints(selectedApi.id, selectedEndpoints)
          }
          onBackClick={handleEndpointPickerBack}
        />
      )}
    </>
  );
};
