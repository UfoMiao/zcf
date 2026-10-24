import type { FormattingOptions, ParseError } from 'jsonc-parser'
import {
  applyEdits,
  findNodeAtLocation,
  format as formatJson,
  getNodeValue,
  modify,
  parse,
  parseTree,
} from 'jsonc-parser'

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

/** The file's own indentation: tabs, or the width of its first indented line (2 when nothing is indented). */
function detectIndent(content: string): FormattingOptions {
  const match = /^([ \t]+)\S/m.exec(content)
  if (match?.[1]!.startsWith('\t')) return { insertSpaces: false, tabSize: 4, eol: '\n' }
  return { insertSpaces: true, tabSize: match ? match[1]!.length : 2, eol: '\n' }
}

function withTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

/** Whether two JSON values are equal, whatever the order of their keys. */
function sameJson(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameJson(item, b[i]))
  }
  if (isTable(a) && isTable(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every(key => key in b && sameJson(a[key], b[key]))
  }
  return a === b
}

/**
 * Apply one edit, formatting only the text it writes. jsonc-parser's own formatting widens to
 * whole lines, so adding a key after `"tools": ["a", "b"]` would also spread that array over lines.
 * An object or array written on one line is expanded as a whole instead, so it is not left half
 * on one line and half on the next.
 */
function modifyJson(text: string, edit: KeyEdit, formattingOptions: FormattingOptions | undefined): string {
  const edits = modify(text, [...edit.path], edit.value, {})
  let next = applyEdits(text, edits)
  if (!formattingOptions) return next

  const parentPath = edit.path.slice(0, -1)
  const parent = findNodeAtLocation(parseTree(text)!, [...parentPath])
  if (parent && !text.slice(parent.offset, parent.offset + parent.length).includes('\n')) {
    const grown = findNodeAtLocation(parseTree(next)!, [...parentPath])
    if (grown) {
      const end = grown.offset + grown.length
      const own = formatJson(next, { offset: grown.offset, length: grown.length }, formattingOptions).filter(
        change => change.offset >= grown.offset && change.offset + change.length <= end,
      )
      return applyEdits(next, own)
    }
  }

  for (const { offset, content } of edits) {
    if (!content) continue
    // The written text plus the whitespace around it, which sets its line breaks and indentation.
    let start = offset
    while (start > 0 && /\s/.test(next[start - 1]!)) start--
    let end = offset + content.length
    while (end < next.length && /\s/.test(next[end]!)) end++
    const range = { offset: Math.max(0, start - 1), length: Math.min(next.length, end + 1) - Math.max(0, start - 1) }
    const own = formatJson(next, range, formattingOptions).filter(
      change => change.offset >= start && change.offset + change.length <= end,
    )
    next = applyEdits(next, own)
  }
  return next
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

  // A file written on one line stays on one line; otherwise new parts follow the file's indentation.
  const compact = !text.trim().includes('\n') && text.trim() !== '{}'
  const formattingOptions = compact ? undefined : detectIndent(text)

  for (const edit of edits) {
    const node = findNodeAtLocation(parseTree(text)!, [...edit.path])
    // jsonc-parser throws when removing a key whose parent is missing; there is nothing to remove.
    if (edit.value === undefined && !node) continue
    // Setting a value it already has would still reformat it, so a second apply would change the file again.
    if (node && edit.value !== undefined && sameJson(getNodeValue(node), edit.value)) continue
    text = modifyJson(text, edit, formattingOptions)
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

  // New tables become `[a.b]` sections, as tools document them; deeper ones stay inline.
  const patched = toml.patch(text, data, { inlineTableStart: 2 })
  // toml-patch also writes an empty `[a]` above a new `[a.b]`; drop it unless the user wrote it.
  const tidy = patched.replaceAll(/^\[([^\]\r\n]+)\]\r?\n\r?\n(?=\[\1\.)/gm, (header: string, name: string) =>
    text.includes(`[${name}]`) ? header : '',
  )
  return withTrailingNewline(tidy)
}

const ENV_LINE = /^(\s*(?:export\s+)?)([A-Za-z_][\w.-]*)(\s*=)(.*)$/
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
  if (quote !== '"' && quote !== "'" && quote !== '`') return undefined
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
    const [, prefix = '', key = '', equals = '', after = ''] = match
    const lead = /^\s*/.exec(after)![0]
    const separator = equals + lead
    const rest = after.slice(lead.length)
    const quoted = quotedValue(lines, first, rest)
    if (quoted) {
      entries.push({ key, prefix, separator, first, ...quoted })
      first = quoted.last
      continue
    }
    // An unquoted value ends at the first `#`, as in dotenv; a comment right after `=` means an empty value.
    const [, value = '', suffix = ''] = /^(.*?)(\s*#.*|\s*)$/.exec(rest)!
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
      const suffix = keep?.suffix.startsWith('#') ? ` ${keep.suffix}` : keep?.suffix
      line = keep ? `${keep.prefix}${key}${keep.separator}${value}${suffix}` : `${key}=${value}`
    }
    if (keep && line !== undefined) lines.splice(keep.first, keep.last - keep.first + 1, line)
    else if (line !== undefined) lines.push(line)
    for (const entry of matches.toReversed()) lines.splice(entry.first, entry.last - entry.first + 1)
  }

  return lines.length === 0 ? '' : `${lines.join(eol)}${eol}`
}

type YamlModule = typeof import('yaml')
let yamlModule: Promise<YamlModule> | undefined

/**
 * A `!!js` expression in a YAML file, which Cordis-based tools such as DeepSeek Harness evaluate
 * when they load it. Read back from a file it is a plain string, its source; `toJSON` returns
 * the same so a planned value compares equal to the one on disk.
 */
