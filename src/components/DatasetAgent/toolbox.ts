import { UIMessage, ToolInvocation } from "ai";
import { AgentToolBox, ToolClassification, ToolResult } from "@/types/agent";
import { DATASET_QUERY_KEY } from "@/hooks/useDatasets";
import { DatasetItem } from "@/types/dataset";
import {
  getAllMcpServerStatuses,
  getMcp,
  getMcpTools,
} from "@/ipc/mcp/mcp-client";
import * as datasetClient from "@/ipc/dataset/dataset-client";
import { queryClient } from "@/queryClient";

interface CreateDatasetItemArgs {
  name: string;
  description: string;
  inputMessages: UIMessage[];
  expectedToolInvocations: string[];
  expectedOutcomes: string[];
}

export class DatasetToolBox implements AgentToolBox {
  constructor() {}

  getToolClassification(toolName: string): ToolClassification | null {
    const toolClassifications: Record<string, ToolClassification> = {
      // Read-only tools (auto-execute)
      listMcps: {
        type: "read",
        runningText: "Listing MCPs...",
        doneText: "Found MCPs",
        errorText: "Failed to list MCPs",
      },
      listMcpTools: {
        type: "read",
        runningText: "Listing MCP tools...",
        doneText: "Found MCP tools",
        errorText: "Failed to list MCP tools",
      },
      listDatasets: {
        type: "read",
        runningText: "Listing datasets...",
        doneText: "Found datasets",
        errorText: "Failed to list datasets",
      },
      listDatasetItems: {
        type: "read",
        runningText: "Listing dataset items...",
        doneText: "Found dataset items",
        errorText: "Failed to list dataset items",
      },
      getDatasetItem: {
        type: "read",
        runningText: "Getting dataset item...",
        doneText: "Found dataset item",
        errorText: "Failed to get dataset item",
      },

      // Write tools (require approval)
      createDataset: {
        type: "write",
        runningText: "Creating dataset...",
        doneText: "Successfully created dataset",
        errorText: "Failed to create dataset",
      },
      createDatasetItems: {
        type: "write",
        runningText: "Creating dataset items...",
        doneText: "Successfully created dataset items",
        errorText: "Failed to create dataset items",
      },
      updateDatasetItem: {
        type: "write",
        runningText: "Updating dataset item...",
        doneText: "Successfully updated dataset item",
        errorText: "Failed to update dataset item",
      },
      removeDatasetItem: {
        type: "write",
        runningText: "Removing dataset item...",
        doneText: "Successfully removed dataset item",
        errorText: "Failed to remove dataset item",
      },
    };

    return toolClassifications[toolName] || null;
  }

