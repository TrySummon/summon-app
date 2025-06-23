/**
 * Security handling utilities for OpenAPI to MCP generator
 */
import { OpenAPIV3 } from "openapi-types";

/**
 * Get environment variable name for a security scheme
 *
 * @param schemeName Security scheme name
 * @param type Type of security credentials
 * @returns Environment variable name
 */
export function getEnvVarName(
  schemeName: string,
  type:
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
  const sanitizedName = schemeName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return `${sanitizedName}_${type}`;
}

/**
 * Generates code for handling API key security
 *
 * @param scheme API key security scheme
 * @returns Generated code
 */
export function generateApiKeySecurityCode(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scheme: OpenAPIV3.ApiKeySecurityScheme,
): string {
  const schemeName = "schemeName"; // Placeholder, will be replaced in template
  return `
    if (scheme?.type === 'apiKey') {
        const apiKey = process.env[\`${getEnvVarName(schemeName, "API_KEY")}\`];
        if (apiKey) {
            if (scheme.in === 'header') {
                headers[scheme.name.toLowerCase()] = apiKey;
            }
            else if (scheme.in === 'query') {
                queryParams[scheme.name] = apiKey;
            }
            else if (scheme.in === 'cookie') {
                headers['cookie'] = \`\${scheme.name}=\${apiKey}\${headers['cookie'] ? \`; \${headers['cookie']}\` : ''}\`;
            }
        }
    }`;
}

/**
 * Generates code for handling HTTP security (Bearer/Basic)
 *
 * @returns Generated code
 */
export function generateHttpSecurityCode(): string {
  const schemeName = "schemeName"; // Placeholder, will be replaced in template
  return `
    else if (scheme?.type === 'http') {
        if (scheme.scheme?.toLowerCase() === 'bearer') {
            const token = process.env[\`${getEnvVarName(schemeName, "BEARER_TOKEN")}\`];
            if (token) {
                headers['authorization'] = \`Bearer \${token}\`;
            }
        } 
        else if (scheme.scheme?.toLowerCase() === 'basic') {
            const username = process.env[\`${getEnvVarName(schemeName, "BASIC_USERNAME")}\`];
            const password = process.env[\`${getEnvVarName(schemeName, "BASIC_PASSWORD")}\`];
            if (username && password) {
                headers['authorization'] = \`Basic \${Buffer.from(\`\${username}:\${password}\`).toString('base64')}\`;
            }
        }
    }`;
}

/**
 * Generates code for OAuth2 token acquisition
 *
 * @returns Generated code for OAuth2 token acquisition
 */
export function generateOAuth2TokenAcquisitionCode(): string {
  return `
/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 * 
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials
        const clientId = process.env[\`${getEnvVarName("schemeName", "OAUTH_CLIENT_ID")}\`];
        const clientSecret = process.env[\`${getEnvVarName("schemeName", "OAUTH_CLIENT_SECRET")}\`];
        const scopes = process.env[\`${getEnvVarName("schemeName", "OAUTH_SCOPES")}\`];
        
        if (!clientId || !clientSecret) {
            console.error(\`Missing client credentials for OAuth2 scheme '\${schemeName}'\`);
            return null;
        }
        
        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }
        
        // Check if we have a cached token
        const cacheKey = \`\${schemeName}_\${clientId}\`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();
        
        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(\`Using cached OAuth2 token for '\${schemeName}' (expires in \${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)\`);
            return cachedToken.token;
        }
        
        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(\`Using client credentials flow for '\${schemeName}'\`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(\`Using password flow for '\${schemeName}'\`);
        } else {
            console.error(\`No supported OAuth2 flow found for '\${schemeName}'\`);
            return null;
        }
        
        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        
        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }
        
        console.error(\`Requesting OAuth2 token from \${tokenUrl}\`);
        
        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': \`Basic \${Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')}\`
            },
            data: formData.toString()
        });
        
        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            
            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(\`Successfully acquired OAuth2 token for '\${schemeName}' (expires in \${expiresIn} seconds)\`);
            return token;
        } else {
            console.error(\`Failed to acquire OAuth2 token for '\${schemeName}': No access_token in response\`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(\`Error acquiring OAuth2 token for '\${schemeName}':\`, errorMessage);
        return null;
    }
}
`;
}

