import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UIMessage } from "ai";
import { SaveDatasetDialog } from "@/components/playground/SaveDatasetDialog";
import { LLMSettings } from "@/components/playground/tabState";

// Mock sonner toasts
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

// Mock the datasets hook to return the new structure
vi.mock("@/hooks/useLocalDatasets", () => ({
  useLocalDatasets: vi.fn(() => ({
    addDataset: vi.fn(() => "test-id-123"),
    datasets: [
      {
        id: "1",
        name: "Existing Dataset",
        description: "Test dataset",
        tags: ["test"],
        items: [],
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ],
    datasetExists: vi.fn(() => false),
  })),
}));

// Simple integration test to show the component works
describe("SaveDatasetDialog Integration", () => {
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

  it("renders the dialog with all expected elements", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    // Check dialog title
    expect(
      screen.getByText("Save Conversation as Dataset"),
    ).toBeInTheDocument();

    // Check form fields exist
    expect(screen.getByLabelText(/Dataset Name/)).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();

    // Check system prompt checkbox (should exist when systemPrompt is provided)
    expect(screen.getByLabelText("Include system prompt")).toBeInTheDocument();

    // Check message count display
    expect(screen.getByText(/2.*messages.*will be saved/)).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save Dataset")).toBeInTheDocument();
  });

  it("shows character count displays", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    // Check character count displays
    expect(screen.getByText(/\/100 characters/)).toBeInTheDocument();
    expect(screen.getByText(/\/500 characters/)).toBeInTheDocument();
    expect(screen.getByText(/\/10 tags/)).toBeInTheDocument();
  });

  it("allows user to input data in form fields", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(
      "Description",
    ) as HTMLTextAreaElement;

    // Test that we can change values
    fireEvent.change(nameInput, { target: { value: "My Custom Dataset" } });
    expect(nameInput.value).toBe("My Custom Dataset");

    fireEvent.change(descriptionInput, {
      target: { value: "A test description" },
    });
    expect(descriptionInput.value).toBe("A test description");
  });

  it("updates character counts as user types", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Dataset Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Test" } });

    // Should show updated character count
    expect(screen.getByText("4/100 characters")).toBeInTheDocument();
  });

  it("handles system prompt checkbox toggle", () => {
    render(<SaveDatasetDialog {...defaultProps} />);

    const checkbox = screen.getByLabelText(
      "Include system prompt",
    ) as HTMLInputElement;

    // Should be checked by default when systemPrompt exists
    expect(checkbox).toBeChecked();

    // Should show preview
    expect(screen.getByText("System prompt preview:")).toBeInTheDocument();

    // Toggle off
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Preview should be hidden
    expect(
      screen.queryByText("System prompt preview:"),
    ).not.toBeInTheDocument();
  });

  it("calls onOpenChange when cancel is clicked", () => {
    const onOpenChangeMock = vi.fn();
    render(
      <SaveDatasetDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("shows different UI when no system prompt provided", () => {
    render(<SaveDatasetDialog {...defaultProps} systemPrompt={undefined} />);

    // System prompt checkbox should not exist
    expect(
      screen.queryByLabelText("Include system prompt"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("System prompt preview:"),
    ).not.toBeInTheDocument();
  });
});
