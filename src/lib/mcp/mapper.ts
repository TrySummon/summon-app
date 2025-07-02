/* eslint-disable @typescript-eslint/no-explicit-any */

// Types for pure static mapping configuration
interface FieldMapping {
  source: string; // JSONPath-like string (e.g., "user.name" or "items[*].id")
  target: string; // Target path in original schema
  defaultValue?: any; // Default value if source is missing
  required?: boolean; // Whether this field is required
}

interface ArrayMapping {
  source: string; // Source array path
  target: string; // Target array path
  itemMappings?: FieldMapping[]; // Mappings for array items
}

interface ConditionalMapping {
  condition: {
    field: string; // Field to check
    operator: "equals" | "exists" | "not_equals" | "not_exists";
    value?: any; // Value to compare against (for equals/not_equals)
  };
  mappings: FieldMapping[]; // Mappings to apply if condition is true
}

export interface MappingConfig {
  fieldMappings: FieldMapping[];
  arrayMappings?: ArrayMapping[];
  conditionalMappings?: ConditionalMapping[];
  globalDefaults?: Record<string, any>; // Global default values
}

// Utility functions
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;

  // Handle array notation like "items[*]" or "items[0]"
  const arrayMatch = path.match(/^([^[]+)\[(\*|\d+)\](.*)$/);
  if (arrayMatch) {
    const [, arrayPath, index, remainingPath] = arrayMatch;
    const array = getNestedValue(obj, arrayPath);
    if (!Array.isArray(array)) return undefined;

    if (index === "*") {
      // Return all items with remaining path applied
      return array.map((item) =>
        remainingPath ? getNestedValue(item, remainingPath.slice(1)) : item,
      );
    } else {
      const item = array[parseInt(index)];
      return remainingPath
        ? getNestedValue(item, remainingPath.slice(1))
        : item;
    }
  }

  // Regular nested path like "user.profile.name"
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object" ? current[key] : undefined;
  }, obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  if (!path) return;

  const keys = path.split(".");
  let current = obj;

  // Navigate to the parent of the target key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Handle array notation
    const arrayMatch = key.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      if (!(arrayKey in current)) current[arrayKey] = [];
      if (!Array.isArray(current[arrayKey])) current[arrayKey] = [];

      const idx = parseInt(index);
      // Ensure array is large enough
      while (current[arrayKey].length <= idx) {
        current[arrayKey].push({});
      }
      current = current[arrayKey][idx];
    } else {
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
  }

  // Set the final value
  const finalKey = keys[keys.length - 1];
  const arrayMatch = finalKey.match(/^([^[]+)\[(\d+)\]$/);

  if (arrayMatch) {
    const [, arrayKey, index] = arrayMatch;
    if (!(arrayKey in current)) current[arrayKey] = [];
    const idx = parseInt(index);
    while (current[arrayKey].length <= idx) {
      current[arrayKey].push(null);
    }
    current[arrayKey][idx] = value;
  } else {
    current[finalKey] = value;
  }
}

function cloneDeep(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(cloneDeep);

  const cloned: any = {};
  for (const key in obj) {
    if (key in obj) {
      cloned[key] = cloneDeep(obj[key]);
    }
  }
  return cloned;
}

function evaluateCondition(
  data: any,
  condition: ConditionalMapping["condition"],
): boolean {
  const fieldValue = getNestedValue(data, condition.field);

  switch (condition.operator) {
    case "exists":
      return fieldValue !== undefined;
    case "not_exists":
      return fieldValue === undefined;
    case "equals":
      return fieldValue === condition.value;
    case "not_equals":
      return fieldValue !== condition.value;
    default:
      return false;
  }
}

// Main mapping function with pure static transformations
export function mapOptimizedToOriginal(
  optimizedData: any,
  mappingConfig: MappingConfig,
): any {
  const result: any = {};

  // Apply global defaults first
  if (mappingConfig.globalDefaults) {
    for (const [key, value] of Object.entries(mappingConfig.globalDefaults)) {
      setNestedValue(result, key, cloneDeep(value));
    }
  }

  // Process field mappings
  for (const mapping of mappingConfig.fieldMappings) {
    let value = getNestedValue(optimizedData, mapping.source);

    // Apply default value if source is missing and default is provided
    if (value === undefined && mapping.defaultValue !== undefined) {
      value = cloneDeep(mapping.defaultValue);
    }

    // Skip if required but missing
    if (mapping.required && value === undefined) {
      throw new Error(`Required field '${mapping.source}' is missing`);
    }

    // Skip if value is still undefined
    if (value === undefined) continue;

    // Set the value in the result (direct copy, no transformations)
    setNestedValue(result, mapping.target, cloneDeep(value));
  }

  // Process array mappings
  if (mappingConfig.arrayMappings) {
    for (const arrayMapping of mappingConfig.arrayMappings) {
      const sourceArray = getNestedValue(optimizedData, arrayMapping.source);

      if (!Array.isArray(sourceArray)) continue;

      // Process item mappings
      if (arrayMapping.itemMappings) {
        const transformedArray = sourceArray.map((item: any) => {
          const transformedItem: any = {};

          for (const itemMapping of arrayMapping.itemMappings!) {
            let itemValue = getNestedValue(item, itemMapping.source);

            if (
              itemValue === undefined &&
              itemMapping.defaultValue !== undefined
            ) {
              itemValue = cloneDeep(itemMapping.defaultValue);
            }

            if (itemMapping.required && itemValue === undefined) {
              throw new Error(
                `Required array item field '${itemMapping.source}' is missing`,
              );
            }

            if (itemValue === undefined) continue;

            setNestedValue(
              transformedItem,
              itemMapping.target,
              cloneDeep(itemValue),
            );
          }

          return transformedItem;
        });

        setNestedValue(result, arrayMapping.target, transformedArray);
      } else {
        // Direct array mapping without item transformation
        setNestedValue(result, arrayMapping.target, cloneDeep(sourceArray));
      }
    }
  }

  // Process conditional mappings with static conditions
  if (mappingConfig.conditionalMappings) {
    for (const conditionalMapping of mappingConfig.conditionalMappings) {
      if (evaluateCondition(optimizedData, conditionalMapping.condition)) {
        for (const mapping of conditionalMapping.mappings) {
          let value = getNestedValue(optimizedData, mapping.source);

          if (value === undefined && mapping.defaultValue !== undefined) {
            value = cloneDeep(mapping.defaultValue);
          }

          if (mapping.required && value === undefined) {
            throw new Error(
              `Required conditional field '${mapping.source}' is missing`,
            );
          }

          if (value === undefined) continue;

          setNestedValue(result, mapping.target, cloneDeep(value));
        }
      }
    }
  }

  return result;
}