export class JsExpression {
  constructor(readonly source: string) {}

  toJSON(): string {
    return this.source
  }
}

/**
 * A string written double-quoted in YAML. Front ends mask a credential shorter than four
 * characters only as a whole quoted string, as JSON writes it, so such values use this.
 */
export class QuotedString {
  constructor(readonly value: string) {}

  toJSON(): string {
    return this.value
  }
}

const JS_TAG = 'tag:yaml.org,2002:js'
const BOM = '\uFEFF'

async function parseYaml(text: string) {
  // Only plans that touch YAML files pay for loading the YAML parser.
  yamlModule ??= import('yaml')
  const yaml = await yamlModule
  const doc = yaml.parseDocument(text.startsWith(BOM) ? text.slice(1) : text)
  const error = doc.errors[0]
  if (error) {
    const position = error.linePos?.[0]
    throw new FileSyntaxError('yaml', position?.line ?? 1, position?.col ?? 1)
  }
  return { yaml, doc }
}

type YamlDocument = Awaited<ReturnType<typeof parseYaml>>['doc']

function yamlNode(doc: YamlDocument, value: unknown): unknown {
  if (value instanceof JsExpression) {
    const node = doc.createNode(value.source)
    node.tag = JS_TAG
    return node
  }
  if (value instanceof QuotedString) {
    const node = doc.createNode(value.value)
    node.type = 'QUOTE_DOUBLE'
    return node
  }
  if (Array.isArray(value)) return doc.createNode(value.map(item => yamlNode(doc, item)))
  if (isTable(value))
    return doc.createNode(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, yamlNode(doc, item)])))
  if (!looksBinary(value)) return doc.createNode(value)
  const node = doc.createNode(value)
  node.type = 'QUOTE_DOUBLE'
  return node
}

/** YAML 1.1 readers such as js-yaml, which dsh uses, read a plain `0b11` as a number. */
function looksBinary(value: unknown): value is string {
  return typeof value === 'string' && /^[-+]?0b[01_]+$/.test(value)
}

/**
 * The block layout of a YAML file: how far a nested mapping is indented past its key, and whether
 * a sequence under a key is indented past it (`key:\n  - item`) or not (`key:\n- item`).
 */
function detectYamlLayout(content: string): { indent: number; indentSeq: boolean } {
  let indent: number | undefined
  let indentSeq: boolean | undefined
  const lines = content.split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    // A key that opens a block, counting any `- ` before it as indentation.
    const key = /^((?: *- )* *)[^\s#-][^#]*:\s*$/.exec(line)
    const next = key && /^( *)(- )?\S/.exec(lines[index + 1] ?? '')
    if (!key || !next) continue
    const step = next[1]!.length - key[1]!.length
    // A sequence item less indented than the key starts the next entry; it says nothing.
    if (next[2]) {
      if (step >= 0) indentSeq ??= step > 0
    } else if (step > 0) indent ??= step
    if (indent !== undefined && indentSeq !== undefined) break
  }
  return { indent: indent ?? 2, indentSeq: indentSeq ?? true }
}

/**
 * Edit YAML key by key while keeping comments, custom tags such as `!!js`, the indentation, line
 * endings and a byte order mark. Edits that change nothing are skipped, so a file that already
 * has every value comes back byte for byte. A number in a key path indexes a sequence; the index
 * one past the end appends.
 */
export async function editYaml(content: string | undefined, edits: readonly KeyEdit[]): Promise<string> {
  const original = content ?? ''
  const { yaml, doc } = await parseYaml(original)
  // An empty flow collection (`[]` or `{}`) would otherwise keep every added entry on one line.
  if (yaml.isCollection(doc.contents) && doc.contents.items.length === 0) doc.contents.flow = false

  let changed = false
  for (const edit of edits) {
    const unsafe = edit.path.find(key => UNSAFE_KEYS.has(String(key)))
    if (unsafe !== undefined) throw new Error(`Unsafe key in path: ${unsafe}`)
    if (edit.value === undefined) {
      if (!doc.hasIn(edit.path)) continue
      doc.deleteIn(edit.path)
      changed = true
      continue
    }
    const current = doc.getIn(edit.path, true)
    const existing = yaml.isNode(current) ? current.toJS(doc) : current
    if (current !== undefined && JSON.stringify(existing) === JSON.stringify(edit.value)) continue
    changed = true
    // Changing a plain scalar in place keeps the comment on its line.
    const plain = edit.value === null || ['string', 'number', 'boolean'].includes(typeof edit.value)
    if (yaml.isScalar(current) && plain && current.tag === undefined && !looksBinary(edit.value))
      current.value = edit.value
    else doc.setIn(edit.path, yamlNode(doc, edit.value))
  }

  // A file with nothing but comments, and no edits that add content, stays as it was.
  if (!changed || doc.contents === null) return original
  const text = doc.toString({ lineWidth: 0, ...detectYamlLayout(original) })
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const output = withTrailingNewline(text).replaceAll('\n', eol)
  return original.startsWith(BOM) ? `${BOM}${output}` : output
}

/** Parse a native config file; `undefined` when it is missing or not valid. */
export async function parseConfigText(format: FileFormat, text: string | undefined): Promise<unknown> {
  if (!text?.trim()) return undefined
  try {
    if (format === 'json') return parse(text, [], { allowTrailingComma: true })
    if (format === 'env') return parseDotenv(text)
    if (format === 'yaml') return (await parseYaml(text)).doc.toJS()
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
  if (format === 'yaml') return editYaml(content, edits)
  return editToml(content, edits)
}
