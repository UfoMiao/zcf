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

const ENV_LINE = /^(\s*(?:export\s+)?)([A-Za-z_][\w.-]*)(\s*=\s*)(.*)$/
const ENV_NAME = /^[A-Za-z_][\w.-]*$/
// What may follow a closing quote: spacing and an optional comment.
const ENV_REST = /^\s*(?:#.*)?$/

/** One assignment in a dotenv file. A quoted value can span lines `first` to `last`. */
export interface DotenvEntry {
  key: string
  /** The value as dotenv readers see it. */
  value: string
  /** The value's text as written between its quotes, or bare. */
  raw: string
  first: number
  last: number
  prefix: string
  separator: string
  /** Spacing and an inline comment after the value. */
  suffix: string
}

/** Where `quote` closes in `text` after `from`, skipping backslash escapes inside double quotes. */
function closingQuote(text: string, quote: string, from: number): number {
  for (let index = from; index < text.length; index++) {
    if (quote === '"' && text[index] === '\\') index++
    else if (text[index] === quote) return index
  }
  return -1
}

function decodeDouble(inner: string): string {
  return inner.replaceAll(/\\([\\"nr])/g, (_, char: string) => (char === 'n' ? '\n' : char === 'r' ? '\r' : char))
}

/** A quoted value that starts on `lines[first]`, possibly continuing on the next lines. */
function quotedValue(
  lines: readonly string[],
  first: number,
  rest: string,
): { value: string; raw: string; last: number; suffix: string } | undefined {
  const quote = rest[0]
  if (quote !== '"' && quote !== "'") return undefined
  let text = rest
  for (let last = first; last < lines.length; last++) {
    if (last > first) text += `\n${lines[last]}`
    const end = closingQuote(text, quote, 1)
    if (end < 0) continue
    // Text after the closing quote other than a comment means the value was not quoted after all.
    const suffix = text.slice(end + 1)
    if (!ENV_REST.test(suffix)) return undefined
    const raw = text.slice(1, end)
    return { value: quote === '"' ? decodeDouble(raw) : raw, raw, last, suffix }
  }
  return undefined
}

/** Every assignment in a dotenv file, in order and including duplicates. */
export function dotenvEntries(content: string): DotenvEntry[] {
  const lines = content.split(/\r?\n/)
  const entries: DotenvEntry[] = []
  for (let first = 0; first < lines.length; first++) {
    const match = ENV_LINE.exec(lines[first]!)
    if (!match) continue
    const [, prefix = '', key = '', separator = '', rest = ''] = match
    const quoted = quotedValue(lines, first, rest)
    if (quoted) {
      entries.push({ key, prefix, separator, first, ...quoted })
      first = quoted.last
      continue
    }
    // An unquoted value ends at an inline comment.
    const [, value = '', suffix = ''] = /^(.*?)(\s+#.*|\s*)$/.exec(rest)!
    entries.push({ key, value, raw: value, first, last: first, prefix, separator, suffix })
  }
  return entries
}

/** Quote a value so that dotenv readers, which do not unescape `\"` or `\\`, read it back unchanged. */
function quoteEnv(key: string, value: string): string {
  if (/^[\w@%+=:,./-]*$/.test(value)) return value
  if (!/['\r\n]/.test(value)) return `'${value}'`
  if (!/["\\]/.test(value)) return `"${value.replaceAll('\n', '\\n').replaceAll('\r', '\\r')}"`
  throw new Error(`This value cannot be written to a dotenv file: ${key}`)
}

/** Read a dotenv file into variables; a later line wins, as in dotenv. */
export function parseDotenv(content: string): Record<string, string> {
  return Object.fromEntries(dotenvEntries(content).map(entry => [entry.key, entry.value]))
}

/**
 * Edit a dotenv file variable by variable. Comments, blank lines and other
 * variables stay as they are; new variables are added at the end. Setting a
 * variable keeps its last line and drops earlier duplicates.
 */
export function editDotenv(content: string | undefined, edits: readonly KeyEdit[]): string {
  const eol = content?.includes('\r\n') ? '\r\n' : '\n'
  const lines = content ? content.split(/\r?\n/) : []
  if (lines.at(-1) === '') lines.pop()

  for (const edit of edits) {
    if (edit.path.length !== 1) throw new Error(`A dotenv key path has one element: ${edit.path.join('.')}`)
    const [key] = edit.path
    if (typeof key !== 'string' || !ENV_NAME.test(key)) {
      throw new Error(`Not a dotenv variable name: ${JSON.stringify(key)}`)
    }
    const matches = dotenvEntries(lines.join('\n')).filter(entry => entry.key === key)
    const keep = edit.value === undefined ? undefined : matches.pop()
    let line: string | undefined
    if (edit.value !== undefined) {
      const raw = edit.value
      if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') {
        throw new Error(`A dotenv value must be a string, number or boolean: ${key}`)
      }
      const value = quoteEnv(key, String(raw))
      line = keep ? `${keep.prefix}${key}${keep.separator}${value}${keep.suffix}` : `${key}=${value}`
    }
    if (keep && line !== undefined) lines.splice(keep.first, keep.last - keep.first + 1, line)
    else if (line !== undefined) lines.push(line)
    for (const entry of matches.toReversed()) lines.splice(entry.first, entry.last - entry.first + 1)
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
