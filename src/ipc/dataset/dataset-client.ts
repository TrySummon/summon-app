import { Dataset, DatasetItem } from "@/types/dataset";

// Dataset operations with proper error handling
export const addDataset = async (data: {
  name: string;
  description?: string;
  tags?: string[];
  initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
}) => {
  return window.datasets.addDataset(data);
};

export const updateDataset = async (
  id: string,
  updates: Partial<Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">>,
) => {
  return window.datasets.updateDataset(id, updates);
};

export const deleteDataset = async (id: string) => {
  return window.datasets.deleteDataset(id);
};

export const getDataset = async (id: string) => {
  return window.datasets.getDataset(id);
};

export const listDatasets = async () => {
  return window.datasets.listDatasets();
};

export const searchDatasets = async (query: string) => {
  return window.datasets.searchDatasets(query);
};

// Item operations
export const addItem = async (
  datasetId: string,
  item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
) => {
  return window.datasets.addItem(datasetId, item);
};

export const updateItem = async (
  datasetId: string,
  itemId: string,
  updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
) => {
  return window.datasets.updateItem(datasetId, itemId, updates);
};

export const deleteItem = async (datasetId: string, itemId: string) => {
  return window.datasets.deleteItem(datasetId, itemId);
};

// Utility operations
export const datasetExists = async (id: string) => {
  return window.datasets.datasetExists(id);
};

export const getDatasetCount = async () => {
  return window.datasets.getDatasetCount();
};
