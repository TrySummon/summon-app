/**
 * Builds configuration files for Protocol Servers
 */

/**
 * Creates TypeScript compiler configuration
 *
 * @returns JSON configuration for TypeScript
 */
export function buildTypeScriptConfig(): string {
  const compilerSettings = {
    compilerOptions: {
      esModuleInterop: true,
      skipLibCheck: true,
      target: "ES2022",
      allowJs: true,
      resolveJsonModule: true,
      moduleDetection: "force",
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      module: "Node16",
      moduleResolution: "Node16",
      noEmit: false,
      outDir: "./dist",
      declaration: true,
      sourceMap: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "**/*.test.ts"],
  };

  return JSON.stringify(compilerSettings, null, 2);
}

/**
 * Creates ignore patterns for version control
 *
 * @returns Content for .gitignore
 */
export function buildIgnorePatterns(): string {
  return `# Package managers
node_modules
.pnp
.pnp.js

# Compilation output
dist
build
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Process files
pids
*.pid
*.seed
*.pid.lock

# Test coverage
coverage
*.lcov
.nyc_output

# Build tools
.grunt
bower_components
jspm_packages/
web_modules/
.lock-wscript

# IDE configuration
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.code-workspace
.idea
*.sublime-workspace
*.sublime-project

# Tool caches
.eslintcache
.stylelintcache
.node_repl_history
.browserslistcache

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# System files
.DS_Store
Thumbs.db
`;
}

/**
 * Creates linter configuration
 *
 * @returns JSON configuration for ESLint
 */
export function buildLinterConfig(): string {
  const linterSettings = {
    parser: "@typescript-eslint/parser",
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    plugins: ["@typescript-eslint"],
    env: {
      node: true,
      es2022: true,
    },
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  };

  return JSON.stringify(linterSettings, null, 2);
}

/**
 * Creates test runner configuration
 *
 * @returns Content for jest.config.js
 */
export function buildTestConfig(): string {
  return `export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
`;
}

/**
 * Creates formatter configuration
 *
 * @returns JSON configuration for Prettier
 */
export function buildFormatterConfig(): string {
  const formatterSettings = {
    semi: true,
    trailingComma: "es5",
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
  };

  return JSON.stringify(formatterSettings, null, 2);
}
