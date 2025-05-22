/**
 * Normalizes a URL by removing trailing slashes
 *
 * @param url URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Joins URL segments handling slashes correctly
 *
 * @param baseUrl Base URL
 * @param path Path to append
 * @returns Joined URL
 */
export function joinUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path;
  if (!path) return baseUrl;

  const normalizedBase = normalizeUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Builds a URL with query parameters
 *
 * @param baseUrl Base URL
 * @param queryParams Query parameters
 * @returns URL with query parameters
 */
export function buildUrlWithQuery(
  baseUrl: string,
  queryParams: Record<string, any>
): string {
  if (!Object.keys(queryParams).length) return baseUrl;

  const url = new URL(
    baseUrl.startsWith("http")
      ? baseUrl
      : `http://localhost${baseUrl.startsWith("/") ? "" : "/"}${baseUrl}`
  );

  for (const [key, value] of Object.entries(queryParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else {
      url.searchParams.append(key, String(value));
    }
  }

  // Remove http://localhost if we added it
  return baseUrl.startsWith("http")
    ? url.toString()
    : url.pathname + url.search;
}

/**
 * Extracts path parameters from a URL template
 *
 * @param urlTemplate URL template with {param} placeholders
 * @returns Array of parameter names
 */
export function extractPathParams(urlTemplate: string): string[] {
  const paramRegex = /{([^}]+)}/g;
  const params: string[] = [];
  let match;

  while ((match = paramRegex.exec(urlTemplate)) !== null) {
    params.push(match[1]);
  }

  return params;
}