  async executeReadTool(toolInvocation: ToolInvocation): Promise<ToolResult> {
    try {
      let result: ToolResult;

      switch (toolInvocation.toolName) {
        case "listMcps": {
          result = await this.listMcps();
          break;
        }

        case "listMcpTools": {
          result = await this.listMcpTools(toolInvocation.args);
          break;
        }

        case "listDatasets": {
          result = await this.listDatasets();
          break;
        }

        case "listDatasetItems": {
          result = await this.listDatasetItems(toolInvocation.args);
          break;
        }

        case "getDatasetItem": {
          result = await this.getDatasetItem(toolInvocation.args);
          break;
        }

        default:
          throw new Error(`Unknown read tool: ${toolInvocation.toolName}`);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  async executeWriteTool(toolInvocation: ToolInvocation): Promise<ToolResult> {
    try {
      let result: ToolResult;

      switch (toolInvocation.toolName) {
        case "createDataset": {
          result = await this.createDataset(toolInvocation.args);
          break;
        }

        case "createDatasetItems": {
          result = await this.createDatasetItems(toolInvocation.args);
          break;
        }

        case "updateDatasetItem": {
          result = await this.updateDatasetItem(toolInvocation.args);
          break;
        }

        case "removeDatasetItem": {
          result = await this.removeDatasetItem(toolInvocation.args);
          break;
        }

        default:
          throw new Error(`Unknown write tool: ${toolInvocation.toolName}`);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  private async listDatasets(): Promise<ToolResult> {
    const response = await datasetClient.listDatasets();
    return {
      success: response.success,
      data: response.datasets?.map((dataset) => ({
        name: dataset.name,
        id: dataset.id,
        description: dataset.description,
      })),
      message: response.message,
    };
  }

  private async listDatasetItems(args: {
    datasetId: string;
  }): Promise<ToolResult> {
    try {
      const response = await datasetClient.getDataset(args.datasetId);

      if (!response.success) {
        return {
          success: false,
          message: response.message || "Dataset not found",
        };
      }

      return {
        success: true,
        data: response.dataset?.items?.map((item) => ({
          id: item.id,
          description: item.description,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to list dataset items",
      };
    }
  }

  private async getDatasetItem(args: {
    datasetId: string;
    itemId: string;
  }): Promise<ToolResult> {
    try {
      const response = await datasetClient.getDataset(args.datasetId);

      if (!response.success) {
        return {
          success: false,
          message: response.message || "Dataset not found",
        };
      }

      const item = response.dataset?.items?.find(
        (item) => item.id === args.itemId,
      );

      if (!item) {
        return {
          success: false,
          message: "Item not found",
        };
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get dataset item",
      };
    }
  }

  private async createDataset(data: {
    name: string;
    description?: string;
    tags?: string[];
    initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
  }): Promise<ToolResult> {
    try {
      const result = await datasetClient.addDataset(data);

      if (result.success) {
        // Invalidate datasets query to refetch the list
        queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
      }

      return {
        success: result.success,
        data: result.id ? { id: result.id } : undefined,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create dataset",
      };
    }
  }

  private async createDatasetItems(args: {
    datasetId: string;
    items: CreateDatasetItemArgs[];
  }): Promise<ToolResult> {
    const report: Array<{
      success: boolean;
      message?: string;
      name?: string;
    }> = [];

    // Process items sequentially
    for (const item of args.items) {
      const datasetItem: Omit<DatasetItem, "id" | "createdAt" | "updatedAt"> = {
        name: item.name,
        description: item.description,
        messages: item.inputMessages,
        expectedToolCalls: item.expectedToolInvocations,
        naturalLanguageCriteria: item.expectedOutcomes,
      };

      try {
        const result = await datasetClient.addItem(args.datasetId, datasetItem);
        report.push({
          name: item.name,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        report.push({
          name: item.name,
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to create item",
        });
      }
    }

    const successCount = report.filter((r) => r.success).length;
    const failureCount = report.length - successCount;

    // Invalidate datasets query if any items were created successfully
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    }

    return {
      success: successCount > 0,
      data: {
        report,
        summary: {
          total: report.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      message: `Created ${successCount} items successfully. ${failureCount} items failed.`,
    };
  }

  private async updateDatasetItem(args: {
    datasetId: string;
    itemId: string;
    item: CreateDatasetItemArgs;
  }): Promise<ToolResult> {
    try {
      const result = await datasetClient.updateItem(
        args.datasetId,
        args.itemId,
        {
          name: args.item.name,
          description: args.item.description,
          messages: args.item.inputMessages,
          expectedToolCalls: args.item.expectedToolInvocations,
          naturalLanguageCriteria: args.item.expectedOutcomes,
        },
      );

      if (result.success) {
        // Invalidate datasets query to refetch the updated data
        queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
      }

      return {
        success: result.success,
        message:
          result.message ||
          (result.success
            ? "Item updated successfully"
            : "Failed to update item"),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update item",
      };
    }
  }

  private async removeDatasetItem(args: {
    datasetId: string;
    itemId: string;
  }): Promise<ToolResult> {
    try {
      const result = await datasetClient.deleteItem(
        args.datasetId,
        args.itemId,
      );

      if (result.success) {
        // Invalidate datasets query to refetch the updated data
        queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
      }

      return {
        success: result.success,
        message:
          result.message ||
          (result.success
            ? "Item removed successfully"
            : "Failed to remove item"),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to remove item",
      };
    }
  }

  private async listMcps(): Promise<ToolResult> {
    const response = await getAllMcpServerStatuses();
    const runningMcps = Object.values(response.data || {});

    const mcps = [];

    for (const mcp of runningMcps) {
      if (mcp.status !== "running") {
        continue;
      }

      if (!mcp.isExternal) {
        const fullMcpResponse = await getMcp(mcp.mcpId);
        mcps.push({
          mcpId: mcp.mcpId,
          name: fullMcpResponse.mcp?.name,
        });
      } else {
        mcps.push({
          mcpId: mcp.mcpId,
          name: mcp.mcpId,
        });
      }
    }

    return {
      success: true,
      data: mcps,
    };
  }

  private async listMcpTools(args: { mcpId: string }): Promise<ToolResult> {
    return getMcpTools(args.mcpId);
  }
}
