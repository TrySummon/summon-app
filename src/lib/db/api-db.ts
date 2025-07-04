import path from "path";
import fs from "fs/promises";
import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";
import log from "electron-log/main";
import { workspaceDb } from "./workspace-db";
import { toHyphenCase } from "../string";

// Define the directory where API data will be stored for a specific workspace
const getApiDataDirForWorkspace = (workspaceId: string) => {
  const workspaceDataDir = workspaceDb.getWorkspaceDataDir(workspaceId);
  return path.join(workspaceDataDir, "api-data");
};

// Export a function to get API data directory for current workspace
export const getCurrentWorkspaceApiDataDir = async () => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  return getApiDataDirForWorkspace(currentWorkspace.id);
};

// Export for backward compatibility - but now returns current workspace's directory
export const getApiDataDir = getCurrentWorkspaceApiDataDir;

// Ensure the API data directory exists for a workspace
const ensureApiDataDir = async (workspaceId: string) => {
  const apiDataDir = getApiDataDirForWorkspace(workspaceId);
  try {
    await fs.mkdir(apiDataDir, { recursive: true });
  } catch (error) {
    log.error("Failed to create API data directory:", error);
    throw error;
  }
};

// Get the file path for an API in a specific workspace
const getApiFilePath = (workspaceId: string, apiId: string) => {
  return path.join(getApiDataDirForWorkspace(workspaceId), `${apiId}.json`);
};

// Check if an API exists in a workspace
const apiExists = async (
  workspaceId: string,
  apiId: string,
): Promise<boolean> => {
  try {
    await fs.access(getApiFilePath(workspaceId, apiId));
    return true;
  } catch {
    return false;
  }
};

// Create a new API in the current workspace
const createApi = async (buffer: Buffer): Promise<string> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  await ensureApiDataDir(currentWorkspace.id);

  // Parse the API spec to extract the name
  let apiSpec: OpenAPIV3.Document;
  try {
    apiSpec = JSON.parse(buffer.toString()) as OpenAPIV3.Document;
  } catch (error) {
    log.error("Failed to parse API spec:", error);
    throw new Error("Invalid JSON format");
  }

  const apiTitle = apiSpec.info?.title;
  if (!apiTitle) {
    throw new Error("OpenAPI spec must have a title in info.title");
  }

  // Generate kebab-case filename from the title
  const apiId = toHyphenCase(apiTitle);

  if (!apiId) {
    throw new Error("API title cannot be converted to a valid filename");
  }

  // Check if a file with this name already exists
  if (await apiExists(currentWorkspace.id, apiId)) {
    return apiId;
  }

  // Save the raw API spec directly to the file system
  await fs.writeFile(
    getApiFilePath(currentWorkspace.id, apiId),
    JSON.stringify(apiSpec, null, 2),
  );

  return apiId;
};

// List all APIs in the current workspace
const listApis = async (): Promise<
  { id: string; api: OpenAPIV3.Document }[]
> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  await ensureApiDataDir(currentWorkspace.id);

  try {
    const files = await fs.readdir(
      getApiDataDirForWorkspace(currentWorkspace.id),
    );
    // Filter only JSON files
    const apiFiles = files.filter((file) => file.endsWith(".json"));

    const apis: { id: string; api: OpenAPIV3.Document }[] = [];

    for (const file of apiFiles) {
      try {
        const apiId = path.basename(file, ".json");
        const filePath = path.join(
          getApiDataDirForWorkspace(currentWorkspace.id),
          file,
        );
        const fileContent = await fs.readFile(filePath, "utf-8");
        const apiSpec = JSON.parse(fileContent) as OpenAPIV3.Document;

        // Dereference the API spec
        try {
          const dereferencedSpec = (await SwaggerParser.dereference(
            apiSpec,
          )) as OpenAPIV3.Document;

          apis.push({
            id: apiId,
            api: dereferencedSpec,
          });
        } catch (specError) {
          log.error(
            `Error dereferencing API spec for file ${file}:`,
            specError,
          );
          // Still add the API even if dereferencing fails
          apis.push({
            id: apiId,
            api: apiSpec,
          });
        }
      } catch (error) {
        log.error(`Error reading API file ${file}:`, error);
        // Continue with other files
      }
    }

    return apis;
  } catch (error) {
    log.error("Error listing APIs:", error);
    return [];
  }
};

