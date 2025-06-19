import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Dataset, DatasetItem } from "@/types/dataset";
import log from "electron-log/main";
import { workspaceDb } from "./workspace-db";

class DatasetDB {
  private async getDatasetsDir(): Promise<string> {
    const currentWorkspace = await workspaceDb.getCurrentWorkspace();
    const workspaceDataDir = workspaceDb.getWorkspaceDataDir(
      currentWorkspace.id,
    );
    return path.join(workspaceDataDir, "datasets");
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const datasetsDir = await this.getDatasetsDir();
      if (!fs.existsSync(datasetsDir)) {
        fs.mkdirSync(datasetsDir, { recursive: true });
      }
    } catch (error) {
      log.error("Error creating datasets directory:", error);
      throw error;
    }
  }

  private async getDatasetFilePath(id: string): Promise<string> {
    const datasetsDir = await this.getDatasetsDir();
    return path.join(datasetsDir, `${id}.json`);
  }

  private async loadDatasetFromFile(id: string): Promise<Dataset | null> {
    try {
      const filePath = await this.getDatasetFilePath(id);
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(rawData);
      }
    } catch (error) {
      log.error(`Error loading dataset ${id}:`, error);
    }
    return null;
  }

  private async saveDatasetToFile(dataset: Dataset): Promise<void> {
    try {
      const filePath = await this.getDatasetFilePath(dataset.id);
      fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2));
    } catch (error) {
      log.error(`Error saving dataset ${dataset.id}:`, error);
      throw error;
    }
  }

  private async deleteDatasetFile(id: string): Promise<void> {
    try {
      const filePath = await this.getDatasetFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      log.error(`Error deleting dataset file ${id}:`, error);
      throw error;
    }
  }

  private async getAllDatasetIds(): Promise<string[]> {
    try {
      const datasetsDir = await this.getDatasetsDir();
      const files = fs.readdirSync(datasetsDir);
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
    await this.ensureDirectoryExists();

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

    await this.saveDatasetToFile(newDataset);
    return id;
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const existing = await this.loadDatasetFromFile(id);
    if (!existing) return false;

    const updated: Dataset = {
      ...existing,
      ...updates,
      name: updates.name ? updates.name.trim() : existing.name,
      updatedAt: new Date().toISOString(),
    };

    await this.saveDatasetToFile(updated);
    return true;
  }

  async deleteDataset(id: string): Promise<boolean> {
    const existing = await this.loadDatasetFromFile(id);
    if (!existing) return false;

    await this.deleteDatasetFile(id);
    return true;
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return await this.loadDatasetFromFile(id);
  }

  async listDatasets(): Promise<Dataset[]> {
    await this.ensureDirectoryExists();
    const datasetIds = await this.getAllDatasetIds();
    const datasets: Dataset[] = [];

    for (const id of datasetIds) {
      const dataset = await this.loadDatasetFromFile(id);
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

    const datasetIds = await this.getAllDatasetIds();
    const matchingDatasets: Dataset[] = [];

    for (const id of datasetIds) {
      const dataset = await this.loadDatasetFromFile(id);
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
    const dataset = await this.loadDatasetFromFile(datasetId);
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
    await this.saveDatasetToFile(dataset);
    return newItem.id;
  }

  async updateItem(
    datasetId: string,
    itemId: string,
    updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<boolean> {
    const dataset = await this.loadDatasetFromFile(datasetId);
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
    await this.saveDatasetToFile(dataset);
    return true;
  }

  async deleteItem(datasetId: string, itemId: string): Promise<boolean> {
    const dataset = await this.loadDatasetFromFile(datasetId);
    if (!dataset) return false;

    const initialLength = dataset.items.length;
    dataset.items = dataset.items.filter((item) => item.id !== itemId);

    if (dataset.items.length === initialLength) return false;

    dataset.updatedAt = new Date().toISOString();
    await this.saveDatasetToFile(dataset);
    return true;
  }

  // Utility operations
  async datasetExists(id: string): Promise<boolean> {
    const filePath = await this.getDatasetFilePath(id);
    return fs.existsSync(filePath);
  }

  async getDatasetCount(): Promise<number> {
    const datasetIds = await this.getAllDatasetIds();
    return datasetIds.length;
  }
}

export const datasetDb = new DatasetDB();
