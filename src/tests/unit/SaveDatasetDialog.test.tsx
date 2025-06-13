import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UIMessage } from "ai";
import { SaveDatasetDialog } from "@/components/playground/SaveDatasetDialog";
import { LLMSettings } from "@/components/playground/tabState";

// Mock the dependencies
vi.mock("@/hooks/useLocalDatasets", () => ({
  useLocalDatasets: vi.fn(() => ({
    addDataset: vi.fn(() => "test-id-123"),
    datasets: [
      {
        id: "1",
        name: "Existing Dataset",
        description: undefined,
        tags: undefined,
        items: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
    datasetExists: vi.fn(() => false),
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ChipInput to avoid rendering issues
vi.mock("@/components/ChipInput", () => ({
  default: ({
    tags,
    onValueChange,
    id,
    placeholder,
  }: {
    tags?: string[];
    onValueChange?: (value: string[]) => void;
    id?: string;
    placeholder?: string;
  }) => (
    <input
      data-testid="chip-input"
      id={id}
      placeholder={placeholder}
      value={tags ? tags.join(", ") : ""}
      onChange={(e) =>
        onValueChange?.(e.target.value.split(", ").filter(Boolean))
      }
    />
  ),
}));

describe("SaveDatasetDialog", () => {
  const mockMessages: UIMessage[] = [
    {
      id: "1",
      role: "user",
      content: "",
      parts: [{ type: "text", text: "Hello" }],
      createdAt: new Date(),
    },
    {
      id: "2",
      role: "assistant",
      content: "",
      parts: [{ type: "text", text: "Hi there!" }],
      createdAt: new Date(),
    },
  ];

  const mockSettings: LLMSettings = {
    temperature: 0.7,
    maxTokens: 1000,
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    messages: mockMessages,
    systemPrompt: "You are a helpful assistant",
    model: "gpt-4",
    settings: mockSettings,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with all form fields", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    expect(
      screen.getByText("Save Conversation as Dataset"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Dataset Name/)).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
    expect(screen.getByLabelText("Include system prompt")).toBeInTheDocument();

    // Use a more flexible matcher for the message count
    expect(screen.getByText(/2.*messages.*will be saved/)).toBeInTheDocument();
  });

  it("shows default name with current date", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/) as HTMLInputElement;
    expect(nameInput.value).toMatch(/^Conversation - /);
  });

  it("validates required name field", async () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/);
    const saveButton = screen.getByText("Save Dataset");

    // Clear the name field
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Dataset name is required")).toBeInTheDocument();
    });
  });

  it("validates name length limit", async () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/);
    const longName = "a".repeat(101);

    fireEvent.change(nameInput, { target: { value: longName } });

    await waitFor(() => {
      expect(
        screen.getByText("Dataset name must be 100 characters or less"),
      ).toBeInTheDocument();
    });
  });

  it("validates description length limit", async () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const descriptionInput = screen.getByLabelText("Description");
    const longDescription = "a".repeat(501);

    fireEvent.change(descriptionInput, { target: { value: longDescription } });

    await waitFor(() => {
      expect(
        screen.getByText("Description must be 500 characters or less"),
      ).toBeInTheDocument();
    });
  });

  it("shows character counts", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    expect(screen.getByText(/\/100 characters/)).toBeInTheDocument();
    expect(screen.getByText("0/500 characters")).toBeInTheDocument();
    expect(screen.getByText("0/10 tags")).toBeInTheDocument();
  });

  it("shows system prompt preview when checkbox is checked", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const checkbox = screen.getByLabelText("Include system prompt");
    expect(checkbox).toBeChecked(); // Should be checked by default when systemPrompt exists

    expect(screen.getByText("System prompt preview:")).toBeInTheDocument();
    expect(screen.getByText("You are a helpful assistant")).toBeInTheDocument();
  });

  it("hides system prompt preview when checkbox is unchecked", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const checkbox = screen.getByLabelText("Include system prompt");
    fireEvent.click(checkbox);

    expect(
      screen.queryByText("System prompt preview:"),
    ).not.toBeInTheDocument();
  });

  it("does not show system prompt section when no systemPrompt provided", () => {
    render(<SaveDatasetDialog {...defaultProps} systemPrompt={undefined} />);

    expect(
      screen.queryByLabelText("Include system prompt"),
    ).not.toBeInTheDocument();
  });

  it("updates character counts as user types", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/);
    fireEvent.change(nameInput, { target: { value: "Test" } });

    expect(screen.getByText("4/100 characters")).toBeInTheDocument();
  });

  it("disables save button when form is invalid", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/);
    const saveButton = screen.getByText("Save Dataset");

    // Clear name to make form invalid
    fireEvent.change(nameInput, { target: { value: "" } });

    expect(saveButton).toBeDisabled();
  });

  it("enables save button when form is valid", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const saveButton = screen.getByText("Save Dataset");
    expect(saveButton).not.toBeDisabled();
  });

  it("shows loading state during submission", async () => {
    const { useLocalDatasets } = await import("@/hooks/useLocalDatasets");
    const mockAddDataset = vi.fn(() => "test-id");

    vi.mocked(useLocalDatasets).mockReturnValue({
      addDataset: mockAddDataset,
      datasets: [],
      datasetExists: vi.fn(() => false),
      updateDataset: vi.fn(),
      deleteDataset: vi.fn(),
      getDataset: vi.fn(),
      searchDatasets: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      count: 0,
    });

    render(<SaveDatasetDialog {...defaultProps} />);

    const saveButton = screen.getByText("Save Dataset");

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(
      () => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
      },
      { timeout: 1000 },
    );
  });

  it("handles duplicate names by auto-generating unique name", async () => {
    const { useLocalDatasets } = await import("@/hooks/useLocalDatasets");
    const mockAddDataset = vi.fn(() => "test-id-123");

    vi.mocked(useLocalDatasets).mockReturnValue({
      addDataset: mockAddDataset,
      datasets: [
        {
          id: "1",
          name: "Test Dataset",
          description: undefined,
          tags: undefined,
          items: [],
          createdAt: "",
          updatedAt: "",
        },
      ],
      datasetExists: vi.fn(() => false),
      updateDataset: vi.fn(),
      deleteDataset: vi.fn(),
      getDataset: vi.fn(),
      searchDatasets: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      count: 1,
    });

    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/);
    fireEvent.change(nameInput, { target: { value: "Test Dataset" } });

    const saveButton = screen.getByText("Save Dataset");

    // Use act to ensure state updates are processed
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(
      () => {
        expect(mockAddDataset).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Dataset (1)",
            initialItem: expect.objectContaining({
              name: "Conversation",
              messages: mockMessages,
              systemPrompt: "You are a helpful assistant",
              model: "gpt-4",
              settings: mockSettings,
            }),
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  it("calls onSuccess callback after successful save", async () => {
    const onSuccessMock = vi.fn();
    render(<SaveDatasetDialog {...defaultProps} onSuccess={onSuccessMock} />);

    const saveButton = screen.getByText("Save Dataset");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith("test-id-123");
    });
  });

  it("closes dialog after successful save", async () => {
    const onOpenChangeMock = vi.fn();
    render(
      <SaveDatasetDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
    );

    const saveButton = screen.getByText("Save Dataset");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  it("calls onOpenChange when cancel button is clicked", () => {
    const onOpenChangeMock = vi.fn();
    render(
      <SaveDatasetDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("resets form when dialog reopens", async () => {
    const { rerender } = render(
      <SaveDatasetDialog {...defaultProps} open={false} />,
    );

    // Open dialog and modify form
    rerender(<SaveDatasetDialog {...defaultProps} open={true} />);

    const nameInput = screen.getByLabelText(/Dataset Name/) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(
      "Description",
    ) as HTMLTextAreaElement;

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Custom Name" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Custom Description" },
      });
    });

    expect(nameInput.value).toBe("Custom Name");
    expect(descriptionInput.value).toBe("Custom Description");

    // Close and reopen dialog
    await act(async () => {
      rerender(<SaveDatasetDialog {...defaultProps} open={false} />);
    });

    await act(async () => {
      rerender(<SaveDatasetDialog {...defaultProps} open={true} />);
    });

    // Get fresh references to the inputs after re-rendering
    const newNameInput = screen.getByLabelText(
      /Dataset Name/,
    ) as HTMLInputElement;
    const newDescriptionInput = screen.getByLabelText(
      "Description",
    ) as HTMLTextAreaElement;

    // Form should be reset
    expect(newNameInput.value).toMatch(/^Conversation - /);
    expect(newDescriptionInput.value).toBe("");
  });
});
