import type { JSONSchema7 } from 'json-schema';

// Helper to get a nested schema property
export const getNestedSchema = (schema: JSONSchema7, path: string[]): JSONSchema7 | undefined => {
  let current: JSONSchema7 | undefined = schema;
  for (let i = 1; i < path.length; i++) { // Start from 1 to skip 'Root'
    if (!current || typeof current === 'boolean' || !current.properties) return undefined;
    current = current.properties[path[i]] as JSONSchema7;
  }
  return current;
};

// Helper to get the original property definition (considering renames)
export const getOriginalProperty = (
  originalRootSchema: JSONSchema7,
  currentPathToParent: string[], // Path to the parent object in the *original* schema
  currentPropName: string, // Current name in modified schema
  modifiedPropSchema?: JSONSchema7 // The modified property schema which might have x-original-name
): { schema?: JSONSchema7; name: string; wasRequired: boolean } => {
  const parentOriginalSchema = getNestedSchema(originalRootSchema, currentPathToParent);
  if (!parentOriginalSchema || typeof parentOriginalSchema === 'boolean' || !parentOriginalSchema.properties) {
    return { name: currentPropName, wasRequired: false };
  }

  const originalName = (modifiedPropSchema as any)?.['x-original-name'] || currentPropName;
  const schema = parentOriginalSchema.properties[originalName] as JSONSchema7;
  const wasRequired = !!parentOriginalSchema.required?.includes(originalName);
  return { schema, name: originalName, wasRequired };
};