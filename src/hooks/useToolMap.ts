import { Tool as McpTool } from "@modelcontextprotocol/sdk/types";
import { useMcps } from "./useMcps";
import { useEffect, useState } from "react";
import { jsonSchema, Tool, tool } from "ai";
import { useExternalMcps } from "./useExternalMcps";

type ToolMapEntry = {
  name: string;
  tools: McpTool[];
};

export default function useToolMap() {
  const mcps = useMcps();
  const externalMcps = useExternalMcps();
  const [origToolMap, setOrigToolMap] = useState<Record<string, ToolMapEntry>>({});
  const [aiToolMap, setAiToolMap] = useState<Record<string, Record<string, Tool>>>({});

  useEffect(() => {
    const fetchMcpTools = async (mcpId: string, name: string) => {
      try {
        const response = await window.mcpApi.getMcpTools(mcpId);
        if (response.success && response.data) {
          setOrigToolMap((prevToolMap) => {
            return {
              ...prevToolMap,
              [mcpId]: { name, tools: response.data as McpTool[] }
            };
          });
        } else {
          setOrigToolMap((prevToolMap) => {
            return {
              ...prevToolMap,
              [mcpId]: { name, tools: [] }
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch MCP tools:", err);
      }
    };

    Object.keys(externalMcps.externalMcps).forEach(mcpId => {
      fetchMcpTools(mcpId, mcpId);
    });

    mcps.mcps.forEach(mcp => {
      fetchMcpTools(mcp.id, mcp.name);
    });
  }, [mcps, externalMcps]);

  useEffect(() => {
    const mcpTools = Object.entries(origToolMap);
    const aiTools: Record<string, Record<string, Tool>> = {};

    mcpTools.forEach(([mcpId, {tools}]) => {
      aiTools[mcpId] = {}
      tools.forEach(mcpTool => {
        aiTools[mcpId][mcpTool.name] = tool({
          description: mcpTool.description,
          parameters: jsonSchema<any>(mcpTool.inputSchema as any),
          execute: (args: Record<string, any>) => window.mcpApi.callMcpTool(mcpId, mcpTool.name, args)
        })
      })
    })

    setAiToolMap(aiTools);
  }, [origToolMap]);

  return {
    origToolMap,
    aiToolMap,
    };
 }
 
 