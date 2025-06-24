import { useMcps } from "./useMcps";
import { useEffect, useState, useMemo } from "react";
import { useExternalMcps } from "./useExternalMcps";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import {
  getMcpTools,
  getMcpPrompts,
  getMcpResources,
} from "@/ipc/mcp/mcp-client";
import { Prompt, Resource } from "@/types/mcp";

type CapabilitiesMapEntry = {
  name: string;
  tools: McpTool[];
  prompts: Prompt[];
  resources: Resource[];
};

export default function useCapabilitiesMap() {
  const mcps = useMcps();
  const externalMcps = useExternalMcps();
  const [mcpCapabilitiesMap, setMcpCapabilitiesMap] = useState<
    Record<string, CapabilitiesMapEntry>
  >({});

  useEffect(() => {
    const fetchMcpCapabilities = async (mcpId: string, name: string) => {
      try {
        // Fetch all capabilities in parallel
        const [toolsResponse, promptsResponse, resourcesResponse] =
          await Promise.all([
            getMcpTools(mcpId),
            getMcpPrompts(mcpId),
            getMcpResources(mcpId),
          ]);

        const tools =
          toolsResponse.success && toolsResponse.data
            ? (toolsResponse.data as McpTool[])
            : [];
        const prompts =
          promptsResponse.success && promptsResponse.data
            ? (promptsResponse.data as Prompt[])
            : [];
        const resources =
          resourcesResponse.success && resourcesResponse.data
            ? (resourcesResponse.data as Resource[])
            : [];

        setMcpCapabilitiesMap((prevMap) => ({
          ...prevMap,
          [mcpId]: { name, tools, prompts, resources },
        }));
      } catch (err) {
        console.error("Failed to fetch MCP capabilities:", err);
        setMcpCapabilitiesMap((prevMap) => ({
          ...prevMap,
          [mcpId]: { name, tools: [], prompts: [], resources: [] },
        }));
      }
    };

    // Clear the map when MCPs change
    setMcpCapabilitiesMap({});

    // Fetch capabilities for external MCPs
    Object.keys(externalMcps.externalMcps).forEach((mcpId) => {
      fetchMcpCapabilities(mcpId, mcpId);
    });

    // Fetch capabilities for internal MCPs
    mcps.mcps.forEach((mcp) => {
      fetchMcpCapabilities(mcp.id, mcp.name);
    });
  }, [mcps, externalMcps]);

  // Legacy compatibility - extract just tools for backward compatibility (memoized)
  const mcpToolMap = useMemo(() => {
    return Object.fromEntries(
      Object.entries(mcpCapabilitiesMap).map(([mcpId, capabilities]) => [
        mcpId,
        { name: capabilities.name, tools: capabilities.tools },
      ]),
    );
  }, [mcpCapabilitiesMap]);

  return {
    mcpCapabilitiesMap,
    mcpToolMap, // For backward compatibility
  };
}
