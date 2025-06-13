import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { Dataset, DatasetItem } from "@/types/dataset";

interface LocalDatasetStore {
  datasets: Record<string, Dataset>;

  // Dataset-level operations
  addDataset: (data: {
    name: string;
    description?: string;
    tags?: string[];
    initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
  }) => string;
  updateDataset: (
    id: string,
    updates: Partial<Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">>,
  ) => boolean;
  deleteDataset: (id: string) => boolean;
  getDataset: (id: string) => Dataset | undefined;
  listDatasets: () => Dataset[];

  // Item-level operations
  addItem: (
    datasetId: string,
    item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateItem: (
    datasetId: string,
    itemId: string,
    updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
  ) => boolean;
  deleteItem: (datasetId: string, itemId: string) => boolean;

  // Utility
  datasetExists: (id: string) => boolean;
  getDatasetCount: () => number;
  searchDatasets: (query: string) => Dataset[];
}

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

const isValidMessages = (messages: any[]) => Array.isArray(messages);

// -------------------- Storage with quota handling --------------------
const createStorageWithErrorHandling = () => ({
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.warn("Failed to read localStorage", err);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.error("Failed to write localStorage", err);
      throw err;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("Failed to remove localStorage", err);
    }
  },
});

const persistConfig: PersistOptions<LocalDatasetStore> = {
  name: "local-datasets",
  storage: createJSONStorage(() => createStorageWithErrorHandling()),
  version: 2, // bump version for migration
};

export const useDatasetStore = create<LocalDatasetStore>()(
  persist(
    (set, get) => ({
      datasets: {},

      // ------------ Dataset-level ------------
      addDataset: ({ name, description, tags, initialItem }) => {
        if (!isValidName(name)) {
          throw new Error("Dataset name must be between 1 and 100 characters");
        }
        if (!isValidTags(tags)) {
          throw new Error("Tags must be an array with maximum 10 items");
        }
        if (!isValidDescription(description)) {
          throw new Error("Description must be maximum 500 characters");
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        const items: DatasetItem[] = [];
        if (initialItem) {
          if (!isValidName(initialItem.name)) {
            throw new Error("Item name must be valid");
          }
          if (!isValidMessages(initialItem.messages)) {
            throw new Error("Item messages must be a valid array");
          }
          items.push({
            ...initialItem,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          });
        }

        const newDataset: Dataset = {
          id,
          name: name.trim(),
          description,
          tags,
          createdAt: now,
          updatedAt: now,
          items,
        };

        set((state) => ({
          datasets: { ...state.datasets, [id]: newDataset },
        }));

        return id;
      },

      updateDataset: (id, updates) => {
        const existing = get().datasets[id];
        if (!existing) return false;

        if (updates.name && !isValidName(updates.name)) {
          throw new Error("Dataset name must be between 1 and 100 characters");
        }
        if (updates.tags && !isValidTags(updates.tags)) {
          throw new Error("Tags must be an array with maximum 10 items");
        }
        if (updates.description && !isValidDescription(updates.description)) {
          throw new Error("Description must be maximum 500 characters");
        }

        const updated: Dataset = {
          ...existing,
          ...updates,
          name: updates.name ? updates.name.trim() : existing.name,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          datasets: { ...state.datasets, [id]: updated },
        }));
        return true;
      },

      deleteDataset: (id) => {
        if (!get().datasets[id]) return false;
        set((state) => {
          const { [id]: _deleted, ...rest } = state.datasets;
          return { datasets: rest };
        });
        return true;
      },

      getDataset: (id) => get().datasets[id],

      listDatasets: () =>
        Object.values(get().datasets).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),

      // ------------ Item-level ------------
      addItem: (datasetId, item) => {
        const dataset = get().datasets[datasetId];
        if (!dataset) throw new Error("Dataset not found");
        if (!isValidName(item.name)) {
          throw new Error("Item name must be between 1 and 100 characters");
        }
        if (!isValidMessages(item.messages)) {
          throw new Error("Item messages must be a valid array");
        }
        const now = new Date().toISOString();
        const newItem: DatasetItem = {
          ...item,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        const updatedDataset: Dataset = {
          ...dataset,
          items: [...dataset.items, newItem],
          updatedAt: now,
        };

        set((state) => ({
          datasets: { ...state.datasets, [datasetId]: updatedDataset },
        }));
        return newItem.id;
      },

      updateItem: (datasetId, itemId, updates) => {
        const dataset = get().datasets[datasetId];
        if (!dataset) return false;
        const itemIndex = dataset.items.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) return false;

        const existingItem = dataset.items[itemIndex];
        if (updates.name && !isValidName(updates.name)) {
          throw new Error("Item name must be between 1 and 100 characters");
        }
        if (updates.messages && !isValidMessages(updates.messages)) {
          throw new Error("Messages must be a valid array");
        }

        const updatedItem: DatasetItem = {
          ...existingItem,
          ...updates,
          name: updates.name ? updates.name.trim() : existingItem.name,
          updatedAt: new Date().toISOString(),
        };

        const newItems = [...dataset.items];
        newItems[itemIndex] = updatedItem;

        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...dataset,
              items: newItems,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
        return true;
      },

      deleteItem: (datasetId, itemId) => {
        const dataset = get().datasets[datasetId];
        if (!dataset) return false;
        const exists = dataset.items.some((item) => item.id === itemId);
        if (!exists) return false;

        const newItems = dataset.items.filter((item) => item.id !== itemId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...dataset,
              items: newItems,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
        return true;
      },

      // ------------ Utils ------------
      datasetExists: (id) => id in get().datasets,
      getDatasetCount: () => Object.keys(get().datasets).length,
      searchDatasets: (query) => {
        const q = query.toLowerCase().trim();
        if (!q) return Object.values(get().datasets);
        return Object.values(get().datasets).filter((d) => {
          const metaMatch =
            d.name.toLowerCase().includes(q) ||
            (d.description?.toLowerCase().includes(q) ?? false) ||
            (d.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
          const itemMatch = d.items.some((i) =>
            i.messages.some(
              (m) =>
                (!!(m as any).content &&
                  (m as any).content.toLowerCase().includes(q)) ||
                i.name.toLowerCase().includes(q),
            ),
          );
          return metaMatch || itemMatch;
        });
      },
    }),
    persistConfig,
  ),
);
