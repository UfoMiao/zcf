import type { ParseError } from 'jsonc-parser'
import { applyEdits, findNodeAtLocation, modify, parse, parseTree } from 'jsonc-parser'

import type { FileFormat, KeyEdit } from '../plan/types'

/** A native config file ZCF cannot parse. Front ends translate it from `format`, `line` and `column`. */
export class FileSyntaxError extends Error {
  override name = 'FileSyntaxError'

  constructor(
    readonly format: FileFormat,
    readonly line: number,
    readonly column: number,
    readonly path?: string,
  ) {
    super(`${path ?? 'The file'} is not valid ${format.toUpperCase()} (line ${line}, column ${column})`)
  }
}

function lineAndColumn(text: string, offset: number): [line: number, column: number] {
  const lines = text.slice(0, offset).split('\n')
  return [lines.length, lines.at(-1)!.length + 1]
}

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
  if (errors.length > 0) throw new FileSyntaxError('json', ...lineAndColumn(text, errors[0]!.offset))

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
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function setAtPath(root: Table, path: KeyEdit['path'], value: unknown): void {
  const unsafe = path.find(key => UNSAFE_KEYS.has(String(key)))
  if (unsafe !== undefined) throw new Error(`Unsafe key in path: ${unsafe}`)
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
  let data: unknown
  try {
    data = toml.parse(text)
  } catch (error) {
    // toml-patch reports a 1-based line and a 0-based column.
    const { line, column } = (error ?? {}) as { line?: unknown; column?: unknown }
    if (typeof line === 'number' && typeof column === 'number') throw new FileSyntaxError('toml', line, column + 1)
    throw error
  }
  if (!isTable(data)) throw new Error('Not a TOML table')

  for (const edit of edits) setAtPath(data, edit.path, edit.value)

  return withTrailingNewline(toml.patch(text, data))
}

const ENV_LINE = /^(\s*(?:export\s+)?)([A-Za-z_][\w.-]*)\s*=\s*(.*)$/

function unquoteEnv(raw: string): string {
  const value = raw.trim()
  const quote = value[0]
  const end = quote === '"' || quote === "'" ? value.indexOf(quote, 1) : -1
  if (end > 0) {
    const inner = value.slice(1, end)
    return quote === '"' ? inner.replaceAll('\\n', '\n') : inner
  }
  // An unquoted value ends at an inline comment.
  return value.replace(/\s+#.*$/, '')
}

function quoteEnv(value: string): string {
  if (/^[\w@%+=:,./-]*$/.test(value)) return value
  if (!value.includes("'") && !value.includes('\n')) return `'${value}'`
  return `"${value.replaceAll('\n', '\\n')}"`
}

/** Read a dotenv file into variables; a later line wins, as in dotenv. */
export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const match = ENV_LINE.exec(line)
    if (match) result[match[2]!] = unquoteEnv(match[3]!)
  }
  return result
}

/**
 * Edit a dotenv file variable by variable. Comments, blank lines and other
 * variables stay as they are; new variables are added at the end.
 */
export function editDotenv(content: string | undefined, edits: readonly KeyEdit[]): string {
  const eol = content?.includes('\r\n') ? '\r\n' : '\n'
  const lines = content ? content.split(/\r?\n/) : []
  if (lines.at(-1) === '') lines.pop()

  for (const edit of edits) {
    if (edit.path.length !== 1) throw new Error(`A dotenv key path has one element: ${edit.path.join('.')}`)
    const key = String(edit.path[0])
    const matches = lines.flatMap((line, index) => (ENV_LINE.exec(line)?.[2] === key ? [index] : []))
    if (edit.value === undefined) {
      for (const index of matches.toReversed()) lines.splice(index, 1)
      continue
    }
    const raw = edit.value
    if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') {
      throw new Error(`A dotenv value must be a string, number or boolean: ${key}`)
    }
    const value = quoteEnv(String(raw))
    const last = matches.at(-1)
    if (last === undefined) lines.push(`${key}=${value}`)
    else lines[last] = `${ENV_LINE.exec(lines[last]!)![1]}${key}=${value}`
  }

  return lines.length === 0 ? '' : `${lines.join(eol)}${eol}`
}

/** Parse a native config file; `undefined` when it is missing or not valid. */
export async function parseConfigText(format: FileFormat, text: string | undefined): Promise<unknown> {
  if (!text?.trim()) return undefined
  try {
    if (format === 'json') return parse(text, [], { allowTrailingComma: true })
    if (format === 'env') return parseDotenv(text)
    tomlModule ??= import('@decimalturn/toml-patch')
    return (await tomlModule).parse(text)
  } catch {
    return undefined
  }
}

export async function applyKeyEdits(
  format: FileFormat,
  content: string | undefined,
  edits: readonly KeyEdit[],
): Promise<string> {
  if (format === 'json') return editJson(content, edits)
  if (format === 'env') return editDotenv(content, edits)
  return editToml(content, edits)
}
