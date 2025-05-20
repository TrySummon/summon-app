import { ipcMain } from "electron";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  UPDATE_API_CHANNEL,
  DELETE_API_CHANNEL,
} from "./openapi-channels";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { apiDb } from "@/helpers/db/api-db";
import fs from 'fs';
import path from 'path';
import os from 'os';

interface ImportApiRequest {
  filename: string;
  buffer: Buffer;
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
      
      // Write the buffer to the temporary file
      fs.writeFileSync(tempFilePath, reconstructedBuffer);
      
      // Validate the OpenAPI spec using swagger-parser with the file path
      const parsedSpec = (await SwaggerParser.dereference(
        tempFilePath
      )) as OpenAPIV3.Document;
      
      // Store the API in the file system
      const apiId = await apiDb.createApi(parsedSpec);
      
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
      const apiData = await apiDb.getApiById(id);
      
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
  ipcMain.handle(UPDATE_API_CHANNEL, async (_, request: { id: string; api: OpenAPIV3.Document }) => {
    try {
      const { id, api } = request;
      const success = await apiDb.updateApi(id, api);
      
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
