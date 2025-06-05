import { captureEvent } from "@/lib/posthog";
import { OpenAPIV3 } from "openapi-types";

// API operations with PostHog instrumentation
export const importApi = async (file: File) => {
  const result = await window.openapi.import(file);
  captureEvent("openapi_import", {
    file_size: file.size,
    success: result.success,
  });

  return result;
};

export const listApis = async () => {
  return window.openapi.db.listApis();
};

export const getApi = async (id: string) => {
  return window.openapi.db.getApi(id);
};

export const updateApi = async (id: string, api: OpenAPIV3.Document) => {
  return window.openapi.db.updateApi(id, api);
};

export const deleteApi = async (id: string) => {
  captureEvent("openapi_delete");
  return window.openapi.db.deleteApi(id);
};

// Custom API operation for renaming an API
export const renameApi = async (apiId: string, newName: string) => {
  captureEvent("openapi_rename");

  try {
    // First get the API to update
    const getResult = await getApi(apiId);
    if (!getResult.success || !getResult.api) {
      return { success: false, message: getResult.message || "API not found" };
    }

    // Save the updated API
    const updateResult = await updateApi(apiId, {
      ...getResult.api.api,
      info: {
        ...getResult.api.api.info,
        title: newName,
      },
    });
    return updateResult;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while renaming API",
    };
  }
};
