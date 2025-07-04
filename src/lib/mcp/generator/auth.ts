/**
 * Creates OAuth2 authorization documentation
 */
import { OpenAPIV3 } from "openapi-types";
import { AuthSchemas } from "../types";

/**
 * Build environment variable name for authentication
 *
 * @param serviceName Service identifier
 * @param credentialType Type of credential
 * @returns Environment variable name
 */
export function buildVariableName(
  serviceName: string,
  credentialType:
    | "API_KEY"
    | "BEARER_TOKEN"
    | "BASIC_USERNAME"
    | "BASIC_PASSWORD"
    | "OAUTH_CLIENT_ID"
    | "OAUTH_CLIENT_SECRET"
    | "OAUTH_TOKEN"
    | "OAUTH_SCOPES"
    | "OPENID_TOKEN"
    | "BASE_URL",
): string {
  const cleanName = serviceName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return `${cleanName}_${credentialType}`;
}

/**
 * Builds OAuth2 configuration guide
 *
 * @param authSchemes Authentication schemes from API specification
 * @returns Markdown documentation for OAuth2 setup
 */
export function buildOAuth2Guide(
  authSchemes?: OpenAPIV3.ComponentsObject["securitySchemes"],
): string {
  if (!authSchemes) {
    return "# OAuth2 Setup\n\nThis API does not define OAuth2 authentication.";
  }

  const oauthConfigs: {
    identifier: string;
    config: OpenAPIV3.OAuth2SecurityScheme;
  }[] = [];

  // Extract OAuth2 configurations
  for (const [identifier, schemeOrRef] of Object.entries(authSchemes)) {
    if ("$ref" in schemeOrRef) continue;

    if (schemeOrRef.type === "oauth2") {
      oauthConfigs.push({
        identifier,
        config: schemeOrRef,
      });
    }
  }

  if (oauthConfigs.length === 0) {
    return "# OAuth2 Setup\n\nThis API does not define OAuth2 authentication.";
  }

  let documentation = `# OAuth2 Setup Guide

This API supports OAuth2 authentication. The Protocol Server can handle OAuth2 in two modes:

1. **Pre-acquired token mode**: Provide an existing access token
2. **Automated token mode**: Server obtains tokens using client credentials

## Configuration Variables

`;

  // Document each OAuth2 configuration
  for (const { identifier, config } of oauthConfigs) {
    documentation += `### ${identifier}\n\n`;

    if (config.description) {
      documentation += `${config.description}\n\n`;
    }

    documentation += "**Required Variables:**\n\n";

    const variablePrefix = identifier
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toUpperCase();

    documentation += `- \`OAUTH_CLIENT_ID_${variablePrefix}\`: OAuth client identifier\n`;
    documentation += `- \`OAUTH_CLIENT_SECRET_${variablePrefix}\`: OAuth client secret\n`;

    if (config.flows?.clientCredentials) {
      documentation += `- \`OAUTH_SCOPES_${variablePrefix}\`: Space-separated scope list (optional)\n`;
      documentation += `- \`OAUTH_TOKEN_${variablePrefix}\`: Pre-acquired access token (optional for client credentials)\n\n`;

      documentation += "**Client Credentials Configuration:**\n\n";
      documentation += `- Token endpoint: \`${config.flows.clientCredentials.tokenUrl}\`\n`;

      if (
        config.flows.clientCredentials.scopes &&
        Object.keys(config.flows.clientCredentials.scopes).length > 0
      ) {
        documentation += "\n**Available Scopes:**\n\n";

        for (const [scopeName, scopeDesc] of Object.entries(
          config.flows.clientCredentials.scopes,
        )) {
          documentation += `- \`${scopeName}\`: ${scopeDesc}\n`;
        }
      }

      documentation += "\n";
    }

    if (config.flows?.authorizationCode) {
      documentation += `- \`OAUTH_TOKEN_${variablePrefix}\`: Pre-acquired access token (required for authorization code)\n\n`;

      documentation += "**Authorization Code Configuration:**\n\n";
      documentation += `- Authorization endpoint: \`${config.flows.authorizationCode.authorizationUrl}\`\n`;
      documentation += `- Token endpoint: \`${config.flows.authorizationCode.tokenUrl}\`\n`;

      if (
        config.flows.authorizationCode.scopes &&
        Object.keys(config.flows.authorizationCode.scopes).length > 0
      ) {
        documentation += "\n**Available Scopes:**\n\n";

        for (const [scopeName, scopeDesc] of Object.entries(
          config.flows.authorizationCode.scopes,
        )) {
          documentation += `- \`${scopeName}\`: ${scopeDesc}\n`;
        }
      }

      documentation += "\n";
    }
  }

  documentation += `## Token Management

The Protocol Server includes automatic token caching for client credentials. Tokens are cached based on their expiration time (minus 60 seconds for safety).

The server handles tokens as follows:
1. Checks for a valid cached token
2. Uses cached token if available and not expired
3. Requests new token if needed
`;

  return documentation;
}

/**
 * Creates OAuth2 token acquisition code
 *
 * @returns Generated code for OAuth2
 */
