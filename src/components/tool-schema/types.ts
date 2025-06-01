import { OpenAPIV3 } from 'openapi-types';

// Common props for all schema dialogs
export interface BaseSchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: OpenAPIV3.SchemaObject;
  name: string;
}

// Props for the main SchemaDialog component
export interface SchemaDialogProps extends BaseSchemaDialogProps {
  modifiedSchema?: OpenAPIV3.SchemaObject;
  editable?: boolean;
  onChange?: (modifiedSchema: OpenAPIV3.SchemaObject, name?: string) => void;
}

// Props for the read-only schema dialog
export interface ReadOnlySchemaDialogProps extends BaseSchemaDialogProps {}

// Props for the editable schema dialog
export interface EditableSchemaDialogProps extends SchemaDialogProps {
  // All props are inherited from SchemaDialogProps
}

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

// Props for the tool parameter schema component
export interface ToolParameterSchemaProps {
  className?: string;
  schema: any;
  modifiedSchema?: any;
  name: string;
  editable?: boolean;
  onChange?: (modifiedSchema: any, toolName?: string) => void;
}