/**
 * Generates code for executing API tools with security handling
 *
 * @returns Generated code for the execute API tool function
 */
export function generateExecuteApiToolFunction(): string {
  return `
/**
 * Executes an API tool with the provided arguments
 * 
 * @param toolName Name of the tool to execute
 * @param definition Tool definition containing security schemes
 * @param args Arguments to pass to the tool
 * @returns Promise resolving to the API response
 */
async function executeApiTool(toolName: string, definition: McpToolDefinition, args: Record<string, any>): Promise<any> {
    try {
    const baseUrl = process.env[definition.securityScheme.baseUrlEnvVar];
    if (!baseUrl) {
        throw new Error(\`Base URL environment variable \${definition.securityScheme.baseUrlEnvVar} is not set\`);
    }

      // --- Argument Validation using Zod ---
      let validatedArgs: JsonObject;
      try {
          const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
          const argsToParse = (typeof args === 'object' && args !== null) ? args : {};
          validatedArgs = zodSchema.parse(argsToParse);
          console.error(\`Arguments validated successfully for tool '\${toolName}'.\`);
      } catch (error: any) {
          if (error instanceof ZodError) {
              const validationErrorMessage = \`Invalid arguments for tool '\${toolName}': \${error.errors.map(e => \`\${e.path.join('.')} (\${e.code}): \${e.message}\`).join(', ')}\`;
              console.error(validationErrorMessage);
              return { content: [{ type: 'text', text: validationErrorMessage }] };
          } else {
               console.error(\`Unexpected error during argument validation setup for tool '\${toolName}':\`, error);
               return { content: [{ type: 'text', text: \`Internal server error during argument validation setup for tool '\${toolName}'.\` }] };
          }
      }

    // Build URL with path parameters
    let url = baseUrl + definition.pathTemplate;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Apply authentication from available security schemes
    const authSchemas = definition.securityScheme.schemas || [];
    let authApplied = false;

    for (const authSchema of authSchemas) {
        if (authApplied) break; // Stop once we've successfully applied auth
        
        switch (authSchema.type) {
            case 'apiKey':
                const apiKeyValue = process.env[authSchema.keyEnvVar];
                if (apiKeyValue) {
                    if (authSchema.in === 'header') {
                        headers[authSchema.name.toLowerCase()] = apiKeyValue;
                        authApplied = true;
                    } else if (authSchema.in === 'query') {
                        queryParams[authSchema.name] = apiKeyValue;
                        authApplied = true;
                    }
                }
                break;
            case 'bearerToken':
                const tokenValue = process.env[authSchema.tokenEnvVar];
                if (tokenValue) {
                    headers['authorization'] = \`Bearer \${tokenValue}\`;
                    authApplied = true;
                }
                break;
            default:
                break;
        }
    }

    // Process parameters
    for (const param of definition.executionParameters) {
        const value = validatedArgs[param.name];
        if (value !== undefined) {
            if (param.in === 'path') {
                url = url.replace(\`{\${param.name}}\`, encodeURIComponent(String(value)));
            } else if (param.in === 'query') {
                queryParams[param.name] = String(value);
            } else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    }

    // Ensure all path parameters are resolved
    if (url.includes('{')) {
      throw new Error(\`Failed to resolve path parameters: \${url}\`);
    }

    const finalUrl = url;

    // Prepare request body
    let body: string | undefined;
    if (definition.method.toUpperCase() !== 'GET' && definition.method.toUpperCase() !== 'HEAD') {
        if (definition.requestBodyContentType === 'application/json') {
            // For JSON requests, send remaining args as body
            const bodyArgs = { ...validatedArgs };
            definition.executionParameters.forEach((param: any) => {
                if (param.in !== 'body') {
                    delete bodyArgs[param.name];
                }
            });
            if (Object.keys(bodyArgs).length > 0) {
                body = JSON.stringify(bodyArgs);
            }
        }
    }

    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(), 
      url: finalUrl, 
      params: queryParams, 
      headers: headers,
      ...(body !== undefined && { data: body }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(\`Executing tool "\${toolName}": \${config.method} \${config.url}\`);

    // Make the request
    const response = await axios(config);

   // Process and format the response
   let responseText = '';
   const contentType = response.headers['content-type']?.toLowerCase() || '';
   
   // Handle JSON responses
   if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
        try { 
            responseText = JSON.stringify(response.data, null, 2); 
        } catch (e) { 
            responseText = "[Stringify Error]"; 
        }
   } 
   // Handle string responses
   else if (typeof response.data === 'string') { 
        responseText = response.data; 
   }
   // Handle other response types
   else if (response.data !== undefined && response.data !== null) { 
        responseText = String(response.data); 
   }
   // Handle empty responses
   else { 
        responseText = \`(Status: \${response.status} - No body content)\`; 
   }
   
   // Return formatted response
   return { 
       content: [ 
           { 
               type: "text", 
               text: \`API Response (Status: \${response.status}):\\n\${responseText}\` 
           } 
       ], 
   };
  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;
    
    // Format Axios errors specially
    if (axios.isAxiosError(error)) { 
        errorMessage = formatApiError(error); 
    }
    // Handle standard errors
    else if (error instanceof Error) { 
        errorMessage = error.message; 
    }
    // Handle unexpected error types
    else { 
        errorMessage = 'Unexpected error: ' + String(error); 
    }
    
    // Log error to stderr
    console.error(\`Error during execution of tool '\${toolName}':\`, errorMessage);
    
    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}`;
}

