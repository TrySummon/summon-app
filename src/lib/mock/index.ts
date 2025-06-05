import { findFreePort } from "../port";
import { apiDb } from "../db/api-db";
import { OpenAPIMockServer } from "./server";
import log from "electron-log/main";

// Define the return type for mockApi
export interface MockApiResult {
  url: string;
  port: number;
  server: OpenAPIMockServer;
}

export async function mockApi(apiId: string): Promise<MockApiResult> {
  const api = await apiDb.getApiById(apiId);

  if (!api) {
    throw new Error("API not found");
  }

  if (!api.api) {
    throw new Error("API specification not found");
  }

  const port = await findFreePort();

  // Create and initialize the mock server
  const mockServer = new OpenAPIMockServer({ port });

  try {
    // Initialize the server with the API spec
    await mockServer.initialize(api.api);
    // Start the server
    const serverInfo = await mockServer.start();

    log.log(`Mock server for API ${apiId} started at ${serverInfo.url}`);

    return {
      url: serverInfo.url,
      port: serverInfo.port,
      server: mockServer,
    };
  } catch (error) {
    log.error(`Failed to start mock server for API ${apiId}:`, error);
    throw error;
  }
}
