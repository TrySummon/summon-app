import { useMcps } from "./useMcps";
import { useEffect, useState } from "react";
import { jsonSchema, Tool, tool } from "ai";
import { useExternalMcps } from "./useExternalMcps";
import type { JSONSchema7 } from "json-schema";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

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
  const [aiToolMap, setAiToolMap] = useState<
    Record<string, Record<string, Tool>>
  >({});

  useEffect(() => {
    const fetchMcpTools = async (mcpId: string, name: string) => {
      try {
        const response = await window.mcpApi.getMcpTools(mcpId);
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

    Object.keys(externalMcps.externalMcps).forEach((mcpId) => {
      fetchMcpTools(mcpId, mcpId);
    });

    mcps.mcps.forEach((mcp) => {
      fetchMcpTools(mcp.id, mcp.name);
    });
  }, [mcps, externalMcps]);

  useEffect(() => {
    const mcpTools = Object.entries(mcpToolMap);
    const aiTools: Record<string, Record<string, Tool>> = {};

    mcpTools.forEach(([mcpId, { tools }]) => {
      aiTools[mcpId] = {};
      tools.forEach((mcpTool) => {
        aiTools[mcpId][mcpTool.name] = tool({
          description: mcpTool.description,
          parameters: jsonSchema(mcpTool.inputSchema as JSONSchema7),
          execute: (args) =>
            window.mcpApi.callMcpTool(mcpId, mcpTool.name, args as Record<string, unknown>),
        });
      });
    });

    setAiToolMap(aiTools);
  }, [mcpToolMap]);

  return {
    mcpToolMap,
    aiToolMap,
  };
}
