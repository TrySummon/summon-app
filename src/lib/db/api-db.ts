import path from "path";
import fs from "fs/promises";
import { generateApiId } from "./id-generator";
import { OpenAPIV3 } from "openapi-types";
import fsSync from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import log from "electron-log/main";
import { workspaceDb } from "./workspace-db";

// Define the API data structure that will be stored in files
interface ApiData {
  id: string;
  originalFilePath: string;
  api?: OpenAPIV3.Document; // Optional as we'll load it on demand
}

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

const getApiOriginalFilePath = (workspaceId: string, apiId: string) => {
  return path.join(
    getApiDataDirForWorkspace(workspaceId),
    `${apiId}-original.json`,
  );
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
  let apiName: string | undefined;
  try {
    const apiSpec = JSON.parse(buffer.toString()) as OpenAPIV3.Document;
    apiName = apiSpec.info?.title;
  } catch (error) {
    log.warn("Failed to parse API spec for name extraction:", error);
  }

  // Generate a unique ID for the API
  const apiId = generateApiId(apiName);
  // Save the original file
  const originalFilePath = getApiOriginalFilePath(currentWorkspace.id, apiId);
  await fs.writeFile(originalFilePath, buffer);

  // Create the API metadata file
  const apiData: ApiData = { id: apiId, originalFilePath };
  await fs.writeFile(
    getApiFilePath(currentWorkspace.id, apiId),
    JSON.stringify(apiData, null, 2),
  );

  return apiId;
};

// List all APIs in the current workspace
const listApis = async (): Promise<ApiData[]> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  await ensureApiDataDir(currentWorkspace.id);

  try {
    const files = await fs.readdir(
      getApiDataDirForWorkspace(currentWorkspace.id),
    );
    // Filter only API metadata files (not the original spec files which end with -original.json)
    const apiFiles = files.filter(
      (file) => file.endsWith(".json") && !file.endsWith("-original.json"),
    );

    const apis: ApiData[] = [];

    for (const file of apiFiles) {
      try {
        const filePath = path.join(
          getApiDataDirForWorkspace(currentWorkspace.id),
          file,
        );
        const fileContent = await fs.readFile(filePath, "utf-8");
        const apiData = JSON.parse(fileContent) as ApiData;

        // Load the original file content if the path exists
        if (
          apiData.originalFilePath &&
          fsSync.existsSync(apiData.originalFilePath)
        ) {
          try {
            apiData.api = (await SwaggerParser.dereference(
              apiData.originalFilePath,
            )) as OpenAPIV3.Document;
          } catch (specError) {
            log.error(`Error loading API spec for file ${file}:`, specError);
          }
        }

        apis.push(apiData);
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
  loadSpec: boolean = true,
): Promise<ApiData | null> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();

  if (!(await apiExists(currentWorkspace.id, id))) {
    return null;
  }

  try {
    const fileContent = await fs.readFile(
      getApiFilePath(currentWorkspace.id, id),
      "utf-8",
    );
    const apiData = JSON.parse(fileContent) as ApiData;

    // Load and parse the spec if requested
    if (loadSpec && apiData.originalFilePath) {
      try {
        const originalContent = await fs.readFile(
          apiData.originalFilePath,
          "utf-8",
        );
        apiData.api = JSON.parse(originalContent) as OpenAPIV3.Document;
      } catch (specError) {
        log.error(`Error loading API spec for ID ${id}:`, specError);
      }
    }

    return apiData;
  } catch (error) {
    log.error(`Error getting API with ID ${id}:`, error);
    return null;
  }
};

// Update an API in the current workspace
const renameApi = async (id: string, newName: string): Promise<boolean> => {
  // Get existing API data to keep the original file path
  const existingApiData = await getApiById(id, true);
  if (!existingApiData) {
    throw new Error(`API with ID ${id} not found`);
  }

  const updatedApiData = {
    ...existingApiData.api!,
    info: {
      ...existingApiData.api!.info,
      title: newName,
    },
  };

  const buffer = Buffer.from(JSON.stringify(updatedApiData, null, 2));

  // Update the original file
  await fs.writeFile(existingApiData.originalFilePath, buffer);

  return true;
};

// Delete an API from the current workspace
const deleteApi = async (id: string): Promise<boolean> => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();

  if (!(await apiExists(currentWorkspace.id, id))) {
    return false;
  }

  try {
    // Get the API data to find the original file path
    const apiData = await getApiById(id, false);
    if (apiData && apiData.originalFilePath) {
      try {
        // Delete the original file
        await fs.unlink(apiData.originalFilePath);
      } catch (originalFileError) {
        log.error(
          `Error deleting original file for API ${id}:`,
          originalFileError,
        );
      }
    }

    // Delete the API file
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
  if (!apiData || !apiData.originalFilePath) {
    return null;
  }

  try {
    return await fs.readFile(apiData.originalFilePath);
  } catch (error) {
    log.error(`Error reading original file for API ${id}:`, error);
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
