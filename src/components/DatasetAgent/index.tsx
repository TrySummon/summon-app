import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMcps } from "@/hooks/useMcps";
import { MentionData } from "@/components/CodeEditor";
import { useDatasets } from "@/hooks/useDatasets";
import { AgentSidebar } from "../AgentSidebar";
import { useExternalMcps } from "@/hooks/useExternalMcps";
import { DatasetToolBox } from "./toolbox";
import { Attachment } from "ai";

export interface DatasetAgentSidebarProps {
  datasetId: string | null;
  datasetItemId: string | null;
}

export function DatasetAgentSidebar({
  datasetId,
  datasetItemId,
}: DatasetAgentSidebarProps) {
  const { mcps } = useMcps();
  const { externalMcps } = useExternalMcps();
  const { datasets } = useDatasets();
  // State for storing the current chat ID
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  // Load the last visited chat for this MCP when mcpId changes
  useEffect(() => {
    const savedChatId = localStorage.getItem(`dataset-agent-chat`);
    setCurrentChatId(savedChatId || undefined);
  }, []);

  const toolBox = useMemo(() => new DatasetToolBox(), []);

  // Save chat ID to localStorage and update state
  const handleChatIdChange = useCallback(
    (mcpId: string, chatId: string | undefined) => {
      if (chatId) {
        localStorage.setItem(`dataset-agent-chat`, chatId);
      } else {
        localStorage.removeItem(`dataset-agent-chat`);
      }
      setCurrentChatId(chatId);
    },
    [],
  );

  // Compute MCP-specific mention data
  const mentionData = useMemo(() => {
    const data: MentionData[] = [];

    // 1. MCP Tools
    if (mcps) {
      for (const mcp of mcps) {
        data.push({
          id: `mcp-${mcp.id}`,
          name: mcp.name,
          type: "mcp",
        });
      }
    }

    if (externalMcps) {
      for (const mcp of Object.values(externalMcps)) {
        data.push({
          id: `mcp-${mcp.mcpId}`,
          name: mcp.mcpId,
          type: "mcp",
        });
      }
    }

    // 2. Datasets
    if (datasets) {
      for (const dataset of datasets) {
        data.push({
          id: `dataset-${dataset.id}`,
          name: dataset.name,
          type: "dataset",
        });
      }
    }

    return data;
  }, [mcps, externalMcps, datasets]);

  const additionalAttachments: Attachment[] | undefined = useMemo(() => {
    if (datasetItemId) {
      const apiContent = `User selected dataset item with ID: ${datasetItemId} and dataset with ID: ${datasetId}`;
      const dataUrl = `data:text/plain;base64,${btoa(apiContent)}`;

      return [
        {
          name: datasetItemId,
          contentType: "application/x-summon-dataset-item",
          url: dataUrl,
        },
      ];
    } else if (datasetId) {
      const apiContent = `User selected dataset with ID: ${datasetId}`;
      const dataUrl = `data:text/plain;base64,${btoa(apiContent)}`;

      return [
        {
          name: datasets.find((d) => d.id === datasetId)?.name,
          contentType: "application/x-summon-dataset",
          url: dataUrl,
        },
      ];
    } else {
      return [];
    }
  }, [datasetItemId, datasetId]);

  // MCP-specific file types
  const acceptedFileTypes = {
    "application/json": [".json"],
    "text/yaml": [".yaml"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
  };

  if (!mcps || !datasets) {
    return null;
  }

  return (
    <AgentSidebar
      agentId="dataset-agent"
      apiPath={`/api/dataset-agent`}
      toolBox={toolBox}
      composerPlaceholder="Create and improve datasets."
      defaultChatId={currentChatId}
      onChatIdChange={handleChatIdChange}
      mentionData={mentionData}
      additionalAttachments={additionalAttachments}
      acceptedFileTypes={acceptedFileTypes}
      chatNamePrefix="New Chat"
    />
  );
}