/**
 * Extracts all supported security schemes from OpenAPI spec
 *
 * @param apiSpec OpenAPI specification document (already dereferenced)
 * @param apiGroupName Name of the API group for environment variable naming
 * @returns Array of security scheme definitions for MCP tools
 */
export function extractSecuritySchemes(
  apiSpec: OpenAPIV3.Document,
  apiGroupName: string,
): Array<
  | {
      type: "apiKey";
      keyEnvVar: string;
      in: "header" | "query";
      name: string;
      isInferred?: boolean;
    }
  | {
      type: "bearerToken";
      tokenEnvVar: string;
      isInferred?: boolean;
    }
> {
  const schemes: Array<
    | {
        type: "apiKey";
        keyEnvVar: string;
        in: "header" | "query";
        name: string;
        isInferred?: boolean;
      }
    | {
        type: "bearerToken";
        tokenEnvVar: string;
        isInferred?: boolean;
      }
  > = [];

  const securitySchemes = apiSpec.components?.securitySchemes;

  // If no security schemes are defined, provide sensible defaults
  if (!securitySchemes || Object.keys(securitySchemes).length === 0) {
    // Add default API key in header
    schemes.push({
      type: "apiKey",
      keyEnvVar: getEnvVarName(`${apiGroupName}`, "API_KEY"),
      in: "header",
      name: "X-API-Key",
      isInferred: true,
    });

    // Add default bearer token
    schemes.push({
      type: "bearerToken",
      tokenEnvVar: getEnvVarName(`${apiGroupName}`, "BEARER_TOKEN"),
      isInferred: true,
    });

    return schemes;
  }

  for (const scheme of Object.values(securitySchemes)) {
    // Since spec is dereferenced, we can directly access the scheme
    const securityScheme = scheme as OpenAPIV3.SecuritySchemeObject;

    if (securityScheme.type === "apiKey") {
      schemes.push({
        type: "apiKey",
        keyEnvVar: getEnvVarName(apiGroupName, "API_KEY"),
        in: securityScheme.in as "header" | "query",
        name: securityScheme.name,
      });
    } else if (
      securityScheme.type === "http" &&
      securityScheme.scheme === "bearer"
    ) {
      schemes.push({
        type: "bearerToken",
        tokenEnvVar: getEnvVarName(apiGroupName, "BEARER_TOKEN"),
      });
    }
  }

  return schemes;
}

