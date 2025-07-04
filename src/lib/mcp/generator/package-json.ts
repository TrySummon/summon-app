/**
 * Creates the package json code for the Protocol Server
 *
 * @param serviceName Service identifier
 * @param versionNumber Version string
 * @returns JSON package.json code
 */
export function buildPackageJsonCode(
  serviceName: string,
  versionNumber: string,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifestData: any = {
    name: serviceName,
    version: versionNumber,
    description: `Protocol Server built from API specification for ${serviceName}`,
    private: true,
    type: "module",
    main: "dist/index.js",
    files: ["dist", "src"],
    scripts: {
      start: "node dist/index.js",
      compile: "tsc && npm run copy-json && chmod 755 dist/index.js",
      "copy-json": "mkdir -p dist/tools && cp src/tools/*.json dist/tools/",
      verify: "tsc --noEmit",
      prestart: "npm run compile",
    },
    engines: {
      node: ">=20.0.0",
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "^1.15.0",
      axios: "^1.9.0",
      dotenv: "^16.4.5",
      zod: "^3.24.3",
      "json-schema-to-zod": "^2.6.1",
    },
    devDependencies: {
      "@types/node": "^22.15.2",
      typescript: "^5.8.3",
    },
  };

  manifestData.dependencies = {
    ...manifestData.dependencies,
    hono: "^4.7.7",
    "@hono/node-server": "^1.14.1",
    uuid: "^11.1.0",
  };

  manifestData.devDependencies = {
    ...manifestData.devDependencies,
    "@types/uuid": "^10.0.0",
  };

  manifestData.scripts["launch:stream"] =
    "node dist/index.js --transport=stream-http";
  manifestData.dependencies["fetch-to-node"] = "^2.1.0";

  return JSON.stringify(manifestData, null, 2);
}
