import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport, SSEClientTransportOptions} from "@modelcontextprotocol/sdk/client/sse.js";

/**
 * Configuration options for MCP tools
 */
export type McpTransport = 
  | { type: 'stdio'; params: StdioServerParameters }
  | { type: 'http'; url: string; options?: StreamableHTTPClientTransportOptions }
  | { type: 'sse'; url: string; options?: SSEClientTransportOptions };

/**
 * Fetches tools from an MCP server using the provided configuration
 * @param config Configuration for connecting to the MCP server
 * @returns A promise that resolves to an array of MCP tools
 */
export async function getMcpTools(config: McpTransport) {
  try {
    const client = new Client(
      {
        name: "example-client",
        version: "1.0.0"
      }
    );

    // Create a client with the appropriate transport based on the configuration
    switch (config.type) {
      case 'stdio':
        await client.connect(new StdioClientTransport(config.params))
        break;
        
      case 'http':
        await client.connect(new StreamableHTTPClientTransport(
          new URL(config.url),
          config.options
        ));
        break;
        
      case 'sse':
        await client.connect(new SSEClientTransport(
          new URL(config.url),
          config.options
        ));
        break;
        
      default:
        throw new Error('Invalid MCP configuration type');
    }
    
    // Get the tools from the MCP server
    const response = await client.listTools();
    
    return response.tools;
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    throw error;
  }
}
