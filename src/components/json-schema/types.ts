import { OpenAPIV3 } from "openapi-types";

// History item for schema navigation
export interface SchemaHistoryItem {
  name: string;
  schema: OpenAPIV3.SchemaObject;
  modifiedSchema?: OpenAPIV3.SchemaObject;
}

// Property edit state
export interface PropertyEdit {
  name: string;
  description: string;
  isRequired: boolean;
  isDisabled: boolean;
}
