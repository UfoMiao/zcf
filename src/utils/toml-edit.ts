/**
 * TOML Edit Utility Module
 *
 * Provides format-preserving TOML editing capabilities using @rainbowatcher/toml-edit-js.
 * This module wraps the WASM-based toml_edit library to enable fine-grained modifications
 * while preserving user comments, formatting, and unmanaged configurations.
 */

import init, {
  initSync,
  edit as rawEdit,
  parse as rawParse,
  stringify as rawStringify,
} from '@rainbowatcher/toml-edit-js'

let initialized = false

/**
 * Async initialization for WASM module
 * Should be called before first use in async contexts
 */
export async function ensureTomlInit(): Promise<void> {
  if (!initialized) {
    await init()
    initialized = true
  }
}

/**
 * Sync initialization for WASM module (fallback)
 * Use when async initialization is not possible
 */
export function ensureTomlInitSync(): void {
  if (!initialized) {
    initSync()
    initialized = true
  }
}

/**
 * Check if TOML module is initialized
 */
export function isTomlInitialized(): boolean {
  return initialized
}

/**
 * Reset initialization state (mainly for testing)
 */
export function resetTomlInit(): void {
  initialized = false
}

/**
 * Parse TOML string to JavaScript object
 *
 * @param content - TOML string to parse
 * @returns Parsed JavaScript object
 * @throws Error if TOML is invalid
 *
 * @example
 * ```typescript
 * const config = parseToml<MyConfig>('[section]\nkey = "value"')
 * console.log(config.section.key) // "value"
 * ```
 */
export function parseToml<T = Record<string, unknown>>(content: string): T {
  ensureTomlInitSync()
  return rawParse(content) as T
}

/**
 * Stringify JavaScript object to TOML string
 *
 * @param data - JavaScript object to stringify
 * @returns TOML string
 *
 * @example
 * ```typescript
 * const toml = stringifyToml({ section: { key: 'value' } })
 * // [section]
 * // key = "value"
 * ```
 */
export function stringifyToml(data: Record<string, unknown>): string {
  ensureTomlInitSync()
  return rawStringify(data)
}

/**
 * Edit a specific path in TOML content while preserving formatting and comments
 *
 * This is the key feature that enables fine-grained modifications without
 * losing user customizations like comments, manual formatting, and unmanaged fields.
 *
 * @param content - Original TOML string
 * @param path - Dot-separated path to the value (e.g., "section.key" or "section.nested.key")
 * @param value - New value to set at the path
 * @returns Modified TOML string with formatting preserved
 *
 * @example
 * ```typescript
 * const original = `
 * # User comment
 * [section]
 * key = "old"
 * custom = "user-value"
 * `
 * const updated = editToml(original, 'section.key', 'new')
 * // Result:
 * // # User comment
 * // [section]
 * // key = "new"
 * // custom = "user-value"
 * ```
 */
export function editToml(content: string, path: string, value: unknown): string {
  ensureTomlInitSync()
  return rawEdit(content, path, value)
}

/**
 * Async version of parseToml
 */
export async function parseTomlAsync<T = Record<string, unknown>>(content: string): Promise<T> {
  await ensureTomlInit()
  return rawParse(content) as T
}

/**
 * Async version of stringifyToml
 */
export async function stringifyTomlAsync(data: Record<string, unknown>): Promise<string> {
  await ensureTomlInit()
  return rawStringify(data)
}

/**
 * Async version of editToml
 */
export async function editTomlAsync(content: string, path: string, value: unknown): Promise<string> {
  await ensureTomlInit()
  return rawEdit(content, path, value)
}

/**
 * Batch edit multiple paths in TOML content
 *
 * @param content - Original TOML string
 * @param edits - Array of [path, value] tuples to apply
 * @returns Modified TOML string with all edits applied
 *
 * @example
 * ```typescript
 * const updated = batchEditToml(original, [
 *   ['section.key1', 'value1'],
 *   ['section.key2', 'value2'],
 * ])
 * ```
 */
export function batchEditToml(content: string, edits: Array<[string, unknown]>): string {
  ensureTomlInitSync()
  let result = content
  for (const [path, value] of edits) {
    result = rawEdit(result, path, value)
  }
  return result
}

/**
 * Async version of batchEditToml
 */
export async function batchEditTomlAsync(content: string, edits: Array<[string, unknown]>): Promise<string> {
  await ensureTomlInit()
  let result = content
  for (const [path, value] of edits) {
    result = rawEdit(result, path, value)
  }
  return result
}
