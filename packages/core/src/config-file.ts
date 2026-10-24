import type { ParseError } from 'jsonc-parser'
import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { editJson, isTable } from './io/editors'
import { readTextIfExists, writeFileAtomic } from './io/fs'
import type { KeyEdit, KeyPath } from './plan/types'
import type { ConfigIssue, ParseConfigResult } from './schema/config'
import { parseZcfConfig } from './schema/config'

export function defaultConfigPath(home: string): string {
  return join(home, '.ufomiao', 'zcf', 'zcf.json')
}

function syntaxIssue(text: string, offset: number): ConfigIssue {
  const lines = text.slice(0, offset).split('\n')
  return {
    path: '',
    message: { key: 'configIssue.syntax', params: { line: lines.length, column: lines.at(-1)!.length + 1 } },
  }
}

export type LoadConfigResult = ParseConfigResult | { success: false; missing: true; issues: [] }

/** Read and validate a ZCF config file. Comments and trailing commas are allowed. */
export async function loadConfigFile(path: string): Promise<LoadConfigResult> {
  const text = await readTextIfExists(path)
  if (text === undefined) return { success: false, missing: true, issues: [] }

  const errors: ParseError[] = []
  const data = parse(text, errors, { allowTrailingComma: true })
  // Later syntax errors are usually knock-on effects of the first one.
  const [first] = errors
  if (first) return { success: false, issues: [syntaxIssue(text, first.offset)] }
  return parseZcfConfig(data)
}

/** What a front end edits: the config as written, before validation and defaults. */
export type ConfigDraft = Record<string, unknown>

export type LoadDraftResult = { draft: ConfigDraft; exists: boolean } | { draft?: undefined; issues: ConfigIssue[] }

/** Read a config for editing. A missing file gives an empty version 1 config; a broken one gives its syntax error. */
export async function loadConfigDraft(path: string): Promise<LoadDraftResult> {
  const text = await readTextIfExists(path)
  if (text === undefined || !text.trim()) return { draft: { version: 1 }, exists: text !== undefined }
  const errors: ParseError[] = []
  const data: unknown = parse(text, errors, { allowTrailingComma: true })
  const [first] = errors
  if (first) return { issues: [syntaxIssue(text, first.offset)] }
  if (!isTable(data))
    return { issues: [{ path: '', message: { key: 'configIssue.expected', params: { expected: 'object' } } }] }
  return { draft: data, exists: true }
}

/** The smallest set of key edits that turns `before` into `after`. Arrays are replaced as a whole. */
export function jsonEditsBetween(before: unknown, after: unknown, path: KeyPath = []): KeyEdit[] {
  if (isTable(before) && isTable(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    return [...keys].flatMap(key => jsonEditsBetween(before[key], after[key], [...path, key]))
  }
  if (JSON.stringify(before) === JSON.stringify(after)) return []
  return [{ path, value: after }]
}

/**
 * Save an edited config. Only the keys that changed are rewritten, so comments and
 * layout elsewhere in the file survive. The caller validates the draft first.
 *
 * `base` is the draft as it was loaded. When given, only what the user changed since
 * then is written, so changes made to the file in the meantime by hand are kept.
 */
export async function saveConfigDraft(path: string, draft: ConfigDraft, base?: ConfigDraft): Promise<void> {
  const text = await readTextIfExists(path)
  const current: unknown = text?.trim() ? parse(text, [], { allowTrailingComma: true }) : undefined
  const before = isTable(current) ? (base ?? current) : {}
  const edits = jsonEditsBetween(before, draft).filter(edit => edit.path.length > 0)
  await writeFileAtomic(path, editJson(text, edits))
}
