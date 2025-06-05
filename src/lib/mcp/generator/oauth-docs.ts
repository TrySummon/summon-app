/**
 * Generator for OAuth2 documentation
 */
import { OpenAPIV3 } from "openapi-types";

/**
 * Generates documentation about OAuth2 configuration
 *
 * @param securitySchemes Security schemes from OpenAPI spec
 * @returns Markdown documentation about OAuth2 configuration
 */
export function generateOAuth2Docs(
  securitySchemes?: OpenAPIV3.ComponentsObject["securitySchemes"],
): string {
  if (!securitySchemes) {
    return "# OAuth2 Configuration\n\nNo OAuth2 security schemes defined in this API.";
  }

  const oauth2Schemes: {
    name: string;
    scheme: OpenAPIV3.OAuth2SecurityScheme;
  }[] = [];

  // Find OAuth2 schemes
  for (const [name, schemeOrRef] of Object.entries(securitySchemes)) {
    if ("$ref" in schemeOrRef) continue;

    if (schemeOrRef.type === "oauth2") {
      oauth2Schemes.push({
        name,
        scheme: schemeOrRef,
      });
    }
  }

  if (oauth2Schemes.length === 0) {
    return "# OAuth2 Configuration\n\nNo OAuth2 security schemes defined in this API.";
  }

  let content = `# OAuth2 Configuration

This API uses OAuth2 for authentication. The MCP server can handle OAuth2 authentication in the following ways:

1. **Using a pre-acquired token**: You provide a token you've already obtained
2. **Using client credentials flow**: The server automatically acquires a token using your client ID and secret

## Environment Variables

`;

  // Document each OAuth2 scheme
  for (const { name, scheme } of oauth2Schemes) {
    content += `### ${name}\n\n`;

    if (scheme.description) {
      content += `${scheme.description}\n\n`;
    }

    content += "**Configuration Variables:**\n\n";

    const envVarPrefix = name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    content += `- \`OAUTH_CLIENT_ID_${envVarPrefix}\`: Your OAuth client ID\n`;
    content += `- \`OAUTH_CLIENT_SECRET_${envVarPrefix}\`: Your OAuth client secret\n`;

    if (scheme.flows?.clientCredentials) {
      content += `- \`OAUTH_SCOPES_${envVarPrefix}\`: Space-separated list of scopes to request (optional)\n`;
      content += `- \`OAUTH_TOKEN_${envVarPrefix}\`: Pre-acquired OAuth token (optional if using client credentials)\n\n`;

      content += "**Client Credentials Flow:**\n\n";
      content += `- Token URL: \`${scheme.flows.clientCredentials.tokenUrl}\`\n`;

      if (
        scheme.flows.clientCredentials.scopes &&
        Object.keys(scheme.flows.clientCredentials.scopes).length > 0
      ) {
        content += "\n**Available Scopes:**\n\n";

        for (const [scope, description] of Object.entries(
          scheme.flows.clientCredentials.scopes,
        )) {
          content += `- \`${scope}\`: ${description}\n`;
        }
      }

      content += "\n";
    }

    if (scheme.flows?.authorizationCode) {
      content += `- \`OAUTH_TOKEN_${envVarPrefix}\`: Pre-acquired OAuth token (required for authorization code flow)\n\n`;

      content += "**Authorization Code Flow:**\n\n";
      content += `- Authorization URL: \`${scheme.flows.authorizationCode.authorizationUrl}\`\n`;
      content += `- Token URL: \`${scheme.flows.authorizationCode.tokenUrl}\`\n`;

      if (
        scheme.flows.authorizationCode.scopes &&
        Object.keys(scheme.flows.authorizationCode.scopes).length > 0
      ) {
        content += "\n**Available Scopes:**\n\n";

        for (const [scope, description] of Object.entries(
          scheme.flows.authorizationCode.scopes,
        )) {
          content += `- \`${scope}\`: ${description}\n`;
        }
      }

      content += "\n";
    }
  }

  content += `## Token Caching

The MCP server automatically caches OAuth tokens obtained via client credentials flow. Tokens are cached for their lifetime (as specified by the \`expires_in\` parameter in the token response) minus 60 seconds as a safety margin.

When making API requests, the server will:
1. Check for a cached token that's still valid
2. Use the cached token if available
3. Request a new token if no valid cached token exists
`;

  return content;
}
