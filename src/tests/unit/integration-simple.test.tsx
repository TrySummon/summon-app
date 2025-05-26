import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import React from "react";
import HomePage from "@/pages/HomePage";

// Mock the translation hook
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    appName: "Toolman",
    titleHomePage: "MCP & API Explorer"
  };
  return translations[key] || key;
});

const mockI18n = {
  language: "en"
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n
  })
}));

// Mock the helper functions
vi.mock("@/helpers/theme_helpers", () => ({
  toggleTheme: vi.fn()
}));

vi.mock("@/helpers/language_helpers", () => ({
  setAppLanguage: vi.fn()
}));

// Mock the languages data
vi.mock("@/localization/langs", () => ({
  default: [
    { key: "en", prefix: "🇺🇸", nativeName: "English" },
    { key: "es", prefix: "🇪🇸", nativeName: "Español" }
  ]
}));

// Mock the child components with simple implementations
vi.mock("@/components/ToggleTheme", () => ({
  default: () => <button data-testid="theme-button">Toggle Theme</button>
}));

vi.mock("@/components/LangToggle", () => ({
  default: () => <div data-testid="lang-toggle">Language Toggle</div>
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockI18n.language = "en";
});

test("HomePage renders with all components", () => {
  render(<HomePage />);
  
  // Check main content
  expect(screen.getByText("Toolman")).toBeInTheDocument();
  expect(screen.getByText("MCP & API Explorer")).toBeInTheDocument();
  
  // Check interactive components
  expect(screen.getByTestId("theme-button")).toBeInTheDocument();
  expect(screen.getByTestId("lang-toggle")).toBeInTheDocument();
});

test("HomePage has correct layout structure", () => {
  const { container } = render(<HomePage />);
  
  const mainDiv = container.firstChild as HTMLElement;
  expect(mainDiv).toHaveClass("flex", "h-full", "flex-col");
  
  const centerDiv = mainDiv.querySelector(".flex-1");
  expect(centerDiv).toHaveClass("flex", "flex-1", "flex-col", "items-center", "justify-center", "gap-2");
});

test("translation keys are used correctly", () => {
  render(<HomePage />);
  
  expect(mockT).toHaveBeenCalledWith("appName");
  expect(mockT).toHaveBeenCalledWith("titleHomePage");
});

test("theme button is clickable", () => {
  render(<HomePage />);
  
  const themeButton = screen.getByTestId("theme-button");
  expect(themeButton).toBeInTheDocument();
  
  // Test that it can be clicked without errors
  expect(() => fireEvent.click(themeButton)).not.toThrow();
});

test("components are properly nested", () => {
  const { container } = render(<HomePage />);
  
  const themeButton = screen.getByTestId("theme-button");
  const langToggle = screen.getByTestId("lang-toggle");
  
  // Both should be within the main container
  const mainDiv = container.firstChild as HTMLElement;
  expect(mainDiv).toContainElement(themeButton);
  expect(mainDiv).toContainElement(langToggle);
}); 