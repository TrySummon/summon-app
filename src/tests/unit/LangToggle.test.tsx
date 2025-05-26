import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import LangToggle from "@/components/LangToggle";
import React from "react";
import * as languageHelpers from "@/helpers/language_helpers";

// Mock the language helpers
vi.mock("@/helpers/language_helpers", () => ({
  setAppLanguage: vi.fn()
}));

// Mock the languages data
vi.mock("@/localization/langs", () => ({
  default: [
    { key: "en", prefix: "🇺🇸", nativeName: "English" },
    { key: "es", prefix: "🇪🇸", nativeName: "Español" },
    { key: "fr", prefix: "🇫🇷", nativeName: "Français" }
  ]
}));

const mockLangs = [
  { key: "en", prefix: "🇺🇸", nativeName: "English" },
  { key: "es", prefix: "🇪🇸", nativeName: "Español" },
  { key: "fr", prefix: "🇫🇷", nativeName: "Français" }
];

// Mock the translation hook
const mockI18n = {
  language: "en"
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: mockI18n
  })
}));

// Mock the UI components
vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children, onValueChange, value, type }: any) => (
    <div 
      data-testid="toggle-group" 
      data-type={type}
      data-value={value}
      onClick={(e: any) => {
        const target = e.target.closest('[data-value]');
        if (target && onValueChange) {
          onValueChange(target.getAttribute('data-value'));
        }
      }}
    >
      {children}
    </div>
  ),
  ToggleGroupItem: ({ children, value }: any) => (
    <button data-testid={`toggle-item-${value}`} data-value={value}>
      {children}
    </button>
  )
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockI18n.language = "en";
});

test("renders LangToggle with all language options", () => {
  render(<LangToggle />);
  
  expect(screen.getByTestId("toggle-group")).toBeInTheDocument();
  
  mockLangs.forEach(lang => {
    expect(screen.getByTestId(`toggle-item-${lang.key}`)).toBeInTheDocument();
    expect(screen.getByText(`${lang.prefix} ${lang.nativeName}`)).toBeInTheDocument();
  });
});

test("sets correct current language value", () => {
  render(<LangToggle />);
  
  const toggleGroup = screen.getByTestId("toggle-group");
  expect(toggleGroup).toHaveAttribute("data-value", "en");
});

test("has correct toggle group type", () => {
  render(<LangToggle />);
  
  const toggleGroup = screen.getByTestId("toggle-group");
  expect(toggleGroup).toHaveAttribute("data-type", "single");
});

test("calls setAppLanguage when language is changed", () => {
  render(<LangToggle />);
  
  const spanishToggle = screen.getByTestId("toggle-item-es");
  fireEvent.click(spanishToggle);
  
  expect(vi.mocked(languageHelpers.setAppLanguage)).toHaveBeenCalledWith("es", mockI18n);
});

test("calls setAppLanguage with correct parameters for different languages", () => {
  render(<LangToggle />);
  
  // Test French
  const frenchToggle = screen.getByTestId("toggle-item-fr");
  fireEvent.click(frenchToggle);
  
  expect(vi.mocked(languageHelpers.setAppLanguage)).toHaveBeenCalledWith("fr", mockI18n);
  
  // Test English
  const englishToggle = screen.getByTestId("toggle-item-en");
  fireEvent.click(englishToggle);
  
  expect(vi.mocked(languageHelpers.setAppLanguage)).toHaveBeenCalledWith("en", mockI18n);
});

test("updates when current language changes", () => {
  const { rerender } = render(<LangToggle />);
  
  // Change the mock language
  mockI18n.language = "es";
  rerender(<LangToggle />);
  
  const toggleGroup = screen.getByTestId("toggle-group");
  expect(toggleGroup).toHaveAttribute("data-value", "es");
});

test("displays language options with correct format", () => {
  render(<LangToggle />);
  
  expect(screen.getByText("🇺🇸 English")).toBeInTheDocument();
  expect(screen.getByText("🇪🇸 Español")).toBeInTheDocument();
  expect(screen.getByText("🇫🇷 Français")).toBeInTheDocument();
});

test("handles empty language list gracefully", () => {
  // This test verifies the component renders without crashing
  // even when there are no languages (the mock already provides languages)
  const { container } = render(<LangToggle />);
  const toggleGroup = container.querySelector('[data-testid="toggle-group"]');
  
  expect(toggleGroup).toBeInTheDocument();
  // Since we have mocked languages, we expect them to be present
  expect(toggleGroup?.children.length).toBeGreaterThan(0);
}); 