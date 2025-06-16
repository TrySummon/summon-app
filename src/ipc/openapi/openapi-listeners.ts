import { ipcMain } from "electron";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  RENAME_API_CHANNEL,
  DELETE_API_CHANNEL,
} from "./openapi-channels";
import { apiDb } from "@/lib/db/api-db";
import fs from "fs";
import path from "path";
import os from "os";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import log from "electron-log/main";

interface ImportApiRequest {
  filename: string;
  buffer: Buffer;
}

/**
 * Checks if a JSON object is an OpenAPI specification with version >= 3
 * @param jsonObject The object to validate
 * @returns boolean indicating if the object is an OpenAPI spec with version >= 3
 */
function isOpenAPISpecV3OrHigher(jsonObject: Record<string, unknown>): boolean {
  // Check if the object has an 'openapi' property
  if (typeof jsonObject.openapi !== "string") {
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

      const valid = isOpenAPISpecV3OrHigher(
        JSON.parse(reconstructedBuffer.toString()),
      );

      if (!valid) {
        return {
          success: false,
          message: "Invalid OpenAPI spec",
        };
      }

      // Store the original API file in the file system
      const apiId = await apiDb.createApi(reconstructedBuffer);

      return {
        success: true,
        message: "API imported successfully",
        apiId,
      };
    } catch (error) {
      log.error("Error importing API:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          log.error("Error cleaning up temporary file:", cleanupError);
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
        apis,
      };
    } catch (error) {
      log.error("Error listing APIs:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get a specific API by ID
  ipcMain.handle(GET_API_CHANNEL, async (_, id: string) => {
    try {
      const apiData = await apiDb.getApiById(id, true);

      if (apiData?.api) {
        apiData.api = (await SwaggerParser.dereference(
          apiData.api,
        )) as OpenAPIV3.Document;
      }

      if (!apiData) {
        return {
          success: false,
          message: `API with ID ${id} not found`,
        };
      }

      return {
        success: true,
        api: apiData,
      };
    } catch (error) {
      log.error(`Error getting API with ID ${id}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Rename an API
  ipcMain.handle(
    RENAME_API_CHANNEL,
    async (_, request: { id: string; newName: string }) => {
      try {
        const { id, newName } = request;

        await apiDb.renameApi(id, newName);

        return {
          success: true,
          message: "API updated successfully",
        };
      } catch (error) {
        log.error("Error updating API:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Delete an API
  ipcMain.handle(DELETE_API_CHANNEL, async (_, id: string) => {
    try {
      const success = await apiDb.deleteApi(id);

      if (!success) {
        return {
          success: false,
          message: `API with ID ${id} not found`,
        };
      }

      return {
        success: true,
        message: "API deleted successfully",
      };
    } catch (error) {
      log.error(`Error deleting API with ID ${id}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });
}
