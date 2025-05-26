import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { 
  getCurrentTheme, 
  setTheme, 
  toggleTheme, 
  syncThemeWithLocal 
} from "@/helpers/theme_helpers";
import { ThemeMode } from "@/types/theme-mode";

// Mock the global window object
const mockThemeMode = {
  current: vi.fn(),
  dark: vi.fn(),
  light: vi.fn(),
  system: vi.fn(),
  toggle: vi.fn()
};

// Setup global mocks
beforeEach(() => {
  // Mock window.themeMode
  Object.defineProperty(window, 'themeMode', {
    value: mockThemeMode,
    writable: true
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  // Mock document.documentElement
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn()
  };
  Object.defineProperty(document.documentElement, 'classList', {
    value: mockClassList,
    writable: true
  });

  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("getCurrentTheme returns system and local theme preferences", async () => {
  const mockSystemTheme: ThemeMode = "dark";
  const mockLocalTheme: ThemeMode = "light";

  mockThemeMode.current.mockResolvedValue(mockSystemTheme);
  (window.localStorage.getItem as any).mockReturnValue(mockLocalTheme);

  const result = await getCurrentTheme();

  expect(mockThemeMode.current).toHaveBeenCalled();
  expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
  expect(result).toEqual({
    system: mockSystemTheme,
    local: mockLocalTheme
  });
});

test("getCurrentTheme handles null local theme", async () => {
  const mockSystemTheme: ThemeMode = "light";

  mockThemeMode.current.mockResolvedValue(mockSystemTheme);
  (window.localStorage.getItem as any).mockReturnValue(null);

  const result = await getCurrentTheme();

  expect(result).toEqual({
    system: mockSystemTheme,
    local: null
  });
});

test("setTheme to dark mode", async () => {
  await setTheme("dark");

  expect(mockThemeMode.dark).toHaveBeenCalled();
  expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
});

test("setTheme to light mode", async () => {
  await setTheme("light");

  expect(mockThemeMode.light).toHaveBeenCalled();
  expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "light");
});

test("setTheme to system mode with dark preference", async () => {
  mockThemeMode.system.mockResolvedValue(true);

  await setTheme("system");

  expect(mockThemeMode.system).toHaveBeenCalled();
  expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "system");
});

test("setTheme to system mode with light preference", async () => {
  mockThemeMode.system.mockResolvedValue(false);

  await setTheme("system");

  expect(mockThemeMode.system).toHaveBeenCalled();
  expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "system");
});

test("toggleTheme switches to dark mode", async () => {
  mockThemeMode.toggle.mockResolvedValue(true);

  await toggleTheme();

  expect(mockThemeMode.toggle).toHaveBeenCalled();
  expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
});

test("toggleTheme switches to light mode", async () => {
  mockThemeMode.toggle.mockResolvedValue(false);

  await toggleTheme();

  expect(mockThemeMode.toggle).toHaveBeenCalled();
  expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "light");
});

test("syncThemeWithLocal uses system theme when no local preference", async () => {
  mockThemeMode.current.mockResolvedValue("light");
  (window.localStorage.getItem as any).mockReturnValue(null);
  mockThemeMode.system.mockResolvedValue(false);

  await syncThemeWithLocal();

  expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
  expect(mockThemeMode.system).toHaveBeenCalled();
  expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "system");
});

test("syncThemeWithLocal uses local preference when available", async () => {
  const localTheme: ThemeMode = "dark";
  mockThemeMode.current.mockResolvedValue("light");
  (window.localStorage.getItem as any).mockReturnValue(localTheme);

  await syncThemeWithLocal();

  expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
  expect(mockThemeMode.dark).toHaveBeenCalled();
  expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
});

test("DOM manipulation works correctly for dark theme", async () => {
  await setTheme("dark");

  expect(document.documentElement.classList.remove).not.toHaveBeenCalledWith("dark");
  expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
});

test("DOM manipulation works correctly for light theme", async () => {
  await setTheme("light");

  expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  expect(document.documentElement.classList.add).not.toHaveBeenCalledWith("dark");
});

test("localStorage key is consistent across functions", async () => {
  const expectedKey = "theme";

  await setTheme("dark");
  await getCurrentTheme();
  await toggleTheme();

  expect(window.localStorage.setItem).toHaveBeenCalledWith(expectedKey, expect.any(String));
  expect(window.localStorage.getItem).toHaveBeenCalledWith(expectedKey);
}); 