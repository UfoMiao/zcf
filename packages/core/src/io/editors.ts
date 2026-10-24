import type { ParseError } from 'jsonc-parser'
import { applyEdits, findNodeAtLocation, modify, parseTree, printParseErrorCode } from 'jsonc-parser'

import type { FileFormat, KeyEdit } from '../plan/types'

function detectIndent(content: string): number {
  const match = /^( +)\S/m.exec(content)
  return match ? match[1]!.length : 2
}

function withTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

/**
 * Edit JSON (or JSONC) key by key. Comments, key order and indentation of the
 * untouched parts stay exactly as they were.
 */
export function editJson(content: string | undefined, edits: readonly KeyEdit[]): string {
  let text = content?.trim() ? content : '{}\n'
  const errors: ParseError[] = []
  parseTree(text, errors, { allowTrailingComma: true })
  if (errors.length > 0)
    throw new Error(`Not valid JSON: ${printParseErrorCode(errors[0]!.error)} at offset ${errors[0]!.offset}`)

  const formattingOptions = {
    insertSpaces: true,
    tabSize: detectIndent(text),
    eol: '\n',
  }

  for (const edit of edits) {
    // jsonc-parser throws when removing a key whose parent is missing; there is nothing to remove.
    if (edit.value === undefined && !findNodeAtLocation(parseTree(text)!, [...edit.path])) continue
    text = applyEdits(text, modify(text, [...edit.path], edit.value, { formattingOptions }))
  }

  return withTrailingNewline(text)
}

type TomlModule = typeof import('@decimalturn/toml-patch')
let tomlModule: Promise<TomlModule> | undefined

type Table = Record<string, unknown>

export function isTable(value: unknown): value is Table {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

/** Set or remove (`value: undefined`) a key in a plain object tree, creating tables on the way. */
export function setAtPath(root: Table, path: KeyEdit['path'], value: unknown): void {
  let table = root
  for (const key of path.slice(0, -1)) {
    const existing = table[key]
    if (isTable(existing)) {
      table = existing
      continue
    }
    if (value === undefined) return
    const created: Table = {}
    table[key] = created
    table = created
  }
  const last = path.at(-1)!
  if (value === undefined) delete table[last]
  else table[last] = value
}

/**
 * Edit TOML key by key while keeping comments and layout. The edits are applied
 * to the parsed data and toml-patch writes back only what changed.
 */
export async function editToml(content: string | undefined, edits: readonly KeyEdit[]): Promise<string> {
  // Only plans that touch TOML files pay for loading the TOML parser.
  tomlModule ??= import('@decimalturn/toml-patch')
  const toml = await tomlModule
  const text = content ?? ''
  const data: unknown = toml.parse(text)
  if (!isTable(data)) throw new Error('Not a TOML table')

  for (const edit of edits) setAtPath(data, edit.path, edit.value)

  return withTrailingNewline(toml.patch(text, data))
}

export async function applyKeyEdits(
  format: FileFormat,
  content: string | undefined,
  edits: readonly KeyEdit[],
): Promise<string> {
  return format === 'json' ? editJson(content, edits) : editToml(content, edits)
}
