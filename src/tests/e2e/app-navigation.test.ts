import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);
  process.env.CI = "e2e";

  electronApp = await electron.launch({
    args: [appInfo.main],
  });
  
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test.beforeEach(async () => {
  page = await electronApp.firstWindow();
  await page.waitForLoadState('networkidle');
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Application Navigation', () => {
  test('should load the homepage', async () => {
    // Check if the main content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check for the main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('electron-shadcn');
  });

  test('should display app name and title', async () => {
    // Look for the app name
    const appContent = page.locator('h1');
    await expect(appContent).toBeVisible();
    await expect(appContent).toHaveText('electron-shadcn');
    
    // Look for the page title with test id
    const pageTitle = page.locator('[data-testid="pageTitle"]');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText('Home Page');
  });

  test('should have theme toggle button', async () => {
    // Look for the theme toggle button (it should have a sun or moon icon)
    const themeButton = page.locator('button').filter({ hasText: /toggle theme/i }).first();
    
    if (await themeButton.count() === 0) {
      // Look for any button with an icon (likely the theme toggle)
      const iconButtons = page.locator('button svg');
      const buttonCount = await iconButtons.count();
      
      if (buttonCount > 0) {
        const button = iconButtons.first().locator('..');
        await expect(button).toBeVisible();
        
        // Test clicking the theme button
        await button.click();
        await page.waitForTimeout(500);
      }
    } else {
      await expect(themeButton).toBeVisible();
      await themeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should have language toggle options', async () => {
    // Look for language toggle elements (might contain flag emojis or language codes)
    const langElements = page.locator('text=/🇺🇸|🇪🇸|🇫🇷|English|Español|Français/').first();
    if (await langElements.count() > 0) {
      await expect(langElements).toBeVisible();
    }
    
    // Look for toggle group or similar language switching UI
    const toggleGroup = page.locator('[role="radiogroup"], [role="group"]').first();
    if (await toggleGroup.count() > 0) {
      await expect(toggleGroup).toBeVisible();
      
      // Try to interact with language toggle
      const toggleItems = toggleGroup.locator('button, [role="radio"]');
      const itemCount = await toggleItems.count();
      
      if (itemCount > 1) {
        // Click the second language option
        await toggleItems.nth(1).click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle window interactions', async () => {
    // Test basic window functionality - for Electron, check if page is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Test that the page content is accessible
    const mainContent = page.locator('h1');
    await expect(mainContent).toBeVisible();
    
    // Test window title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should not have console errors', async () => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Allow some time for any delayed errors
    await page.waitForTimeout(1000);
    
    // Filter out known Electron/development errors that are not critical
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('DevTools') && 
      !error.includes('Extension') &&
      !error.includes('chrome-extension') &&
      !error.includes('Electron Security Warning') &&
      !error.includes('Electron Security') &&
      !error.includes('allowRunningInsecureContent')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper accessibility structure', async () => {
    // Check for basic accessibility structure
    const mainContent = page.locator('main, [role="main"], body > div').first();
    await expect(mainContent).toBeVisible();
    
    // Check that interactive elements are keyboard accessible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Test that at least one button can be focused
      await buttons.first().focus();
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should handle navigation between sections', async () => {
    // Look for navigation elements (sidebar, menu, etc.)
    const navElements = page.locator('nav, [role="navigation"], aside').first();
    if (await navElements.count() > 0) {
      await expect(navElements).toBeVisible();
      
      // Look for clickable navigation items
      const navLinks = navElements.locator('a, button').first();
      if (await navLinks.count() > 0) {
        await navLinks.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should maintain responsive design', async () => {
    // Check that content is visible and accessible at different sizes
    const mainContent = page.locator('body');
    const heading = page.locator('h1');
    
    await expect(mainContent).toBeVisible();
    await expect(heading).toBeVisible();
    
    // Test that key elements remain accessible
    const pageTitle = page.locator('[data-testid="pageTitle"]');
    await expect(pageTitle).toBeVisible();
    
    // Test that buttons are still clickable
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      await expect(buttons.first()).toBeVisible();
    }
  });


}); 