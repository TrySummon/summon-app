import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { API, McpToolDefinition } from '../openapi/types';

// Define the database schema
interface ApiDbSchema {
  apis: {
    id: string;
    api: API;
    tools: McpToolDefinition[];
    createdAt: string;
    updatedAt: string;
  }[];
}

class ApiDatabase {
  private db: Low<ApiDbSchema>;
  private static instance: ApiDatabase;

  private constructor() {
    // Ensure the data directory exists
    const userDataPath = app.getPath('userData');
    const dbDirectory = path.join(userDataPath, 'db');
    
    if (!fs.existsSync(dbDirectory)) {
      fs.mkdirSync(dbDirectory, { recursive: true });
    }
    
    const dbPath = path.join(dbDirectory, 'apis.json');
    const adapter = new JSONFile<ApiDbSchema>(dbPath);
    this.db = new Low(adapter, { apis: [] } as ApiDbSchema);
    
    // Initialize the database with default data if it doesn't exist
    this.initDb().catch(err => console.error('Failed to initialize database:', err));
  }

  private async initDb(): Promise<void> {
    await this.db.read();
    
    // Make sure the database is initialized with the correct structure
    if (!this.db.data.apis) {
      this.db.data.apis = [];
      await this.db.write();
    }
  }

  public static getInstance(): ApiDatabase {
    if (!ApiDatabase.instance) {
      ApiDatabase.instance = new ApiDatabase();
    }
    return ApiDatabase.instance;
  }

  // Create a new API with its tools
  public async createApi(api: API, tools: McpToolDefinition[]): Promise<string> {
    await this.db.read();
    
    const id = this.generateId(api.name);
    const now = new Date().toISOString();
    
    this.db.data!.apis.push({
      id,
      api,
      tools,
      createdAt: now,
      updatedAt: now
    });
    
    await this.db.write();
    return id;
  }

  // Get all APIs (without tools for better performance)
  public async listApis(): Promise<{ id: string; api: API; createdAt: string; updatedAt: string }[]> {
    await this.db.read();
    
    return this.db.data!.apis.map(({ id, api, createdAt, updatedAt }) => ({
      id,
      api,
      createdAt,
      updatedAt
    }));
  }

  // Get a specific API by ID
  public async getApiById(id: string): Promise<{ id: string; api: API; tools: McpToolDefinition[]; createdAt: string; updatedAt: string } | null> {
    await this.db.read();
    
    const apiEntry = this.db.data!.apis.find(api => api.id === id);
    return apiEntry || null;
  }

  // Update an API
  public async updateApi(id: string, apiData: API): Promise<boolean> {
    await this.db.read();
    
    const apiIndex = this.db.data!.apis.findIndex(api => api.id === id);
    
    if (apiIndex === -1) {
      return false;
    }
    
    this.db.data!.apis[apiIndex].api = apiData;
    this.db.data!.apis[apiIndex].updatedAt = new Date().toISOString();
    
    await this.db.write();
    return true;
  }

  // Delete an API and all its tools
  public async deleteApi(id: string): Promise<boolean> {
    await this.db.read();
    
    const initialLength = this.db.data!.apis.length;
    this.db.data!.apis = this.db.data!.apis.filter(api => api.id !== id);
    
    if (initialLength === this.db.data!.apis.length) {
      return false;
    }
    
    await this.db.write();
    return true;
  }

  // List all tools for a specific API
  public async listApiTools(apiId: string): Promise<McpToolDefinition[] | null> {
    await this.db.read();
    
    const apiEntry = this.db.data!.apis.find(api => api.id === apiId);
    
    if (!apiEntry) {
      return null;
    }
    
    return apiEntry.tools;
  }

  // Get a specific tool from an API
  public async getApiTool(apiId: string, toolName: string): Promise<McpToolDefinition | null> {
    await this.db.read();
    
    const apiEntry = this.db.data!.apis.find(api => api.id === apiId);
    
    if (!apiEntry) {
      return null;
    }
    
    const tool = apiEntry.tools.find(tool => tool.name === toolName);
    return tool || null;
  }

  // Update a specific tool in an API
  public async updateApiTool(apiId: string, toolName: string, toolData: McpToolDefinition): Promise<boolean> {
    await this.db.read();
    
    const apiIndex = this.db.data!.apis.findIndex(api => api.id === apiId);
    
    if (apiIndex === -1) {
      return false;
    }
    
    const toolIndex = this.db.data!.apis[apiIndex].tools.findIndex(tool => tool.name === toolName);
    
    if (toolIndex === -1) {
      return false;
    }
    
    this.db.data!.apis[apiIndex].tools[toolIndex] = toolData;
    this.db.data!.apis[apiIndex].updatedAt = new Date().toISOString();
    
    await this.db.write();
    return true;
  }

  // Delete a specific tool from an API
  public async deleteApiTool(apiId: string, toolName: string): Promise<boolean> {
    await this.db.read();
    
    const apiIndex = this.db.data!.apis.findIndex(api => api.id === apiId);
    
    if (apiIndex === -1) {
      return false;
    }
    
    const initialLength = this.db.data!.apis[apiIndex].tools.length;
    this.db.data!.apis[apiIndex].tools = this.db.data!.apis[apiIndex].tools.filter(tool => tool.name !== toolName);
    
    if (initialLength === this.db.data!.apis[apiIndex].tools.length) {
      return false;
    }
    
    this.db.data!.apis[apiIndex].updatedAt = new Date().toISOString();
    await this.db.write();
    return true;
  }

  // Helper method to generate a human-readable unique ID based on API name
  private generateId(apiName?: string): string {
    if (apiName) {
      // Create a slug from the API name
      const baseSlug = apiName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      
      // Add a timestamp to ensure uniqueness
      const timestamp = new Date().getTime().toString(36);
      return `${baseSlug}-${timestamp}`;
    }
    
    // Fallback to a timestamp-based ID if no name is provided
    return `api-${new Date().getTime().toString(36)}`;
  }
}

export const apiDb = ApiDatabase.getInstance();
