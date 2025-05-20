import { OpenAPIV3 } from 'openapi-types';

export function resolveRef<T>(
    ref: string,
    doc: OpenAPIV3.Document
  ): T | undefined {
    if (!ref.startsWith('#/')) {
      console.warn(`[resolveRef] Invalid ref format: ${ref}. Only local refs are supported.`);
      return undefined;
    }
    const parts = ref.substring(2).split('/');
    let current: any = doc;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        console.warn(`[resolveRef] Could not resolve path for ${ref} at part ${part}.`);
        return undefined;
      }
    }
    return current as T;
  }