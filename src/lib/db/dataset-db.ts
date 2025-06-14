import fs from "fs";
import path from "path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import { Dataset, DatasetItem } from "@/types/dataset";
import log from "electron-log/main";

interface DatasetStorage {
  datasets: Record<string, Dataset>;
}

class DatasetDB {
  private dataFile: string;
  private data: DatasetStorage;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.dataFile = path.join(userDataPath, "datasets.json");
    this.data = this.loadData();
  }

  private loadData(): DatasetStorage {
    try {
      if (fs.existsSync(this.dataFile)) {
        const rawData = fs.readFileSync(this.dataFile, "utf-8");
        return JSON.parse(rawData);
      }
    } catch (error) {
      log.error("Error loading dataset data:", error);
    }
    return { datasets: {} };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      log.error("Error saving dataset data:", error);
      throw error;
    }
  }

  // Dataset-level operations
  async addDataset(data: {
    name: string;
    description?: string;
    tags?: string[];
    initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
  }): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const items: DatasetItem[] = [];
    if (data.initialItem) {
      items.push({
        ...data.initialItem,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      });
    }

    const newDataset: Dataset = {
      id,
      name: data.name.trim(),
      description: data.description,
      tags: data.tags,
      createdAt: now,
      updatedAt: now,
      items,
    };

    this.data.datasets[id] = newDataset;
    this.saveData();
    return id;
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const existing = this.data.datasets[id];
    if (!existing) return false;

    const updated: Dataset = {
      ...existing,
      ...updates,
      name: updates.name ? updates.name.trim() : existing.name,
      updatedAt: new Date().toISOString(),
    };

    this.data.datasets[id] = updated;
    this.saveData();
    return true;
  }

  async deleteDataset(id: string): Promise<boolean> {
    if (!this.data.datasets[id]) return false;
    delete this.data.datasets[id];
    this.saveData();
    return true;
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.data.datasets[id] || null;
  }

  async listDatasets(): Promise<Dataset[]> {
    return Object.values(this.data.datasets).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async searchDatasets(query: string): Promise<Dataset[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.listDatasets();

    return Object.values(this.data.datasets).filter((d) => {
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
  }

  // Item-level operations
  async addItem(
    datasetId: string,
    item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const dataset = this.data.datasets[datasetId];
    if (!dataset) throw new Error("Dataset not found");

    const now = new Date().toISOString();
    const newItem: DatasetItem = {
      ...item,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    dataset.items.push(newItem);
    dataset.updatedAt = now;
    this.saveData();
    return newItem.id;
  }

  async updateItem(
    datasetId: string,
    itemId: string,
    updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const dataset = this.data.datasets[datasetId];
    if (!dataset) return false;

    const itemIndex = dataset.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return false;

    const existingItem = dataset.items[itemIndex];
    const updatedItem: DatasetItem = {
      ...existingItem,
      ...updates,
      name: updates.name ? updates.name.trim() : existingItem.name,
      updatedAt: new Date().toISOString(),
    };

    dataset.items[itemIndex] = updatedItem;
    dataset.updatedAt = new Date().toISOString();
    this.saveData();
    return true;
  }

  async deleteItem(datasetId: string, itemId: string): Promise<boolean> {
    const dataset = this.data.datasets[datasetId];
    if (!dataset) return false;

    const initialLength = dataset.items.length;
    dataset.items = dataset.items.filter((item) => item.id !== itemId);

    if (dataset.items.length === initialLength) return false;

    dataset.updatedAt = new Date().toISOString();
    this.saveData();
    return true;
  }

  // Utility operations
  async datasetExists(id: string): Promise<boolean> {
    return id in this.data.datasets;
  }

  async getDatasetCount(): Promise<number> {
    return Object.keys(this.data.datasets).length;
  }
}

export const datasetDb = new DatasetDB();
