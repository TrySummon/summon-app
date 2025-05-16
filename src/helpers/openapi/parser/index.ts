import { determineBaseUrl } from "../utils";
import { extractToolsFromApi } from "./extract-tools";
import { kebabCase } from "../utils/helpers";
import { OpenAPIV3 } from "openapi-types";
import { Collection, McpToolDefinition } from "../types";


export function parseOpenApiDocument(api: OpenAPIV3.Document, options?: { ignoreDeprecated?: boolean; ignoreOptional?: boolean }): {collection: Collection, tools: McpToolDefinition[]} {
    const serverNameRaw = api.info.title;
    const serverName = serverNameRaw.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const serverVersion = api.info.version;
    const serverBaseUrl = determineBaseUrl(api);
    const tags = api.tags?.map((tag) => kebabCase(tag.name)) || [];
    const security = api.components?.securitySchemes;

    const collection = {
        name: serverName,
        version: serverVersion,
        baseUrl: serverBaseUrl,
        tags,
        security
    }

    const tools = extractToolsFromApi(api, options);

    return {collection, tools}
}