import { Tool as McpTool } from "@modelcontextprotocol/sdk/types";
import { useMcps } from "./useMcps";
import { useEffect, useState } from "react";
import { jsonSchema, Tool, tool } from "ai";

 export default function useToolMap() {
    const mcps = useMcps();
    const [origToolMap, setOrigToolMap] = useState<Record<string, {name: string, tools: McpTool[]}>>({})
    const [aiToolMap, setAiToolMap] = useState<Record<string, Record<string, Tool>>>({})

 useEffect(() => {
    const fetchMcpTools = async (mcpId: string, name: string ) => {
        try {          
          const response = await window.mcpApi.getMcpTools(mcpId);
          if (response.success && response.data) {
            setOrigToolMap({...origToolMap, [mcpId]: {name, tools: response.data}});
          }
        } catch (err) {
          console.error("Failed to fetch MCP tools:", err);
        }
    };

    mcps.mcps.forEach(mcp => {
      fetchMcpTools(mcp.id, mcp.name);
    });
  }, [mcps]);

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
 
 