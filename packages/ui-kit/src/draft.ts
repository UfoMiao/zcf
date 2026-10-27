import type { ConfigIssue } from '@zcf/core/schema'
import { parseZcfConfig } from '@zcf/core/schema'

/** The config as the user is editing it: plain JSON, possibly not valid yet. */
export type Draft = Record<string, unknown>
export type DraftPath = readonly (string | number)[]

export function isTable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getAt(draft: unknown, path: DraftPath): unknown {
  let value = draft
  for (const key of path) {
    if (Array.isArray(value) && typeof key === 'number') value = value[key]
    else if (isTable(value)) value = value[key]
    else return undefined
  }
  return value
}

function setIn(container: unknown, path: DraftPath, value: unknown): unknown {
  const [key, ...rest] = path
  if (key === undefined) return value
  if (typeof key === 'number') {
    const list = Array.isArray(container) ? [...container] : []
    // Only removing the item itself removes it; an item left empty stays, so its form stays open.
    if (value === undefined && (rest.length === 0 || list[key] === undefined)) list.splice(key, 1)
    else list[key] = setIn(list[key], rest, value) ?? {}
    // A list emptied by a removal goes too, like a table above: every schema list is
    // optional with an empty default, so `skills: []` left behind is only litter.
    if (value === undefined && rest.length === 0 && list.length === 0) return undefined
    return list
  }
  const table = isTable(container) ? { ...container } : {}
  const next = setIn(table[key], rest, value)
  if (next === undefined) delete table[key]
  else table[key] = next
  // A table emptied by a removal goes too, so a cleared optional block never makes the config invalid.
  return value === undefined && Object.keys(table).length === 0 ? undefined : table
}

/** Set a value without changing `draft`; `undefined` removes the key. Strings, even empty ones, are kept. */
export function setAt(draft: Draft, path: DraftPath, value: unknown): Draft {
  const next = setIn(draft, path, value)
  return isTable(next) ? next : {}
}

/** Rename a key of the table at `path`, keeping its position. */
export function renameKey(draft: Draft, path: DraftPath, from: string, to: string): Draft {
  const table = getAt(draft, path)
  if (!isTable(table) || from === to || !(from in table)) return draft
  const renamed = Object.fromEntries(Object.entries(table).map(([key, value]) => [key === from ? to : key, value]))
  return setAt(draft, path, renamed)
}

export interface Validation {
  valid: boolean
  /** Problems by dot path; the empty path is the whole config. */
  issues: ConfigIssue[]
}

export function validateDraft(draft: Draft): Validation {
  const result = parseZcfConfig(draft)
  return result.success ? { valid: true, issues: [] } : { valid: false, issues: result.issues }
}

/** The issues for one field: those at its path or inside it. */
export function issuesAt(issues: readonly ConfigIssue[], path: DraftPath): ConfigIssue[] {
  const dot = path.join('.')
  return issues.filter(issue => issue.path === dot || issue.path.startsWith(`${dot}.`))
}

/** The text inside double quotes: JSON escapes as `formatArgs` writes them, else `\x` for `x`. */
function unquote(inner: string): string {
  try {
    const value: unknown = JSON.parse(`"${inner}"`)
    if (typeof value === 'string') return value
  } catch {
    // Not a JSON string, such as `\q` typed by hand.
  }
  return inner.replace(/\\(.)/g, '$1')
}

/**
 * Split command-line arguments typed on one line, as a shell does: double or single
 * quotes keep spaces, also in part of an argument such as `--header="A: b"`.
 */
export function parseArgs(text: string): string[] {
  const args: string[] = []
  // An unquoted run, a double-quoted run with escapes, or a single-quoted run.
  const pattern = /(\s+)|"((?:[^"\\]|\\.)*)"?|'([^']*)'?|([^\s"']+)/g
  let current: string | undefined
  for (const [, space, double, single, bare] of text.matchAll(pattern)) {
    if (space !== undefined) {
      if (current !== undefined) args.push(current)
      current = undefined
    } else {
      current = (current ?? '') + (double !== undefined ? unquote(double) : (single ?? bare ?? ''))
    }
  }
  if (current !== undefined) args.push(current)
  return args
}

export function formatArgs(args: readonly string[]): string {
  return args.map(arg => (arg === '' || /[\s"'\\]/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')
}
