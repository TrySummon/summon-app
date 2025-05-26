import { render, screen } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import HomePage from "@/pages/HomePage";
import React from "react";

// Mock the translation hook
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    appName: "Test App Name",
    titleHomePage: "Home Page Title"
  };
  return translations[key] || key;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: "en"
    }
  })
}));

// Mock the child components
vi.mock("@/components/ToggleTheme", () => ({
  default: () => <button data-testid="toggle-theme">Toggle Theme</button>
}));

vi.mock("@/components/LangToggle", () => ({
  default: () => <div data-testid="lang-toggle">Language Toggle</div>
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders HomePage with correct structure", () => {
  const { container } = render(<HomePage />);
  
  // Check if the main container is present
  const mainDiv = container.querySelector(".flex.h-full.flex-col");
  expect(mainDiv).toBeTruthy();
});

test("displays app name from translation", () => {
  render(<HomePage />);
  
  expect(mockT).toHaveBeenCalledWith("appName");
  expect(screen.getByText("Test App Name")).toBeInTheDocument();
});

test("displays page title from translation", () => {
  render(<HomePage />);
  
  expect(mockT).toHaveBeenCalledWith("titleHomePage");
  expect(screen.getByTestId("pageTitle")).toBeInTheDocument();
  expect(screen.getByTestId("pageTitle")).toHaveTextContent("Home Page Title");
});

test("renders ToggleTheme component", () => {
  render(<HomePage />);
  
  expect(screen.getByTestId("toggle-theme")).toBeInTheDocument();
});

test("renders LangToggle component", () => {
  render(<HomePage />);
  
  expect(screen.getByTestId("lang-toggle")).toBeInTheDocument();
});

test("has correct CSS classes for layout", () => {
  const { container } = render(<HomePage />);
  
  const mainDiv = container.firstChild as HTMLElement;
  expect(mainDiv).toHaveClass("flex", "h-full", "flex-col");
  
  const centerDiv = mainDiv.querySelector(".flex-1");
  expect(centerDiv).toHaveClass("flex", "flex-1", "flex-col", "items-center", "justify-center", "gap-2");
});

test("app name has correct styling", () => {
  render(<HomePage />);
  
  const appNameElement = screen.getByText("Test App Name");
  expect(appNameElement).toHaveClass("font-mono", "text-4xl", "font-bold");
});

test("page title has correct styling and test id", () => {
  render(<HomePage />);
  
  const pageTitleElement = screen.getByTestId("pageTitle");
  expect(pageTitleElement).toHaveClass("text-end", "text-sm", "uppercase", "text-muted-foreground");
}); 