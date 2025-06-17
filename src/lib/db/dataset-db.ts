import fs from "fs";
import path from "path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import { Dataset, DatasetItem } from "@/types/dataset";
import log from "electron-log/main";

class DatasetDB {
  private datasetsDir: string;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.datasetsDir = path.join(userDataPath, "datasets");

    // Ensure datasets directory exists
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.datasetsDir)) {
        fs.mkdirSync(this.datasetsDir, { recursive: true });
      }
    } catch (error) {
      log.error("Error creating datasets directory:", error);
      throw error;
    }
  }

  private getDatasetFilePath(id: string): string {
    return path.join(this.datasetsDir, `${id}.json`);
  }

  private loadDatasetFromFile(id: string): Dataset | null {
    try {
      const filePath = this.getDatasetFilePath(id);
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(rawData);
      }
    } catch (error) {
      log.error(`Error loading dataset ${id}:`, error);
    }
    return null;
  }

  private saveDatasetToFile(dataset: Dataset): void {
    try {
      const filePath = this.getDatasetFilePath(dataset.id);
      fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2));
    } catch (error) {
      log.error(`Error saving dataset ${dataset.id}:`, error);
      throw error;
    }
  }

  private deleteDatasetFile(id: string): void {
    try {
      const filePath = this.getDatasetFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      log.error(`Error deleting dataset file ${id}:`, error);
      throw error;
    }
  }

  private getAllDatasetIds(): string[] {
    try {
      const files = fs.readdirSync(this.datasetsDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
    } catch (error) {
      log.error("Error reading datasets directory:", error);
      return [];
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

    this.saveDatasetToFile(newDataset);
    return id;
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const existing = this.loadDatasetFromFile(id);
    if (!existing) return false;

    const updated: Dataset = {
      ...existing,
      ...updates,
      name: updates.name ? updates.name.trim() : existing.name,
      updatedAt: new Date().toISOString(),
    };

    this.saveDatasetToFile(updated);
    return true;
  }

  async deleteDataset(id: string): Promise<boolean> {
    const existing = this.loadDatasetFromFile(id);
    if (!existing) return false;

    this.deleteDatasetFile(id);
    return true;
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.loadDatasetFromFile(id);
  }

  async listDatasets(): Promise<Dataset[]> {
    const datasetIds = this.getAllDatasetIds();
    const datasets: Dataset[] = [];

    for (const id of datasetIds) {
      const dataset = this.loadDatasetFromFile(id);
      if (dataset) {
        datasets.push(dataset);
      }
    }

    return datasets.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async searchDatasets(query: string): Promise<Dataset[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.listDatasets();

    const datasetIds = this.getAllDatasetIds();
    const matchingDatasets: Dataset[] = [];

    for (const id of datasetIds) {
      const dataset = this.loadDatasetFromFile(id);
      if (!dataset) continue;

      const metaMatch =
        dataset.name.toLowerCase().includes(q) ||
        (dataset.description?.toLowerCase().includes(q) ?? false) ||
        (dataset.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);

      const itemMatch = dataset.items.some((i) =>
        i.messages.some(
          (m) =>
            (m.content && m.content.toLowerCase().includes(q)) ||
            i.name.toLowerCase().includes(q),
        ),
      );

      if (metaMatch || itemMatch) {
        matchingDatasets.push(dataset);
      }
    }

    return matchingDatasets.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  // Item-level operations
  async addItem(
    datasetId: string,
    item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const dataset = this.loadDatasetFromFile(datasetId);
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
    this.saveDatasetToFile(dataset);
    return newItem.id;
  }

  async updateItem(
    datasetId: string,
    itemId: string,
    updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const dataset = this.loadDatasetFromFile(datasetId);
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
    this.saveDatasetToFile(dataset);
    return true;
  }

  async deleteItem(datasetId: string, itemId: string): Promise<boolean> {
    const dataset = this.loadDatasetFromFile(datasetId);
    if (!dataset) return false;

    const initialLength = dataset.items.length;
    dataset.items = dataset.items.filter((item) => item.id !== itemId);

    if (dataset.items.length === initialLength) return false;

    dataset.updatedAt = new Date().toISOString();
    this.saveDatasetToFile(dataset);
    return true;
  }

  // Utility operations
  async datasetExists(id: string): Promise<boolean> {
    return fs.existsSync(this.getDatasetFilePath(id));
  }

  async getDatasetCount(): Promise<number> {
    return this.getAllDatasetIds().length;
  }
}

export const datasetDb = new DatasetDB();
