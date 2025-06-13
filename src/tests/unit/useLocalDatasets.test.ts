import { expect, test, describe, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLocalDatasets } from "@/hooks/useLocalDatasets";
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

const mockDatasetItem: Omit<DatasetItem, "id" | "createdAt" | "updatedAt"> = {
  name: "Test Conversation",
  messages: mockMessages,
  systemPrompt: "You are a helpful assistant",
  model: "gpt-4",
  settings: mockSettings,
  tags: ["test", "example"],
  description: "A test conversation for unit testing",
};

describe("useLocalDatasets Hook", () => {
  beforeEach(() => {
    // Clear all datasets before each test
    const state = useDatasetStore.getState();
    Object.keys(state.datasets).forEach((id) => {
      state.deleteDataset(id);
    });
    mockStorage.clear();
  });

  test("should provide access to all dataset operations", () => {
    const { result } = renderHook(() => useLocalDatasets());
    const hook = result.current;

    // Check that all expected methods are available
    expect(typeof hook.addDataset).toBe("function");
    expect(typeof hook.updateDataset).toBe("function");
    expect(typeof hook.deleteDataset).toBe("function");
    expect(typeof hook.getDataset).toBe("function");
    expect(typeof hook.searchDatasets).toBe("function");
    expect(typeof hook.datasetExists).toBe("function");
    expect(typeof hook.addItem).toBe("function");
    expect(typeof hook.updateItem).toBe("function");
    expect(typeof hook.deleteItem).toBe("function");
    expect(Array.isArray(hook.datasets)).toBe(true);
    expect(typeof hook.count).toBe("number");
  });

  test("should handle basic CRUD operations", () => {
    const { result, rerender } = renderHook(() => useLocalDatasets());

    // Start with empty datasets
    expect(result.current.datasets).toHaveLength(0);
    expect(result.current.count).toBe(0);

    // Add a dataset with initial item
    const id = result.current.addDataset({
      name: "Test Dataset",
      description: "A test dataset for unit testing",
      tags: ["test", "example"],
      initialItem: mockDatasetItem,
    });
    expect(typeof id).toBe("string");
    expect(result.current.datasetExists(id)).toBe(true);

    // Re-render to get updated state
    rerender();
    expect(result.current.datasets).toHaveLength(1);
    expect(result.current.count).toBe(1);
    expect(result.current.datasets[0].name).toBe("Test Dataset");

    // Get the dataset
    const retrieved = result.current.getDataset(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("Test Dataset");
    expect(retrieved!.items).toHaveLength(1);
    expect(retrieved!.items[0].messages).toEqual(mockMessages);
    expect(retrieved!.items[0].settings).toEqual(mockSettings);

    // Update the dataset
    const updateSuccess = result.current.updateDataset(id, {
      name: "Updated Dataset",
    });
    expect(updateSuccess).toBe(true);

    const updatedDataset = result.current.getDataset(id);
    expect(updatedDataset!.name).toBe("Updated Dataset");

    // Delete the dataset
    const deleteSuccess = result.current.deleteDataset(id);
    expect(deleteSuccess).toBe(true);
    expect(result.current.datasetExists(id)).toBe(false);

    // Re-render to get final state
    rerender();
    expect(result.current.datasets).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });

  test("should handle search functionality", () => {
    const { result } = renderHook(() => useLocalDatasets());

    // Add test datasets
    result.current.addDataset({
      name: "JavaScript Tutorial",
      description: "Learn JavaScript basics",
      tags: ["javascript", "tutorial"],
      initialItem: {
        ...mockDatasetItem,
        name: "JS Conversation",
      },
    });

    result.current.addDataset({
      name: "Python Guide",
      description: "Python programming guide",
      tags: ["python", "guide"],
      initialItem: {
        ...mockDatasetItem,
        name: "Python Conversation",
      },
    });

    // Search by name
    let results = result.current.searchDatasets("javascript");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Search by description
    results = result.current.searchDatasets("programming");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Search by tag
    results = result.current.searchDatasets("tutorial");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Case insensitive search
    results = result.current.searchDatasets("PYTHON");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Empty query returns all
    results = result.current.searchDatasets("");
    expect(results).toHaveLength(2);
  });

  test("should handle validation errors", () => {
    const { result } = renderHook(() => useLocalDatasets());

    // Test invalid name
    expect(() =>
      result.current.addDataset({ name: "", initialItem: mockDatasetItem }),
    ).toThrow("Dataset name must be between 1 and 100 characters");

    // Test too many tags
    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(() =>
      result.current.addDataset({
        name: "Test",
        tags: tooManyTags,
        initialItem: mockDatasetItem,
      }),
    ).toThrow("Tags must be an array with maximum 10 items");

    // Test description too long
    const longDescription = "a".repeat(501);
    expect(() =>
      result.current.addDataset({
        name: "Test",
        description: longDescription,
        initialItem: mockDatasetItem,
      }),
    ).toThrow("Description must be maximum 500 characters");

    // Test item-level operations
    const datasetId = result.current.addDataset({
      name: "Test Dataset for Items",
      description: "Testing item operations",
    });

    // Add an item to the dataset
    const itemId = result.current.addItem(datasetId, mockDatasetItem);
    expect(typeof itemId).toBe("string");

    // Get the dataset and check the item was added
    const datasetWithItem = result.current.getDataset(datasetId);
    expect(datasetWithItem!.items).toHaveLength(1);
    expect(datasetWithItem!.items[0].name).toBe("Test Conversation");

    // Update the item
    const updateSuccess = result.current.updateItem(datasetId, itemId, {
      name: "Updated Conversation",
    });
    expect(updateSuccess).toBe(true);

    const updatedDataset = result.current.getDataset(datasetId);
    expect(updatedDataset!.items[0].name).toBe("Updated Conversation");

    // Delete the item
    const deleteSuccess = result.current.deleteItem(datasetId, itemId);
    expect(deleteSuccess).toBe(true);

    const datasetAfterDelete = result.current.getDataset(datasetId);
    expect(datasetAfterDelete!.items).toHaveLength(0);
  });
});
