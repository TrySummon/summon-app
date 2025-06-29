import { useMcps } from "./useMcps";
import { useEffect, useState } from "react";
import { useExternalMcps } from "./useExternalMcps";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { getMcpTools } from "@/ipc/mcp/mcp-client";

type ToolMapEntry = {
  name: string;
  tools: McpTool[];
};

export default function useToolMap() {
  const mcps = useMcps();
  const externalMcps = useExternalMcps();
  const [mcpToolMap, setMcpToolMap] = useState<Record<string, ToolMapEntry>>(
    {},
  );

  useEffect(() => {
    const fetchMcpTools = async (mcpId: string, name: string) => {
      try {
        const response = await getMcpTools(mcpId);
        if (response.success && response.data) {
          setMcpToolMap((prevToolMap) => {
            return {
              ...prevToolMap,
              [mcpId]: { name, tools: response.data as McpTool[] },
            };
          });
        } else {
          setMcpToolMap((prevToolMap) => {
            return {
              ...prevToolMap,
              [mcpId]: { name, tools: [] },
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch MCP tools:", err);
      }
    };

    // Fetch external MCPs
    Object.keys(externalMcps.externalMcps).forEach((mcpId) => {
      fetchMcpTools(mcpId, mcpId);
    });

    // Fetch internal MCPs
    mcps.mcps.forEach((mcp) => {
      fetchMcpTools(mcp.id, mcp.name);
    });
  }, [mcps, externalMcps]);

  return {
    mcpToolMap,
  };
}
