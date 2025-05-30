import { ipcMain } from "electron";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  UPDATE_API_CHANNEL,
  DELETE_API_CHANNEL,
} from "./openapi-channels";
import { apiDb } from "@/helpers/db/api-db";
import fs from 'fs';
import path from 'path';
import os from 'os';
import SwaggerParser from "@apidevtools/swagger-parser";

interface ImportApiRequest {
  filename: string;
  buffer: Buffer;
}

/**
 * Checks if a JSON object is an OpenAPI specification with version >= 3
 * @param jsonObject The object to validate
 * @returns boolean indicating if the object is an OpenAPI spec with version >= 3
 */
function isOpenAPISpecV3OrHigher(jsonObject: any): boolean {
  // Check if the object has an 'openapi' property
  if (typeof jsonObject.openapi !== 'string') {
    return false;
  }
  
  // Check if the openapi version is 3.x.x or higher
  const versionMatch = jsonObject.openapi.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!versionMatch) {
    return false;
  }
  
  // Extract the major version number
  const majorVersion = parseInt(versionMatch[1], 10);
  
  // Return true if major version is >= 3
  return majorVersion >= 3;
}

export function registerOpenApiListeners() {
  // Handle API import
  ipcMain.handle(IMPORT_API_CHANNEL, async (_, request: ImportApiRequest) => {
    // Create a temporary file to store the OpenAPI spec
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `openapi-spec-${Date.now()}.json`);
    
    try {
      const { buffer } = request;
      // Reconstruct Buffer from the array of integers that came through IPC
      const reconstructedBuffer = Buffer.from(buffer);

      
      const valid = isOpenAPISpecV3OrHigher(JSON.parse(reconstructedBuffer.toString()));

      if (!valid) {
        return {
          success: false,
          message: "Invalid OpenAPI spec"
        };
      }

      // Store the original API file in the file system
      const apiId = await apiDb.createApi(reconstructedBuffer);
      
      return {
        success: true,
        message: "API imported successfully",
        apiId
      };
    } catch (error) {
      console.error("Error importing API:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }
    }
  });

  // List all APIs
  ipcMain.handle(LIST_APIS_CHANNEL, async () => {
    try {
      const apis = await apiDb.listApis();
      return {
        success: true,
        apis
      };
    } catch (error) {
      console.error("Error listing APIs:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Get a specific API by ID
  ipcMain.handle(GET_API_CHANNEL, async (_, id: string) => {
    try {
      const apiData = await apiDb.getApiById(id, true);

      if (apiData?.api) {
        apiData.api = await SwaggerParser.dereference(apiData.api) as any;
      }
      
      if (!apiData) {
        return {
          success: false,
          message: `API with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        api: apiData
      };
    } catch (error) {
      console.error(`Error getting API with ID ${id}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Update an API
  ipcMain.handle(UPDATE_API_CHANNEL, async (_, request: { id: string; buffer: Buffer }) => {
    try {
      const { id, buffer } = request;
  
    
        // Validate the OpenAPI spec using swagger-parser
        const valid = isOpenAPISpecV3OrHigher(JSON.parse(buffer.toString()));
        
        if (!valid) {
          return {
            success: false,
            message: "Invalid OpenAPI spec"
          };
        }
   
      const success = await apiDb.updateApi(id, buffer);
      
      if (!success) {
        return {
          success: false,
          message: `API with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        message: "API updated successfully"
      };
    } catch (error) {
      console.error("Error updating API:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Delete an API
  ipcMain.handle(DELETE_API_CHANNEL, async (_, id: string) => {
    try {
      const success = await apiDb.deleteApi(id);
      
      if (!success) {
        return {
          success: false,
          message: `API with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        message: "API deleted successfully"
      };
    } catch (error) {
      console.error(`Error deleting API with ID ${id}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
