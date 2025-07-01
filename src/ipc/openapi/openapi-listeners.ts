import { ipcMain } from "electron";
import axios from "axios";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  RENAME_API_CHANNEL,
  DELETE_API_CHANNEL,
  CONVERT_ENDPOINT_TO_TOOL,
} from "./openapi-channels";
import { apiDb } from "@/lib/db/api-db";
import log from "electron-log/main";
import {
  convertEndpointToTool,
  SelectedEndpoint,
} from "@/lib/mcp/parser/extract-tools";

interface ImportApiRequest {
  filename: string;
  buffer: Buffer;
}

async function convertSwaggerToOpenAPI(
  swaggerSpec: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await axios.post(
      "https://converter.swagger.io/api/convert",
      swaggerSpec,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 second timeout
      },
    );
    return response.data as Record<string, unknown>;
  } catch (error) {
    log.error("Error converting Swagger to OpenAPI:", error);
    throw new Error("Failed to convert Swagger 2.0 spec to OpenAPI format");
  }
}

export function isOpenAPIOrSwaggerSpec(
  jsonObject: Record<string, unknown>,
): boolean {
  // Check for OpenAPI 3.x+
  if (typeof jsonObject.openapi === "string") {
    const versionMatch = jsonObject.openapi.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10);
      return majorVersion >= 3;
    }
  }

  // Check for Swagger 2.0
  if (jsonObject.swagger === "2.0") {
    return true;
  }

  return false;
}

export function registerOpenApiListeners() {
  // Handle API import
  ipcMain.handle(IMPORT_API_CHANNEL, async (_, request: ImportApiRequest) => {
    try {
      const { buffer } = request;
      // Reconstruct Buffer from the array of integers that came through IPC
      const reconstructedBuffer = Buffer.from(buffer);

      let jsonSpec: Record<string, unknown>;
      try {
        jsonSpec = JSON.parse(reconstructedBuffer.toString());
      } catch {
        return {
          success: false,
          message: "Invalid JSON format",
        };
      }

      const valid = isOpenAPIOrSwaggerSpec(jsonSpec);

      if (!valid) {
        return {
          success: false,
          message: "Invalid OpenAPI or Swagger spec",
        };
      }

      let finalSpec = jsonSpec;

      // If it's Swagger 2.0, convert it to OpenAPI 3.x
      if (jsonSpec.swagger === "2.0") {
        log.info("Detected Swagger 2.0 spec, converting to OpenAPI format...");
        try {
          finalSpec = await convertSwaggerToOpenAPI(jsonSpec);
          log.info("Successfully converted Swagger 2.0 to OpenAPI format");
        } catch (conversionError) {
          log.error("Failed to convert Swagger 2.0 spec:", conversionError);
          return {
            success: false,
            message:
              "Failed to convert Swagger 2.0 spec to OpenAPI format. Please manually convert your spec or use an OpenAPI 3.x spec.",
          };
        }
      }

      // Store the API file (either original OpenAPI or converted spec)
      const finalBuffer = Buffer.from(JSON.stringify(finalSpec, null, 2));
      const apiId = await apiDb.createApi(finalBuffer);

      return {
        success: true,
        message:
          jsonSpec.swagger === "2.0"
            ? "Swagger 2.0 spec imported and converted to OpenAPI format successfully"
            : "API imported successfully",
        apiId,
      };
    } catch (error) {
      log.error("Error importing API:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
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

  ipcMain.handle(
    CONVERT_ENDPOINT_TO_TOOL,
    async (_, apiId: string, endpoint: SelectedEndpoint) => {
      try {
        const tool = await convertEndpointToTool(apiId, endpoint);

        return {
          success: true,
          data: tool,
        };
      } catch (error) {
        log.error(`Error converting endpoints to tools:`, error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}
