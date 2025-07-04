/**
 * Builds environment configuration for Protocol Servers
 */
import { McpApiGroup } from "@/lib/db/mcp-db";
import { getApiById } from "@/lib/db/api-db";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { buildVariableName, discoverAuthSchemes } from "./auth";

export async function buildEnvExampleCode(
  serviceGroups: Record<string, McpApiGroup>,
): Promise<string> {
  const serviceUrls = Object.values(serviceGroups)
    .map(
      (group) =>
        `${buildVariableName(group.name, "BASE_URL")}=${group.serverUrl}`,
    )
    .join("\n");

  // Collect all authentication variables
  const collectedVariables = new Set<string>();
  const inferredVariables = new Set<string>();

  for (const [apiId, group] of Object.entries(serviceGroups)) {
    if (group.tools && group.tools.length > 0) {
      const api = await getApiById(apiId);
      if (api) {
        try {
          const specification = (await SwaggerParser.dereference(
            api.api,
          )) as OpenAPIV3.Document;

          const authSchemes = discoverAuthSchemes(specification, group.name);

          // Collect environment variables
          authSchemes.forEach((scheme) => {
            if (scheme.type === "apiKey") {
              const variable = `${scheme.keyEnvVar}=`;
              collectedVariables.add(variable);
              if (scheme.isInferred) {
                inferredVariables.add(variable);
              }
            } else if (scheme.type === "bearerToken") {
              const variable = `${scheme.tokenEnvVar}=`;
              collectedVariables.add(variable);
              if (scheme.isInferred) {
                inferredVariables.add(variable);
              }
            }
          });
        } catch (err) {
          console.warn(
            `Failed to process authentication for service ${apiId}:`,
            err,
          );
        }
      }
    }
  }

  const orderedVariables = Array.from(collectedVariables).sort();
  let authSection = "";

  if (inferredVariables.size > 0) {
    authSection +=
      "# Authentication (automatically detected - not defined in API spec)\n";
    authSection +=
      "# These are standard authentication patterns that may be compatible\n";
    orderedVariables.forEach((variable) => {
      if (inferredVariables.has(variable)) {
        authSection += `${variable}\n`;
      }
    });

    const definedVariables = orderedVariables.filter(
      (variable) => !inferredVariables.has(variable),
    );
    if (definedVariables.length > 0) {
      authSection += "\n# Authentication (specified in API definition)\n";
      authSection += definedVariables.join("\n");
    }
  } else {
    authSection = orderedVariables.join("\n");
  }

  let template = `# Protocol Server Configuration
# Duplicate this file as .env and configure values

# Service endpoints
${serviceUrls}

PORT=3000
LOG_LEVEL=info

`;

  // Add authentication section
  if (authSection.length > 0) {
    template += `# Authentication configuration\n`;

    template += authSection;
  } else {
    template += `# No authentication configuration needed\n`;
  }

  return template;
}
