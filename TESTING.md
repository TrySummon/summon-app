# Testing Guide

This project includes a comprehensive test suite with both unit tests and end-to-end (E2E) tests.

## 🧪 Test Types

### Unit Tests
- **Framework**: Vitest + React Testing Library
- **Location**: `src/tests/unit/`
- **Coverage**: Components, utilities, and integration tests

### End-to-End Tests
- **Framework**: Playwright
- **Location**: `src/tests/e2e/`
- **Coverage**: Full application workflows and user interactions

## 🚀 Running Tests

### Unit Tests
```bash
# Run all unit tests once
npm run test

# Run unit tests in watch mode (recommended for development)
npm run test:unit

# Run unit tests with coverage
npm run test -- --coverage
```

### End-to-End Tests
```bash
# Install Playwright browsers (required first time)
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Install browsers and run E2E tests in one command
npm run test:e2e:install

# Run all tests (unit + E2E)
npm run test:all
```

## 🔧 Playwright Browser Installation

### Automatic Installation (Recommended)

The project is configured to automatically install Playwright browsers when you run `npm install` via the `postinstall` script. This ensures browsers are always available.

### Manual Installation Options

If you need to install browsers manually:

```bash
# Install all browsers
npx playwright install

# Install specific browser
npx playwright install chromium

# Install browsers with dependencies (Linux)
npx playwright install --with-deps
```

### CI/CD Setup

For continuous integration, add this to your workflow:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run tests
  run: npm run test:all
```

### Docker Setup

For Docker environments:

```dockerfile
# Install Playwright browsers in Docker
RUN npx playwright install --with-deps
```

## 📁 Test Structure

```
src/tests/
├── unit/
│   ├── HomePage.test.tsx           # HomePage component tests
│   ├── LangToggle.test.tsx         # Language toggle functionality
│   ├── theme-helpers.test.ts       # Theme management utilities
│   ├── ToggleTheme.test.tsx        # Theme toggle component
│   ├── integration-simple.test.tsx # Component integration tests
│   ├── sum.test.ts                 # Example test
│   └── setup.ts                    # Test configuration
└── e2e/
    ├── app-navigation.test.ts      # Application navigation tests
    └── example.test.ts             # Example E2E test
```

## 🎯 Test Coverage

Current test coverage includes:

### Components
- ✅ HomePage rendering and layout
- ✅ Theme toggle functionality
- ✅ Language switching
- ✅ Component integration

### Utilities
- ✅ Theme management (dark/light mode)
- ✅ localStorage interactions
- ✅ DOM manipulation
- ✅ Language helpers

### User Interactions
- ✅ Button clicks
- ✅ Form interactions
- ✅ Navigation
- ✅ Responsive design

## 🛠️ Writing Tests

### Unit Test Example
```typescript
import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import MyComponent from "@/components/MyComponent";

test("renders component correctly", () => {
  render(<MyComponent />);
  expect(screen.getByText("Hello World")).toBeInTheDocument();
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('user can navigate to page', async ({ page }) => {
  await page.goto('/');
  await page.click('button[data-testid="nav-button"]');
  await expect(page).toHaveURL('/target-page');
});
```

## 🔍 Debugging Tests

### Unit Tests
```bash
# Run tests in debug mode
npm run test:unit -- --reporter=verbose

# Run specific test file
npm run test:unit -- HomePage.test.tsx

# Run tests with UI (Vitest UI)
npx vitest --ui
```

### E2E Tests
```bash
# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## 🚨 Troubleshooting

### Common Issues

1. **Playwright browsers not installed**
   ```bash
   Error: browserType.launch: Executable doesn't exist
   ```
   **Solution**: Run `npm run playwright:install`

2. **Module not found errors**
   ```bash
   Error: Cannot find module '@/components/...'
   ```
   **Solution**: Check that path aliases are configured in `vitest.config.ts`

3. **React Testing Library errors**
   ```bash
   Error: TestingLibraryElementError: Unable to find...
   ```
   **Solution**: Ensure components are properly mocked and rendered

### Environment Variables

For different test environments:

```bash
# Set test environment
NODE_ENV=test npm run test

# Run tests in CI mode
CI=true npm run test:all
```

## 📊 Test Scripts Summary

| Script | Description |
|--------|-------------|
| `npm run test` | Run unit tests once |
| `npm run test:unit` | Run unit tests in watch mode |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run all tests |
| `npm run playwright:install` | Install Playwright browsers |
| `npm run test:e2e:install` | Install browsers and run E2E tests |

## 🎉 Best Practices

1. **Always install Playwright browsers** before running E2E tests
2. **Use watch mode** during development for faster feedback
3. **Write descriptive test names** that explain what is being tested
4. **Mock external dependencies** to keep tests isolated
5. **Test user interactions** rather than implementation details
6. **Keep tests fast** by avoiding unnecessary async operations
7. **Use data-testid** attributes for reliable element selection 