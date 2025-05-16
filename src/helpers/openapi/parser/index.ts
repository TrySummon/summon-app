import { determineBaseUrl } from "../utils";
import { extractToolsFromApi } from "./extract-tools";
import { kebabCase } from "../utils/helpers";
import { OpenAPIV3 } from "openapi-types";
import { API, McpToolDefinition } from "../types";


export function parseOpenApiDocument(openApiDoc: OpenAPIV3.Document, options?: { ignoreDeprecated?: boolean; ignoreOptional?: boolean }): {api: API, tools: McpToolDefinition[]} {
    const serverNameRaw = openApiDoc.info.title;
    const serverName = serverNameRaw.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const serverVersion = openApiDoc.info.version;
    const serverBaseUrl = determineBaseUrl(openApiDoc);
    const tags = openApiDoc.tags?.map((tag) => kebabCase(tag.name)) || [];
    const security = openApiDoc.components?.securitySchemes;

    const api = {
        name: serverName,
        description: openApiDoc.info.description,
        version: serverVersion,
        baseUrl: serverBaseUrl,
        tags,
        security
    }

    const tools = extractToolsFromApi(openApiDoc, options);

    return {api, tools}
}