import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import { generateApiId } from "./id-generator";
import { OpenAPIV3 } from "openapi-types";
import fsSync from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";

// Define the API data structure that will be stored in files
interface ApiData {
  id: string;
  originalFilePath: string;
  api?: OpenAPIV3.Document; // Optional as we'll load it on demand
}

// Define the directory where API data will be stored
export const getApiDataDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "api-data");
};

// Ensure the API data directory exists
const ensureApiDataDir = async () => {
  const apiDataDir = getApiDataDir();
  try {
    await fs.mkdir(apiDataDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create API data directory:", error);
    throw error;
  }
};

// Get the file path for an API
const getApiFilePath = (apiId: string) => {
  return path.join(getApiDataDir(), `${apiId}.json`);
};

const getApiOriginalFilePath = (apiId: string) => {
  return path.join(getApiDataDir(), `${apiId}-original.json`);
};

// Check if an API exists
const apiExists = async (apiId: string): Promise<boolean> => {
  try {
    await fs.access(getApiFilePath(apiId));
    return true;
  } catch {
    return false;
  }
};

// Create a new API and its tools
const createApi = async (buffer: Buffer): Promise<string> => {
  await ensureApiDataDir();

  // Parse the API spec to extract the name
  let apiName: string | undefined;
  try {
    const apiSpec = JSON.parse(buffer.toString()) as OpenAPIV3.Document;
    apiName = apiSpec.info?.title;
  } catch (error) {
    console.warn("Failed to parse API spec for name extraction:", error);
  }

  // Generate a unique ID for the API
  const apiId = generateApiId(apiName);
  // Save the original file
  const originalFilePath = getApiOriginalFilePath(apiId);
  await fs.writeFile(originalFilePath, buffer);

  // Create the API metadata file
  const apiData: ApiData = { id: apiId, originalFilePath };
  await fs.writeFile(getApiFilePath(apiId), JSON.stringify(apiData, null, 2));

  return apiId;
};

// List all APIs
const listApis = async (): Promise<ApiData[]> => {
  await ensureApiDataDir();

  try {
    const files = await fs.readdir(getApiDataDir());
    // Filter only API metadata files (not the original spec files which end with -original.json)
    const apiFiles = files.filter(
      (file) => file.endsWith(".json") && !file.endsWith("-original.json"),
    );

    const apis: ApiData[] = [];

    for (const file of apiFiles) {
      try {
        const filePath = path.join(getApiDataDir(), file);
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
            console.error(
              `Error loading API spec for file ${file}:`,
              specError,
            );
          }
        }

        apis.push(apiData);
      } catch (error) {
        console.error(`Error reading API file ${file}:`, error);
        // Continue with other files
      }
    }

    return apis;
  } catch (error) {
    console.error("Error listing APIs:", error);
    return [];
  }
};

// Get an API by ID
export const getApiById = async (
  id: string,
  loadSpec: boolean = true,
): Promise<ApiData | null> => {
  if (!(await apiExists(id))) {
    return null;
  }

  try {
    const fileContent = await fs.readFile(getApiFilePath(id), "utf-8");
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
        console.error(`Error loading API spec for ID ${id}:`, specError);
      }
    }

    return apiData;
  } catch (error) {
    console.error(`Error getting API with ID ${id}:`, error);
    return null;
  }
};

// Update an API
const updateApi = async (id: string, buffer: Buffer): Promise<boolean> => {
  if (!(await apiExists(id))) {
    return false;
  }

  try {
    // Get existing API data to keep the original file path
    const existingApiData = await getApiById(id, false);
    if (!existingApiData) {
      return false;
    }

    // Update the original file
    await fs.writeFile(existingApiData.originalFilePath, buffer);

    const originalFilePath = getApiOriginalFilePath(id);
    await fs.writeFile(originalFilePath, buffer);

    return true;
  } catch (error) {
    console.error(`Error updating API with ID ${id}:`, error);
    return false;
  }
};

// Delete an API and all its tools
const deleteApi = async (id: string): Promise<boolean> => {
  if (!(await apiExists(id))) {
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
        console.error(
          `Error deleting original file for API ${id}:`,
          originalFileError,
        );
      }
    }

    // Delete the API file
    await fs.unlink(getApiFilePath(id));

    return true;
  } catch (error) {
    console.error(`Error deleting API with ID ${id}:`, error);
    return false;
  }
};

// Get the original file content
const getOriginalFileContent = async (id: string): Promise<Buffer | null> => {
  const apiData = await getApiById(id, false);
  if (!apiData || !apiData.originalFilePath) {
    return null;
  }

  try {
    return await fs.readFile(apiData.originalFilePath);
  } catch (error) {
    console.error(`Error reading original file for API ${id}:`, error);
    return null;
  }
};

// Export the API database functions
export const apiDb = {
  createApi,
  listApis,
  getApiById,
  updateApi,
  deleteApi,
  getOriginalFileContent,
};