export function createOAuth2Handler(): string {
  return `
/**
 * OAuth2 token cache entry
 */
interface CachedToken {
    accessToken: string;
    expiryTime: number;
}

/**
 * Global OAuth2 token storage
 */
declare global {
    var __oauthCache: Record<string, CachedToken> | undefined;
}

/**
 * Obtain OAuth2 access token via client credentials
 * 
 * @param serviceName Service identifier
 * @param authConfig OAuth2 configuration
 * @returns Access token or null
 */
async function obtainOAuth2Token(serviceName: string, authConfig: any): Promise<string | null | undefined> {
    try {
        // Retrieve credentials
        const clientId = process.env[\`${buildVariableName("serviceName", "OAUTH_CLIENT_ID")}\`];
        const clientSecret = process.env[\`${buildVariableName("serviceName", "OAUTH_CLIENT_SECRET")}\`];
        const scopes = process.env[\`${buildVariableName("serviceName", "OAUTH_SCOPES")}\`];
        
        if (!clientId || !clientSecret) {
            console.error(\`OAuth2 credentials missing for '\${serviceName}'\`);
            return null;
        }
        
        // Initialize cache
        if (typeof global.__oauthCache === 'undefined') {
            global.__oauthCache = {};
        }
        
        // Check cache
        const cacheId = \`\${serviceName}_\${clientId}\`;
        const cached = global.__oauthCache[cacheId];
        const currentTime = Date.now();
        
        if (cached && cached.expiryTime > currentTime) {
            console.error(\`Using cached token for '\${serviceName}' (expires in \${Math.floor((cached.expiryTime - currentTime) / 1000)}s)\`);
            return cached.accessToken;
        }
        
        // Determine endpoint
        let endpoint = '';
        if (authConfig.flows?.clientCredentials?.tokenUrl) {
            endpoint = authConfig.flows.clientCredentials.tokenUrl;
            console.error(\`Client credentials flow for '\${serviceName}'\`);
        } else if (authConfig.flows?.password?.tokenUrl) {
            endpoint = authConfig.flows.password.tokenUrl;
            console.error(\`Password flow for '\${serviceName}'\`);
        } else {
            console.error(\`No supported flow for '\${serviceName}'\`);
            return null;
        }
        
        // Prepare request
        let requestData = new URLSearchParams();
        requestData.append('grant_type', 'client_credentials');
        
        if (scopes) {
            requestData.append('scope', scopes);
        }
        
        console.error(\`Requesting token from \${endpoint}\`);
        
        // Execute request
        const tokenResponse = await axios({
            method: 'POST',
            url: endpoint,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': \`Basic \${Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')}\`
            },
            data: requestData.toString()
        });
        
        // Process response
        if (tokenResponse.data?.access_token) {
            const accessToken = tokenResponse.data.access_token;
            const ttl = tokenResponse.data.expires_in || 3600;
            
            // Cache token
            global.__oauthCache[cacheId] = {
                accessToken,
                expiryTime: currentTime + (ttl * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(\`Token acquired for '\${serviceName}' (expires in \${ttl}s)\`);
            return accessToken;
        } else {
            console.error(\`No access token in response for '\${serviceName}'\`);
            return null;
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(\`OAuth2 error for '\${serviceName}':\`, errorMsg);
        return null;
    }
}
`;
}

/**
 * Discovers authentication schemes from API specification
 *
 * @param apiSpec API specification (dereferenced)
 * @param serviceName Service name for variable naming
 * @returns Array of authentication scheme configurations
 */
export function discoverAuthSchemes(
  apiSpec: OpenAPIV3.Document,
  serviceName: string,
): AuthSchemas {
  const authSchemes: AuthSchemas = [];

  const definedSchemes = apiSpec.components?.securitySchemes;

  // Provide defaults if no schemes defined
  if (!definedSchemes || Object.keys(definedSchemes).length === 0) {
    // Default API key
    authSchemes.push({
      type: "apiKey",
      keyEnvVar: buildVariableName(`${serviceName}`, "API_KEY"),
      in: "header",
      name: "X-API-Key",
      isInferred: true,
    });

    // Default bearer token
    authSchemes.push({
      type: "bearerToken",
      tokenEnvVar: buildVariableName(`${serviceName}`, "BEARER_TOKEN"),
      isInferred: true,
    });

    return authSchemes;
  }

  for (const scheme of Object.values(definedSchemes)) {
    const authScheme = scheme as OpenAPIV3.SecuritySchemeObject;

    if (authScheme.type === "apiKey") {
      authSchemes.push({
        type: "apiKey",
        keyEnvVar: buildVariableName(serviceName, "API_KEY"),
        in: authScheme.in as "header" | "query",
        name: authScheme.name,
      });
    } else if (authScheme.type === "http" && authScheme.scheme === "bearer") {
      authSchemes.push({
        type: "bearerToken",
        tokenEnvVar: buildVariableName(serviceName, "BEARER_TOKEN"),
      });
    }
  }

  return authSchemes;
}