/**
 * Gets security scheme documentation for README
 *
 * @param securitySchemes Security schemes from OpenAPI spec
 * @returns Documentation for security schemes
 */
export function getSecuritySchemesDocs(
  securitySchemes?: OpenAPIV3.ComponentsObject["securitySchemes"],
): string {
  if (!securitySchemes)
    return "No security schemes defined in the OpenAPI spec.";

  let docs = "";

  for (const [name, schemeOrRef] of Object.entries(securitySchemes)) {
    if ("$ref" in schemeOrRef) {
      docs += `- \`${name}\`: Referenced security scheme (reference not resolved)\n`;
      continue;
    }

    const scheme = schemeOrRef;

    if (scheme.type === "apiKey") {
      const envVar = getEnvVarName(name, "API_KEY");
      docs += `- \`${envVar}\`: API key for ${scheme.name} (in ${scheme.in})\n`;
    } else if (scheme.type === "http") {
      if (scheme.scheme?.toLowerCase() === "bearer") {
        const envVar = getEnvVarName(name, "BEARER_TOKEN");
        docs += `- \`${envVar}\`: Bearer token for authentication\n`;
      } else if (scheme.scheme?.toLowerCase() === "basic") {
        const usernameEnvVar = getEnvVarName(name, "BASIC_USERNAME");
        const passwordEnvVar = getEnvVarName(name, "BASIC_PASSWORD");
        docs += `- \`${usernameEnvVar}\`: Username for Basic authentication\n`;
        docs += `- \`${passwordEnvVar}\`: Password for Basic authentication\n`;
      }
    } else if (scheme.type === "oauth2") {
      const flowTypes = scheme.flows ? Object.keys(scheme.flows) : ["unknown"];

      // Add client credentials for OAuth2
      const clientIdVar = getEnvVarName(name, "OAUTH_CLIENT_ID");
      const clientSecretVar = getEnvVarName(name, "OAUTH_CLIENT_SECRET");
      docs += `- \`${clientIdVar}\`: Client ID for OAuth2 authentication (${flowTypes.join(", ")} flow)\n`;
      docs += `- \`${clientSecretVar}\`: Client secret for OAuth2 authentication\n`;

      // Add OAuth token for manual setting
      const tokenVar = getEnvVarName(name, "OAUTH_TOKEN");
      docs += `- \`${tokenVar}\`: OAuth2 token (if not using automatic token acquisition)\n`;

      // Add scopes env var
      const scopesVar = getEnvVarName(name, "OAUTH_SCOPES");
      docs += `- \`${scopesVar}\`: Space-separated list of OAuth2 scopes to request\n`;

      // If available, list flow-specific details
      if (scheme.flows?.clientCredentials) {
        docs += `  Client Credentials Flow Token URL: ${scheme.flows.clientCredentials.tokenUrl}\n`;

        // List available scopes if defined
        if (
          scheme.flows.clientCredentials.scopes &&
          Object.keys(scheme.flows.clientCredentials.scopes).length > 0
        ) {
          docs += `  Available scopes:\n`;
          for (const [scope, description] of Object.entries(
            scheme.flows.clientCredentials.scopes,
          )) {
            docs += `  - \`${scope}\`: ${description}\n`;
          }
        }
      }
    } else if (scheme.type === "openIdConnect") {
      const tokenVar = getEnvVarName(name, "OPENID_TOKEN");
      docs += `- \`${tokenVar}\`: OpenID Connect token\n`;
      if (scheme.openIdConnectUrl) {
        docs += `  OpenID Connect Discovery URL: ${scheme.openIdConnectUrl}\n`;
      }
    }
  }

  return docs;
}
