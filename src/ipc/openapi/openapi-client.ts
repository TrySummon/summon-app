import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { captureEvent } from "@/lib/posthog";

// API operations with PostHog instrumentation
export const importApi = async (file: File) => {
  const result = await window.openapi.import(file);
  captureEvent("openapi_import", {
    file_size: file.size,
    success: result.success,
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
};

export const listApis = async () => {
  return window.openapi.db.listApis();
};

export const getApi = async (id: string) => {
  return window.openapi.db.getApi(id);
};

export const deleteApi = async (id: string) => {
  captureEvent("openapi_delete");
  return window.openapi.db.deleteApi(id);
};

// Custom API operation for renaming an API
export const renameApi = async (apiId: string, newName: string) => {
  captureEvent("openapi_rename");
  return window.openapi.db.renameApi(apiId, newName);
};

export const convertEndpointToTool = async (
  apiId: string,
  endpoint: SelectedEndpoint,
) => {
  return window.openapi.convertEndpointToTool(apiId, endpoint);
};
