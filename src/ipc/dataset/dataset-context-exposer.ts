import { contextBridge, ipcRenderer } from "electron";
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
import { Dataset, DatasetItem } from "@/types/dataset";

export function exposeDatasetContext() {
  try {
    contextBridge.exposeInMainWorld("datasets", {
      // Dataset-level operations
      addDataset: (data: {
        name: string;
        description?: string;
        tags?: string[];
        initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
      }) => {
        return ipcRenderer.invoke(ADD_DATASET_CHANNEL, data);
      },

      updateDataset: (
        id: string,
        updates: Partial<
          Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">
        >,
      ) => {
        return ipcRenderer.invoke(UPDATE_DATASET_CHANNEL, { id, updates });
      },

      deleteDataset: (id: string) => {
        return ipcRenderer.invoke(DELETE_DATASET_CHANNEL, id);
      },

      getDataset: (id: string) => {
        return ipcRenderer.invoke(GET_DATASET_CHANNEL, id);
      },

      listDatasets: () => {
        return ipcRenderer.invoke(LIST_DATASETS_CHANNEL);
      },

      searchDatasets: (query: string) => {
        return ipcRenderer.invoke(SEARCH_DATASETS_CHANNEL, query);
      },

      // Item-level operations
      addItem: (
        datasetId: string,
        item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
      ) => {
        return ipcRenderer.invoke(ADD_ITEM_CHANNEL, { datasetId, item });
      },

      updateItem: (
        datasetId: string,
        itemId: string,
        updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
      ) => {
        return ipcRenderer.invoke(UPDATE_ITEM_CHANNEL, {
          datasetId,
          itemId,
          updates,
        });
      },

      deleteItem: (datasetId: string, itemId: string) => {
        return ipcRenderer.invoke(DELETE_ITEM_CHANNEL, { datasetId, itemId });
      },

      // Utility operations
      datasetExists: (id: string) => {
        return ipcRenderer.invoke(DATASET_EXISTS_CHANNEL, id);
      },

      getDatasetCount: () => {
        return ipcRenderer.invoke(GET_DATASET_COUNT_CHANNEL);
      },
    });
  } catch (error) {
    console.error("Failed to expose dataset context:", error);
  }
}
