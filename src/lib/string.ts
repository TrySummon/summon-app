/**
 * Capitalizes the first character of a string and makes the rest lowercase
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Transform text to title format
 *
 * @param text Input text
 * @returns Title formatted text
 */
export function toTitleCase(text: string): string {
  // Transforms snake_case, kebab-case, or path/segments to TitleCase
  return text
    .toLowerCase()
    .replace(/[-_/](.)/g, (_, char) => char.toUpperCase())
    .replace(/^{/, "")
    .replace(/}$/, "")
    .replace(/^./, (char) => char.toUpperCase());
}

/**
 * Transforms text to hyphen-case.
 * - Processes camelCase, PascalCase, snake_case, and space-separated text
 * - Converts to lowercase
 * - Replaces spaces, underscores, and case transitions with hyphens
 * - Removes duplicate hyphens and trims from edges
 *
 * @param text - Input text to transform
 * @returns Hyphen-cased text
 */
export function toHyphenCase(text: string): string {
  if (!text) return "";

  // Insert spaces before uppercase letters in camelCase/PascalCase
  const spacedText = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  // Transform to hyphen-case
  return spacedText
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Creates operation identifier from HTTP method and path
 *
 * @param httpMethod HTTP method
 * @param urlPath API path
 * @returns Generated identifier
 */
export function buildApiOperationId(
  httpMethod: string,
  urlPath: string,
): string {
  const segments = urlPath.split("/").filter((s) => s);

  let identifier = httpMethod.toLowerCase();

  segments.forEach((segment, idx) => {
    if (segment.startsWith("{") && segment.endsWith("}")) {
      // Add 'By' + ParamName for the final parameter
      if (idx === segments.length - 1) {
        identifier += "By" + toTitleCase(segment);
      }
    } else {
      // Add static segment in TitleCase
      identifier += toTitleCase(segment);
    }
  });

  // Default fallback
  if (identifier === httpMethod.toLowerCase()) {
    identifier += "Root";
  }

  // Capitalize first character
  identifier = identifier.charAt(0).toUpperCase() + identifier.slice(1);

  return identifier;
}
