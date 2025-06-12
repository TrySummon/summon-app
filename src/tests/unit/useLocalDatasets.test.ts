import { expect, test, describe, beforeEach, vi } from "vitest";
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

const mockDataset: Omit<DatasetItem, "id" | "createdAt" | "updatedAt"> = {
  name: "Test Dataset",
  messages: mockMessages,
  systemPrompt: "You are a helpful assistant",
  model: "gpt-4",
  settings: mockSettings,
  tags: ["test", "example"],
  description: "A test dataset for unit testing",
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
    const hook = useLocalDatasets();

    // Check that all expected methods are available
    expect(typeof hook.addDataset).toBe("function");
    expect(typeof hook.updateDataset).toBe("function");
    expect(typeof hook.deleteDataset).toBe("function");
    expect(typeof hook.getDataset).toBe("function");
    expect(typeof hook.searchDatasets).toBe("function");
    expect(typeof hook.datasetExists).toBe("function");
    expect(Array.isArray(hook.datasets)).toBe(true);
    expect(typeof hook.count).toBe("number");
  });

  test("should handle basic CRUD operations", () => {
    const hook = useLocalDatasets();

    // Start with empty datasets
    expect(hook.datasets).toHaveLength(0);
    expect(hook.count).toBe(0);

    // Add a dataset
    const id = hook.addDataset(mockDataset);
    expect(typeof id).toBe("string");
    expect(hook.datasetExists(id)).toBe(true);

    // Check it appears in datasets list
    const updatedHook = useLocalDatasets();
    expect(updatedHook.datasets).toHaveLength(1);
    expect(updatedHook.count).toBe(1);
    expect(updatedHook.datasets[0].name).toBe("Test Dataset");

    // Get the dataset
    const retrieved = hook.getDataset(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("Test Dataset");
    expect(retrieved!.messages).toEqual(mockMessages);
    expect(retrieved!.settings).toEqual(mockSettings);

    // Update the dataset
    const updateSuccess = hook.updateDataset(id, { name: "Updated Dataset" });
    expect(updateSuccess).toBe(true);

    const updatedDataset = hook.getDataset(id);
    expect(updatedDataset!.name).toBe("Updated Dataset");

    // Delete the dataset
    const deleteSuccess = hook.deleteDataset(id);
    expect(deleteSuccess).toBe(true);
    expect(hook.datasetExists(id)).toBe(false);

    // Check final state
    const finalHook = useLocalDatasets();
    expect(finalHook.datasets).toHaveLength(0);
    expect(finalHook.count).toBe(0);
  });

  test("should handle search functionality", () => {
    const hook = useLocalDatasets();

    // Add test datasets
    hook.addDataset({
      ...mockDataset,
      name: "JavaScript Tutorial",
      description: "Learn JavaScript basics",
      tags: ["javascript", "tutorial"],
    });

    hook.addDataset({
      ...mockDataset,
      name: "Python Guide",
      description: "Python programming guide",
      tags: ["python", "guide"],
    });

    // Search by name
    let results = hook.searchDatasets("javascript");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Search by description
    results = hook.searchDatasets("programming");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Search by tag
    results = hook.searchDatasets("tutorial");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("JavaScript Tutorial");

    // Case insensitive search
    results = hook.searchDatasets("PYTHON");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Python Guide");

    // Empty query returns all
    results = hook.searchDatasets("");
    expect(results).toHaveLength(2);
  });

  test("should handle validation errors", () => {
    const hook = useLocalDatasets();

    // Test invalid name
    expect(() => hook.addDataset({ ...mockDataset, name: "" })).toThrow(
      "Dataset name must be between 1 and 100 characters",
    );

    // Test too many tags
    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(() =>
      hook.addDataset({ ...mockDataset, tags: tooManyTags }),
    ).toThrow("Tags must be an array with maximum 10 items");

    // Test description too long
    const longDescription = "a".repeat(501);
    expect(() =>
      hook.addDataset({ ...mockDataset, description: longDescription }),
    ).toThrow("Description must be maximum 500 characters");
  });
});
