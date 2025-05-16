import { ipcMain } from "electron";
import { IMPORT_API_CHANNEL } from "./openapi-channels";
import fs from "fs";
import path from "path";
import { app } from "electron";
import SwaggerParser from "@apidevtools/swagger-parser";
import { parseOpenApiDocument } from "@/helpers/openapi/parser";
import { OpenAPIV3 } from "openapi-types";

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
  // Handle collection import
  ipcMain.handle(IMPORT_API_CHANNEL, async (_, request: ImportApiRequest) => {
    try {
      const { filename, buffer, options } = request;
      
      // Reconstruct Buffer from the array of integers that came through IPC
      const reconstructedBuffer = Buffer.from(buffer);

      const parsedSpec = (await SwaggerParser.dereference(
        JSON.parse(reconstructedBuffer.toString())
      )) as OpenAPIV3.Document;

      const {collection, tools} = parseOpenApiDocument(parsedSpec, options);

      console.log(collection, tools);
      
      return {
        success: true,
        message: "Collection imported successfully"
      };
    } catch (error) {
      console.error("Error importing collection:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
