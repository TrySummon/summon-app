import { expect, test, describe, beforeEach, vi } from "vitest";
import { useDatasetStore } from "@/stores/datasetStore";
import { DatasetItem } from "@/types/dataset";
import { UIMessage } from "ai";
import { LLMSettings } from "@/components/playground/tabState";

// Mock localStorage
const createMockStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

const mockStorage = createMockStorage();
Object.defineProperty(window, "localStorage", { value: mockStorage });

// Test data
const mockMessages: UIMessage[] = [
  {
    id: "1",
    role: "user",
    content: "",
    parts: [{ type: "text", text: "Hello" }],
  },
  {
    id: "2",
    role: "assistant",
    content: "",
    parts: [{ type: "text", text: "Hi there!" }],
  },
];

const mockSettings: LLMSettings = {
  temperature: 0.7,
  maxTokens: 1000,
};

const mockDataset: Omit<DatasetItem, "id" | "createdAt" | "updatedAt"> = {
  name: "Test Dataset",
  messages: mockMessages,
  systemPrompt: "You are a helpful assistant",
  model: "gpt-4",
  settings: mockSettings,
  tags: ["test", "example"],
  description: "A test dataset for unit testing",
};

describe("Dataset Store Implementation Test", () => {
  beforeEach(() => {
    // Clear all datasets before each test
    const state = useDatasetStore.getState();
    Object.keys(state.datasets).forEach((id) => {
      state.deleteDataset(id);
    });
    mockStorage.clear();
  });

  test("should demonstrate complete CRUD functionality", () => {
    const store = useDatasetStore.getState();

    // Initial state
    expect(store.getDatasetCount()).toBe(0);
    expect(store.listDatasets()).toHaveLength(0);

    // Add a dataset
    const id = store.addDataset(mockDataset);
    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // Verify it was added
    expect(store.getDatasetCount()).toBe(1);
    expect(store.datasetExists(id)).toBe(true);

    // Get the dataset
    const retrieved = store.getDataset(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("Test Dataset");
    expect(retrieved!.messages).toEqual(mockMessages);
    expect(retrieved!.settings).toEqual(mockSettings);
    expect(retrieved!.tags).toEqual(["test", "example"]);
    expect(retrieved!.description).toBe("A test dataset for unit testing");
    expect(retrieved!.systemPrompt).toBe("You are a helpful assistant");
    expect(retrieved!.model).toBe("gpt-4");
    expect(retrieved!.createdAt).toBeDefined();
    expect(retrieved!.updatedAt).toBeDefined();

    // Update the dataset
    const updateSuccess = store.updateDataset(id, {
      name: "Updated Dataset",
      description: "Updated description",
    });
    expect(updateSuccess).toBe(true);

    const updated = store.getDataset(id);
    expect(updated!.name).toBe("Updated Dataset");
    expect(updated!.description).toBe("Updated description");
    expect(updated!.createdAt).toBe(retrieved!.createdAt); // Should not change
    expect(updated!.updatedAt).not.toBe(retrieved!.updatedAt); // Should change

    // Delete the dataset
    const deleteSuccess = store.deleteDataset(id);
    expect(deleteSuccess).toBe(true);
    expect(store.datasetExists(id)).toBe(false);
    expect(store.getDatasetCount()).toBe(0);
  });

  test("should handle validation correctly", () => {
    const store = useDatasetStore.getState();

    // Test various validation scenarios
    expect(() => store.addDataset({ ...mockDataset, name: "" })).toThrow(
      "Dataset name must be between 1 and 100 characters",
    );

    expect(() =>
      store.addDataset({ ...mockDataset, name: "a".repeat(101) }),
    ).toThrow("Dataset name must be between 1 and 100 characters");

    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(() =>
      store.addDataset({ ...mockDataset, tags: tooManyTags }),
    ).toThrow("Tags must be an array with maximum 10 items");

    const longDescription = "a".repeat(501);
    expect(() =>
      store.addDataset({ ...mockDataset, description: longDescription }),
    ).toThrow("Description must be maximum 500 characters");
  });

  test("should handle search functionality", () => {
    const store = useDatasetStore.getState();

    // Add test datasets
    store.addDataset({
      ...mockDataset,
      name: "JavaScript Tutorial",
      description: "Learn JavaScript basics",
      tags: ["javascript", "tutorial"],
    });

    store.addDataset({
      ...mockDataset,
      name: "Python Guide",
      description: "Python programming guide",
      tags: ["python", "guide"],
    });

    // Test search by name
    let results = store.searchDatasets("javascript");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Test search by description
    results = store.searchDatasets("programming");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Test search by tag
    results = store.searchDatasets("tutorial");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Test case insensitive
    results = store.searchDatasets("PYTHON");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Test empty query returns all
    results = store.searchDatasets("");
    expect(results).toHaveLength(2);
  });

  test("should handle localStorage persistence", () => {
    const store = useDatasetStore.getState();

    // Add a dataset
    const id = store.addDataset(mockDataset);

    // Verify localStorage was called
    expect(mockStorage.setItem).toHaveBeenCalled();

    // Check the data structure in localStorage
    const calls = mockStorage.setItem.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe("local-datasets");

    const storedData = JSON.parse(lastCall[1]);
    expect(storedData.state.datasets[id]).toBeDefined();
    expect(storedData.state.datasets[id].name).toBe(mockDataset.name);
  });
});
