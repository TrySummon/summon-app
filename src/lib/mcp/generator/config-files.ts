/**
 * Generator for configuration files for MCP servers
 */

/**
 * Generates the content of tsconfig.json for the MCP server
 *
 * @returns JSON string for tsconfig.json
 */
export function generateTsconfigJson(): string {
  const tsconfigData = {
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
      outDir: "./build",
      declaration: true,
      sourceMap: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "build", "**/*.test.ts"],
  };

  return JSON.stringify(tsconfigData, null, 2);
}

/**
 * Generates the content of .gitignore for the MCP server
 *
 * @returns Content for .gitignore
 */
export function generateGitignore(): string {
  return `# Dependencies
node_modules
.pnp
.pnp.js

# Build outputs
dist
build
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Reports
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage
coverage
*.lcov
.nyc_output

# Build artifacts
.grunt
bower_components
jspm_packages/
web_modules/
.lock-wscript

# Editor settings
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.code-workspace
.idea
*.sublime-workspace
*.sublime-project

# Caches
.eslintcache
.stylelintcache
.node_repl_history
.browserslistcache

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# OS specific
.DS_Store
Thumbs.db
`;
}

/**
 * Generates the content of .eslintrc.json for the MCP server
 *
 * @returns JSON string for .eslintrc.json
 */
export function generateEslintConfig(): string {
  const eslintConfig = {
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

  return JSON.stringify(eslintConfig, null, 2);
}

/**
 * Generates the content of jest.config.js for the MCP server
 *
 * @returns Content for jest.config.js
 */
export function generateJestConfig(): string {
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
 * Generates the content of .prettierrc for the MCP server
 *
 * @returns JSON string for .prettierrc
 */
export function generatePrettierConfig(): string {
  const prettierConfig = {
    semi: true,
    trailingComma: "es5",
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
  };

  return JSON.stringify(prettierConfig, null, 2);
}
