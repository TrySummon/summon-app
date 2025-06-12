import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { DatasetItem } from "@/types/dataset";

interface LocalDatasetStore {
  datasets: Record<string, DatasetItem>;

  // CRUD operations
  addDataset: (
    dataset: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateDataset: (
    id: string,
    updates: Partial<Omit<DatasetItem, "id">>,
  ) => boolean;
  deleteDataset: (id: string) => boolean;
  getDataset: (id: string) => DatasetItem | undefined;
  listDatasets: () => DatasetItem[];

  // Utility methods
  datasetExists: (id: string) => boolean;
  getDatasetCount: () => number;
  searchDatasets: (query: string) => DatasetItem[];
}

// Validation functions
const validateDatasetName = (name: string): boolean => {
  return (
    typeof name === "string" &&
    name.trim().length >= 1 &&
    name.trim().length <= 100
  );
};

const validateTags = (tags?: string[]): boolean => {
  if (!tags) return true;
  return (
    Array.isArray(tags) &&
    tags.length <= 10 &&
    tags.every((tag) => typeof tag === "string")
  );
};

const validateDescription = (description?: string): boolean => {
  if (!description) return true;
  return typeof description === "string" && description.length <= 500;
};

const validateMessages = (messages: any[]): boolean => {
  return Array.isArray(messages);
};

// Error handling for localStorage
const createStorageWithErrorHandling = () => {
  return {
    getItem: (name: string) => {
      try {
        const item = localStorage.getItem(name);
        return item;
      } catch (error) {
        console.warn("Failed to read from localStorage:", error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.code === DOMException.QUOTA_EXCEEDED_ERR
        ) {
          console.error(
            "localStorage quota exceeded. Consider clearing old datasets.",
          );
          // Could implement auto-cleanup of oldest datasets here
        } else {
          console.error("Failed to write to localStorage:", error);
        }
        throw error;
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn("Failed to remove from localStorage:", error);
      }
    },
  };
};

const persistConfig: PersistOptions<LocalDatasetStore> = {
  name: "local-datasets",
  storage: createJSONStorage(() => createStorageWithErrorHandling()),
  version: 1,
  migrate: (persistedState: any, version: number) => {
    // Handle migrations for future schema changes
    if (version === 0) {
      // Add any migration logic for version 0 to 1
      return persistedState;
    }
    return persistedState;
  },
  onRehydrateStorage: () => {
    return (state, error) => {
      if (error) {
        console.error("Failed to rehydrate datasets from localStorage:", error);
      }
    };
  },
};

export const useDatasetStore = create<LocalDatasetStore>()(
  persist(
    (set, get) => ({
      datasets: {},

      addDataset: (dataset) => {
        // Validation
        if (!validateDatasetName(dataset.name)) {
          throw new Error("Dataset name must be between 1 and 100 characters");
        }
        if (!validateMessages(dataset.messages)) {
          throw new Error("Messages must be a valid array");
        }
        if (!validateTags(dataset.tags)) {
          throw new Error("Tags must be an array with maximum 10 items");
        }
        if (!validateDescription(dataset.description)) {
          throw new Error("Description must be maximum 500 characters");
        }

        const state = get();

        // Check dataset limit
        if (Object.keys(state.datasets).length >= 100) {
          throw new Error("Maximum of 100 datasets allowed");
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        const newDataset: DatasetItem = {
          ...dataset,
          id,
          createdAt: now,
          updatedAt: now,
          name: dataset.name.trim(),
        };

        set((state) => ({
          datasets: {
            ...state.datasets,
            [id]: newDataset,
          },
        }));

        return id;
      },

      updateDataset: (id, updates) => {
        const state = get();
        const existing = state.datasets[id];

        if (!existing) {
          return false;
        }

        // Validation for updates
        if (updates.name !== undefined && !validateDatasetName(updates.name)) {
          throw new Error("Dataset name must be between 1 and 100 characters");
        }
        if (
          updates.messages !== undefined &&
          !validateMessages(updates.messages)
        ) {
          throw new Error("Messages must be a valid array");
        }
        if (updates.tags !== undefined && !validateTags(updates.tags)) {
          throw new Error("Tags must be an array with maximum 10 items");
        }
        if (
          updates.description !== undefined &&
          !validateDescription(updates.description)
        ) {
          throw new Error("Description must be maximum 500 characters");
        }

        const updatedDataset: DatasetItem = {
          ...existing,
          ...updates,
          id, // Ensure ID cannot be changed
          updatedAt: new Date().toISOString(),
          name: updates.name ? updates.name.trim() : existing.name,
        };

        set((state) => ({
          datasets: {
            ...state.datasets,
            [id]: updatedDataset,
          },
        }));

        return true;
      },

      deleteDataset: (id) => {
        const state = get();

        if (!state.datasets[id]) {
          return false;
        }

        set((state) => {
          const { [id]: deleted, ...remaining } = state.datasets;
          return { datasets: remaining };
        });

        return true;
      },

      getDataset: (id) => {
        const state = get();
        return state.datasets[id];
      },

      listDatasets: () => {
        const state = get();
        return Object.values(state.datasets).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      },

      datasetExists: (id) => {
        const state = get();
        return id in state.datasets;
      },

      getDatasetCount: () => {
        const state = get();
        return Object.keys(state.datasets).length;
      },

      searchDatasets: (query) => {
        const state = get();
        const lowercaseQuery = query.toLowerCase().trim();

        if (!lowercaseQuery) {
          return Object.values(state.datasets);
        }

        return Object.values(state.datasets).filter((dataset) => {
          const nameMatch = dataset.name.toLowerCase().includes(lowercaseQuery);
          const descriptionMatch =
            dataset.description?.toLowerCase().includes(lowercaseQuery) ||
            false;
          const tagMatch =
            dataset.tags?.some((tag) =>
              tag.toLowerCase().includes(lowercaseQuery),
            ) || false;

          return nameMatch || descriptionMatch || tagMatch;
        });
      },
    }),
    persistConfig,
  ),
);