// Get an API by ID from the current workspace
export const getApiById = async (
  id: string,
  dereference: boolean = true,
): Promise<{ id: string; api: OpenAPIV3.Document } | null> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();

  if (!(await apiExists(currentWorkspace.id, id))) {
    return null;
  }

  try {
    const fileContent = await fs.readFile(
      getApiFilePath(currentWorkspace.id, id),
      "utf-8",
    );
    const apiSpec = JSON.parse(fileContent) as OpenAPIV3.Document;

    // Dereference the spec if requested
    if (dereference) {
      try {
        const dereferencedSpec = (await SwaggerParser.dereference(
          apiSpec,
        )) as OpenAPIV3.Document;

        return {
          id,
          api: dereferencedSpec,
        };
      } catch (specError) {
        log.error(`Error dereferencing API spec for ID ${id}:`, specError);
        // Return the original spec if dereferencing fails
        return {
          id,
          api: apiSpec,
        };
      }
    }

    return {
      id,
      api: apiSpec,
    };
  } catch (error) {
    log.error(`Error getting API with ID ${id}:`, error);
    return null;
  }
};

// Update an API in the current workspace
const renameApi = async (id: string, newName: string): Promise<boolean> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();

  // Get existing API data
  const existingApiData = await getApiById(id, false);
  if (!existingApiData) {
    throw new Error(`API with ID ${id} not found`);
  }

  // Generate new ID from the new name
  const newId = toHyphenCase(newName);

  if (!newId) {
    throw new Error("New name cannot be converted to a valid filename");
  }

  // Check if the new filename would conflict (only if it's different from current)
  if (newId !== id && (await apiExists(currentWorkspace.id, newId))) {
    throw new Error(
      `An API with the title "${newName}" already exists. Please choose a different title.`,
    );
  }

  // Update the API spec with the new title
  const updatedApiSpec = {
    ...existingApiData.api,
    info: {
      ...existingApiData.api.info,
      title: newName,
    },
  };

  // If the ID changed, we need to rename the file
  if (newId !== id) {
    // Save with new filename
    await fs.writeFile(
      getApiFilePath(currentWorkspace.id, newId),
      JSON.stringify(updatedApiSpec, null, 2),
    );

    // Delete old file
    await fs.unlink(getApiFilePath(currentWorkspace.id, id));
  } else {
    // Just update the existing file
    await fs.writeFile(
      getApiFilePath(currentWorkspace.id, id),
      JSON.stringify(updatedApiSpec, null, 2),
    );
  }

  return true;
};

// Delete an API from the current workspace
const deleteApi = async (id: string): Promise<boolean> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();

  if (!(await apiExists(currentWorkspace.id, id))) {
    return false;
  }

  try {
    await fs.unlink(getApiFilePath(currentWorkspace.id, id));
    return true;
  } catch (error) {
    log.error(`Error deleting API with ID ${id}:`, error);
    return false;
  }
};

// Get the original file content for an API in the current workspace
const getOriginalFileContent = async (id: string): Promise<Buffer | null> => {
  const apiData = await getApiById(id, false);
  if (!apiData) {
    return null;
  }

  try {
    return Buffer.from(JSON.stringify(apiData.api, null, 2));
  } catch (error) {
    log.error(`Error getting original file content for API ${id}:`, error);
    return null;
  }
};

// Export the API database functions
export const apiDb = {
  createApi,
  listApis,
  getApiById,
  renameApi,
  deleteApi,
  getOriginalFileContent,
};
