import { ipcMain } from "electron";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  UPDATE_API_CHANNEL,
  DELETE_API_CHANNEL,
  LIST_API_TOOLS_CHANNEL,
  GET_API_TOOL_CHANNEL,
  UPDATE_API_TOOL_CHANNEL,
  DELETE_API_TOOL_CHANNEL
} from "./openapi-channels";
import SwaggerParser from "@apidevtools/swagger-parser";
import { parseOpenApiDocument } from "@/helpers/openapi/parser";
import { OpenAPIV3 } from "openapi-types";
import { apiDb } from "@/helpers/db/api-db";
import { API, McpToolDefinition } from "@/helpers/openapi/types";

interface ImportApiOptions {
  ignoreDeprecated: boolean;
  ignoreOptionalParams: boolean;
}

interface ImportApiRequest {
  filename: string;
  buffer: Buffer;
  options: ImportApiOptions;
}

export function registerOpenApiListeners() {
  // Handle API import
  ipcMain.handle(IMPORT_API_CHANNEL, async (_, request: ImportApiRequest) => {
    try {
      const { filename, buffer, options } = request;
      
      // Reconstruct Buffer from the array of integers that came through IPC
      const reconstructedBuffer = Buffer.from(buffer);

      const parsedSpec = (await SwaggerParser.dereference(
        JSON.parse(reconstructedBuffer.toString())
      )) as OpenAPIV3.Document;

      const {api, tools} = parseOpenApiDocument(parsedSpec, options);
      
      // Store the imported API and tools in the database
      const apiId = await apiDb.createApi(api, tools);
      
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
  ipcMain.handle(UPDATE_API_CHANNEL, async (_, request: { id: string; api: API }) => {
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

  // List all tools for a specific API
  ipcMain.handle(LIST_API_TOOLS_CHANNEL, async (_, apiId: string) => {
    try {
      const tools = await apiDb.listApiTools(apiId);
      
      if (tools === null) {
        return {
          success: false,
          message: `API with ID ${apiId} not found`
        };
      }
      
      return {
        success: true,
        tools
      };
    } catch (error) {
      console.error(`Error listing tools for API with ID ${apiId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Get a specific tool from an API
  ipcMain.handle(GET_API_TOOL_CHANNEL, async (_, request: { apiId: string; toolName: string }) => {
    try {
      const { apiId, toolName } = request;
      const tool = await apiDb.getApiTool(apiId, toolName);
      
      if (tool === null) {
        return {
          success: false,
          message: `Tool ${toolName} not found in API with ID ${apiId}`
        };
      }
      
      return {
        success: true,
        tool
      };
    } catch (error) {
      console.error(`Error getting tool ${request.toolName} from API with ID ${request.apiId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Update a specific tool in an API
  ipcMain.handle(UPDATE_API_TOOL_CHANNEL, async (_, request: { apiId: string; toolName: string; tool: McpToolDefinition }) => {
    try {
      const { apiId, toolName, tool } = request;
      const success = await apiDb.updateApiTool(apiId, toolName, tool);
      
      if (!success) {
        return {
          success: false,
          message: `Tool ${toolName} not found in API with ID ${apiId}`
        };
      }
      
      return {
        success: true,
        message: "Tool updated successfully"
      };
    } catch (error) {
      console.error(`Error updating tool ${request.toolName} in API with ID ${request.apiId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Delete a specific tool from an API
  ipcMain.handle(DELETE_API_TOOL_CHANNEL, async (_, request: { apiId: string; toolName: string }) => {
    try {
      const { apiId, toolName } = request;
      const success = await apiDb.deleteApiTool(apiId, toolName);
      
      if (!success) {
        return {
          success: false,
          message: `Tool ${toolName} not found in API with ID ${apiId}`
        };
      }
      
      return {
        success: true,
        message: "Tool deleted successfully"
      };
    } catch (error) {
      console.error(`Error deleting tool ${request.toolName} from API with ID ${request.apiId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
