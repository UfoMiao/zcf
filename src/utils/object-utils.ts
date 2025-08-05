/**
 * Deep merge options
 */
export interface DeepMergeOptions {
  mergeArrays?: boolean;
  arrayMergeStrategy?: 'replace' | 'concat' | 'unique';
}

/**
 * Merge arrays with unique values
 */
export function mergeArraysUnique<T>(arr1: T[], arr2: T[]): T[] {
  const combined = [...(arr1 || []), ...(arr2 || [])];
  return [...new Set(combined)];
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object &&
         Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Deep merge two objects with configurable array handling
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
  options: DeepMergeOptions = {}
): T {
  const { mergeArrays = false, arrayMergeStrategy = 'replace' } = options;
  const result = { ...target } as T;

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      // Recursively merge objects
      (result as any)[key] = deepMerge(targetValue as any, sourceValue as any, options);
    } else if (Array.isArray(sourceValue)) {
      if (!mergeArrays || !Array.isArray(targetValue)) {
        // Replace array
        (result as any)[key] = sourceValue;
      } else {
        // Merge arrays based on strategy
        switch (arrayMergeStrategy) {
          case 'concat':
            (result as any)[key] = [...targetValue, ...sourceValue];
            break;
          case 'unique':
            (result as any)[key] = mergeArraysUnique(targetValue, sourceValue);
            break;
          case 'replace':
          default:
            (result as any)[key] = sourceValue;
            break;
        }
      }
    } else {
      // Direct assignment for primitive values
      (result as any)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (isPlainObject(obj)) {
    const cloned = {} as T;
    for (const key in obj) {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    }
    return cloned;
  }

  // For other object types, return as is
  return obj;
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}