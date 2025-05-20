import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { OpenAPIV3 } from 'openapi-types';
import stringify from 'json-stringify-safe';

// Define the API data structure that will be stored in files
interface ApiData {
  id: string;
  api: OpenAPIV3.Document;
}

// Define the directory where API data will be stored
const getApiDataDir = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'api-data');
};

// Ensure the API data directory exists
const ensureApiDataDir = async () => {
  const apiDataDir = getApiDataDir();
  try {
    await fs.mkdir(apiDataDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create API data directory:', error);
    throw error;
  }
};

// Get the file path for an API
const getApiFilePath = (apiId: string) => {
  return path.join(getApiDataDir(), `${apiId}.json`);
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
const createApi = async (api: OpenAPIV3.Document): Promise<string> => {
  await ensureApiDataDir();
  
  // Generate a unique ID for the API
  const apiId = uuidv4();
  
  // Create the API file
  const apiData: ApiData = { id: apiId, api };
  await fs.writeFile(getApiFilePath(apiId), stringify(apiData, null, 2));
  
  return apiId;
};

// List all APIs
const listApis = async (): Promise<ApiData[]> => {
  await ensureApiDataDir();
  
  try {
    const files = await fs.readdir(getApiDataDir());
    const apiFiles = files.filter(file => file.endsWith('.json'));
    
    const apis: ApiData[] = [];
    
    for (const file of apiFiles) {
      try {
        const filePath = path.join(getApiDataDir(), file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const apiData = JSON.parse(fileContent) as ApiData;
        apis.push(apiData);
      } catch (error) {
        console.error(`Error reading API file ${file}:`, error);
        // Continue with other files
      }
    }
    
    return apis;
  } catch (error) {
    console.error('Error listing APIs:', error);
    return [];
  }
};

// Get an API by ID
const getApiById = async (id: string): Promise<ApiData | null> => {
  if (!await apiExists(id)) {
    return null;
  }
  
  try {
    const fileContent = await fs.readFile(getApiFilePath(id), 'utf-8');
    return JSON.parse(fileContent) as ApiData;
  } catch (error) {
    console.error(`Error getting API with ID ${id}:`, error);
    return null;
  }
};

// Update an API
const updateApi = async (id: string, api: OpenAPIV3.Document): Promise<boolean> => {
  if (!await apiExists(id)) {
    return false;
  }
  
  try {
    const apiData: ApiData = { id, api };
    await fs.writeFile(getApiFilePath(id), stringify(apiData, null, 2));
    return true;
  } catch (error) {
    console.error(`Error updating API with ID ${id}:`, error);
    return false;
  }
};

// Delete an API and all its tools
const deleteApi = async (id: string): Promise<boolean> => {
  if (!await apiExists(id)) {
    return false;
  }
  
  try {
    // Delete the API file
    await fs.unlink(getApiFilePath(id));
    
    return true;
  } catch (error) {
    console.error(`Error deleting API with ID ${id}:`, error);
    return false;
  }
};


// Export the API database functions
export const apiDb = {
  createApi,
  listApis,
  getApiById,
  updateApi,
  deleteApi,
};
