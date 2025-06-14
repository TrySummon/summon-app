import { ipcMain } from "electron";
import {
  ADD_DATASET_CHANNEL,
  UPDATE_DATASET_CHANNEL,
  DELETE_DATASET_CHANNEL,
  GET_DATASET_CHANNEL,
  LIST_DATASETS_CHANNEL,
  SEARCH_DATASETS_CHANNEL,
  ADD_ITEM_CHANNEL,
  UPDATE_ITEM_CHANNEL,
  DELETE_ITEM_CHANNEL,
  DATASET_EXISTS_CHANNEL,
  GET_DATASET_COUNT_CHANNEL,
} from "./dataset-channels";
import { datasetDb } from "@/lib/db/dataset-db";
import { Dataset, DatasetItem } from "@/types/dataset";
import log from "electron-log/main";

// -------------------- Validation helpers --------------------
const isValidName = (name?: string) =>
  typeof name === "string" &&
  name.trim().length >= 1 &&
  name.trim().length <= 100;

const isValidTags = (tags?: string[]) =>
  !tags ||
  (Array.isArray(tags) &&
    tags.length <= 10 &&
    tags.every((t) => typeof t === "string"));

const isValidDescription = (d?: string) =>
  !d || (typeof d === "string" && d.length <= 500);

const isValidMessages = (messages: unknown) => Array.isArray(messages);

export function registerDatasetListeners() {
  // Add dataset
  ipcMain.handle(
    ADD_DATASET_CHANNEL,
    async (
      _,
      data: {
        name: string;
        description?: string;
        tags?: string[];
        initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
      },
    ) => {
      try {
        if (!isValidName(data.name)) {
          return {
            success: false,
            message: "Dataset name must be between 1 and 100 characters",
          };
        }
        if (!isValidTags(data.tags)) {
          return {
            success: false,
            message: "Tags must be an array with maximum 10 items",
          };
        }
        if (!isValidDescription(data.description)) {
          return {
            success: false,
            message: "Description must be maximum 500 characters",
          };
        }

        if (data.initialItem) {
          if (!isValidName(data.initialItem.name)) {
            return {
              success: false,
              message: "Item name must be valid",
            };
          }
          if (!isValidMessages(data.initialItem.messages)) {
            return {
              success: false,
              message: "Item messages must be a valid array",
            };
          }
        }

        const id = await datasetDb.addDataset(data);
        return {
          success: true,
          id,
        };
      } catch (error) {
        log.error("Error adding dataset:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Update dataset
  ipcMain.handle(
    UPDATE_DATASET_CHANNEL,
    async (
      _,
      request: {
        id: string;
        updates: Partial<
          Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">
        >;
      },
    ) => {
      try {
        const { id, updates } = request;

        if (updates.name && !isValidName(updates.name)) {
          return {
            success: false,
            message: "Dataset name must be between 1 and 100 characters",
          };
        }
        if (updates.tags && !isValidTags(updates.tags)) {
          return {
            success: false,
            message: "Tags must be an array with maximum 10 items",
          };
        }
        if (updates.description && !isValidDescription(updates.description)) {
          return {
            success: false,
            message: "Description must be maximum 500 characters",
          };
        }

        const success = await datasetDb.updateDataset(id, updates);
        if (!success) {
          return {
            success: false,
            message: `Dataset with ID ${id} not found`,
          };
        }

        return {
          success: true,
        };
      } catch (error) {
        log.error("Error updating dataset:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Delete dataset
  ipcMain.handle(DELETE_DATASET_CHANNEL, async (_, id: string) => {
    try {
      const success = await datasetDb.deleteDataset(id);
      if (!success) {
        return {
          success: false,
          message: `Dataset with ID ${id} not found`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      log.error("Error deleting dataset:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get dataset
  ipcMain.handle(GET_DATASET_CHANNEL, async (_, id: string) => {
    try {
      const dataset = await datasetDb.getDataset(id);
      if (!dataset) {
        return {
          success: false,
          message: `Dataset with ID ${id} not found`,
        };
      }

      return {
        success: true,
        dataset,
      };
    } catch (error) {
      log.error("Error getting dataset:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // List datasets
  ipcMain.handle(LIST_DATASETS_CHANNEL, async () => {
    try {
      const datasets = await datasetDb.listDatasets();
      return {
        success: true,
        datasets,
      };
    } catch (error) {
      log.error("Error listing datasets:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Search datasets
  ipcMain.handle(SEARCH_DATASETS_CHANNEL, async (_, query: string) => {
    try {
      const datasets = await datasetDb.searchDatasets(query);
      return {
        success: true,
        datasets,
      };
    } catch (error) {
      log.error("Error searching datasets:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Add item
  ipcMain.handle(
    ADD_ITEM_CHANNEL,
    async (
      _,
      request: {
        datasetId: string;
        item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
      },
    ) => {
      try {
        const { datasetId, item } = request;

        if (!isValidName(item.name)) {
          return {
            success: false,
            message: "Item name must be between 1 and 100 characters",
          };
        }
        if (!isValidMessages(item.messages)) {
          return {
            success: false,
            message: "Item messages must be a valid array",
          };
        }

        const id = await datasetDb.addItem(datasetId, item);
        return {
          success: true,
          id,
        };
      } catch (error) {
        log.error("Error adding item:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Update item
  ipcMain.handle(
    UPDATE_ITEM_CHANNEL,
    async (
      _,
      request: {
        datasetId: string;
        itemId: string;
        updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>;
      },
    ) => {
      try {
        const { datasetId, itemId, updates } = request;

        if (updates.name && !isValidName(updates.name)) {
          return {
            success: false,
            message: "Item name must be between 1 and 100 characters",
          };
        }
        if (updates.messages && !isValidMessages(updates.messages)) {
          return {
            success: false,
            message: "Messages must be a valid array",
          };
        }

        const success = await datasetDb.updateItem(datasetId, itemId, updates);
        if (!success) {
          return {
            success: false,
            message: "Dataset or item not found",
          };
        }

        return {
          success: true,
        };
      } catch (error) {
        log.error("Error updating item:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Delete item
  ipcMain.handle(
    DELETE_ITEM_CHANNEL,
    async (_, request: { datasetId: string; itemId: string }) => {
      try {
        const { datasetId, itemId } = request;
        const success = await datasetDb.deleteItem(datasetId, itemId);
        if (!success) {
          return {
            success: false,
            message: "Dataset or item not found",
          };
        }

        return {
          success: true,
        };
      } catch (error) {
        log.error("Error deleting item:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Dataset exists
  ipcMain.handle(DATASET_EXISTS_CHANNEL, async (_, id: string) => {
    try {
      const exists = await datasetDb.datasetExists(id);
      return {
        success: true,
        exists,
      };
    } catch (error) {
      log.error("Error checking dataset existence:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get dataset count
  ipcMain.handle(GET_DATASET_COUNT_CHANNEL, async () => {
    try {
      const count = await datasetDb.getDatasetCount();
      return {
        success: true,
        count,
      };
    } catch (error) {
      log.error("Error getting dataset count:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });
}
