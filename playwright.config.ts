import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 * Configuration for Electron E2E testing
 */
export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false, // Electron tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests one at a time for Electron
  reporter: [
    ["html"],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : [])
  ],
  timeout: 30000, // Increased timeout for Electron app startup
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "electron",
      use: { 
        ...devices["Desktop Chrome"],
        // Electron-specific settings
        viewport: { width: 1200, height: 800 },
      },
    },
  ],

  // Global setup for building the app before tests
  globalSetup: require.resolve('./src/tests/e2e/global-setup.ts'),
});
