import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dataset, DatasetItem } from "@/types/dataset";
import * as datasetClient from "@/ipc/dataset/dataset-client";

// Query key for datasets
export const DATASET_QUERY_KEY = "datasets";

export function useDatasets() {
  const queryClient = useQueryClient();

  // Fetch all datasets
  const {
    data = { datasets: [] },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [DATASET_QUERY_KEY],
    queryFn: async () => {
      const result = await datasetClient.listDatasets();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch datasets");
      }
      return result;
    },
  });

  // Create a dataset
  const createDatasetMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      tags?: string[];
      initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
    }) => {
      const result = await datasetClient.addDataset(data);
      if (!result.success) {
        throw new Error(result.message || "Failed to create dataset");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Update a dataset
  const updateDatasetMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<
        Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">
      >;
    }) => {
      const result = await datasetClient.updateDataset(id, updates);
      if (!result.success) {
        throw new Error(result.message || "Failed to update dataset");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Delete a dataset
  const deleteDatasetMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await datasetClient.deleteDataset(id);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete dataset");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Add item to dataset
  const addItemMutation = useMutation({
    mutationFn: async ({
      datasetId,
      item,
    }: {
      datasetId: string;
      item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
    }) => {
      const result = await datasetClient.addItem(datasetId, item);
      if (!result.success) {
        throw new Error(result.message || "Failed to add item");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Update item in dataset
  const updateItemMutation = useMutation({
    mutationFn: async ({
      datasetId,
      itemId,
      updates,
    }: {
      datasetId: string;
      itemId: string;
      updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>;
    }) => {
      const result = await datasetClient.updateItem(datasetId, itemId, updates);
      if (!result.success) {
        throw new Error(result.message || "Failed to update item");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Delete item from dataset
  const deleteItemMutation = useMutation({
    mutationFn: async ({
      datasetId,
      itemId,
    }: {
      datasetId: string;
      itemId: string;
    }) => {
      const result = await datasetClient.deleteItem(datasetId, itemId);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete item");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
    },
  });

  // Utility functions
  const datasets = (data.datasets as Dataset[]) || [];

  const listDatasets = () => {
    return datasets.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

  const getDataset = (id: string) => {
    return datasets.find((dataset) => dataset.id === id);
  };

  const datasetExists = (id: string) => {
    return datasets.some((dataset) => dataset.id === id);
  };

  const getDatasetCount = () => {
    return datasets.length;
  };

  const searchDatasets = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return listDatasets();

    return datasets.filter((d) => {
      const metaMatch =
        d.name.toLowerCase().includes(q) ||
        (d.description?.toLowerCase().includes(q) ?? false) ||
        (d.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
      const itemMatch = d.items.some((i) =>
        i.messages.some(
          (m) =>
            (m.content && m.content.toLowerCase().includes(q)) ||
            i.name.toLowerCase().includes(q),
        ),
      );
      return metaMatch || itemMatch;
    });
  };

  return {
    // Data
    datasets: listDatasets(),
    isLoading,
    isError,
    error,
    refetch,

    // Mutations
    addDataset: (data: {
      name: string;
      description?: string;
      tags?: string[];
      initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
    }) => createDatasetMutation.mutateAsync(data),
    updateDataset: (
      id: string,
      updates: Partial<
        Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">
      >,
    ) => updateDatasetMutation.mutateAsync({ id, updates }),
    deleteDataset: (id: string) => deleteDatasetMutation.mutateAsync(id),
    addItem: (
      datasetId: string,
      item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
    ) => addItemMutation.mutateAsync({ datasetId, item }),
    updateItem: (
      datasetId: string,
      itemId: string,
      updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
    ) => updateItemMutation.mutateAsync({ datasetId, itemId, updates }),
    deleteItem: (datasetId: string, itemId: string) =>
      deleteItemMutation.mutateAsync({ datasetId, itemId }),

    // Utility functions
    getDataset,
    datasetExists,
    count: getDatasetCount(),
    searchDatasets,
  };
}
