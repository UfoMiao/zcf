import type { WorkflowPreset } from '@zcf/core'
import type { ConfigIssue, ToolId } from '@zcf/core/schema'
import { BUILTIN_SKILLS_SOURCE, CONFIG_LANGUAGES, MIRRORS, TOOL_IDS } from '@zcf/core/schema'

import type { DraftPath } from './draft'
import { isTable, issuesAt } from './draft'

export type PageId =
  | 'tools'
  | 'provider'
  | 'mcp'
  | 'skills'
  | 'settings'
  | 'apply'
  | 'workflows'
  | 'agents'
  | 'extras'
  | 'backup'

/** One grouped chunk of the nav column, the way v3 grouped its menu. */
export interface NavSection {
  id: string
  /** Message key of the header shown above the section's pages. */
  labelKey: string
  pages: readonly PageId[]
}

/** The nav column's sections, the way v3 grouped its menu. The terminal UI renders this. */
export const NAV: readonly NavSection[] = [
  { id: 'init', labelKey: 'nav.init', pages: ['tools', 'provider', 'mcp', 'skills', 'settings', 'apply'] },
  { id: 'workflow', labelKey: 'nav.workflow', pages: ['workflows', 'agents'] },
  { id: 'extras', labelKey: 'nav.extras', pages: ['extras'] },
  { id: 'backup', labelKey: 'nav.backup', pages: ['backup'] },
]

/** Every page in nav order, flattened from the sections. */
export const PAGES: readonly PageId[] = NAV.flatMap(section => section.pages)

/** The digit a page is reached by: 1 through 9, then 0 for the tenth. */
const DIGITS = '1234567890'

/** The row a digit key names within whatever list digit keys walk. */
export function digitIndex(digit: string): number {
  return digit === '0' ? 9 : Number(digit) - 1
}

/** Whether an input is one of the digit keys that name a row. */
export function isDigitKey(input: string): boolean {
  return /^[0-9]$/.test(input)
}

export type NavRow =
  | { kind: 'header'; id: string; labelKey: string }
  | { kind: 'page'; id: PageId; digit: string | undefined }

/**
 * NAV flattened into the rows a nav column renders: each section's header, then its
 * pages with the digit that jumps to them. Pages past the tenth have no digit to press.
 */
export function navRows(sections: readonly NavSection[] = NAV): readonly NavRow[] {
  const rows: NavRow[] = []
  let index = 0
  for (const section of sections) {
    rows.push({ kind: 'header', id: section.id, labelKey: section.labelKey })
    for (const id of section.pages) {
      rows.push({ kind: 'page', id, digit: DIGITS[index] })
      index++
    }
  }
  return rows
}

/**
 * The config keys each editing page works on, so a page can be flagged when it has
 * problems. Each entry is a key of its own: a problem at or under any of them flags
 * the page.
 */
export const PAGE_ROOTS: Readonly<Record<PageId, readonly string[] | undefined>> = {
  tools: ['tools'],
  provider: ['provider', 'profiles'],
  mcp: ['mcpServers'],
  skills: ['skills'],
  settings: ['mirror', 'configLanguage'],
  apply: undefined,
  // The Workflows page hosts the output styles beside its presets and bundles.
  workflows: ['workflows', 'styles'],
  agents: ['agents'],
  extras: ['extras'],
  backup: undefined,
}

/** Whether any of a page's root keys has a problem at or under it. */
export function pageHasIssues(issues: readonly ConfigIssue[], roots: readonly string[] | undefined): boolean {
  return roots !== undefined && roots.some(root => issuesAt(issues, [root]).length > 0)
}

/** A draft list of ids as strings, treating anything else as no ids. */
export function draftIds(list: unknown): string[] {
  return Array.isArray(list) ? list.map(String) : []
}

/**
 * Toggle one id in a plain list of ids, such as `agents` or `outputStyles`. `undefined`
 * when nothing is left, so the empty key is removed rather than left behind.
 */
export function toggleId(list: unknown, id: string): string[] | undefined {
  const current = draftIds(list)
  const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
  return next.length > 0 ? next : undefined
}

/**
 * How a field is edited. `secret` is text shown masked; `list` is a list of strings;
 * `record` is a string-to-string map such as environment variables.
 */
export type FieldKind = 'text' | 'secret' | 'select' | 'args' | 'list' | 'record'

export interface Field {
  /** Message key of the label, also the field's id. */
  label: string
  /** Where the value lives, relative to the page's or the item's root. */
  path: DraftPath
  kind: FieldKind
  options?: readonly string[]
  /** Message key prefix for the options' labels: option `x` is shown as `<prefix>.x`. Without it the option itself is shown. */
  optionLabel?: string
  /** Message key of a short hint shown under the field. */
  hint?: string
  required?: boolean
}

/** The value to store for text typed into a field: an empty optional field is removed instead. */
export function fieldValue(field: Field, text: string): string | undefined {
  return text === '' && !field.required ? undefined : text
}

/**
 * The option a select shows: the stored value, or the first option when the field is unset —
 * which every select's schema treats as its default, so no placeholder is needed beside it.
 * A value that is not an option stays as it is, so choosing any option changes it.
 */
export function selectValue(field: Field, value: unknown): string {
  return typeof value === 'string' && value !== '' ? value : (field.options?.[0] ?? '')
}

export const TOOL_OPTIONS: readonly ToolId[] = TOOL_IDS

export const PROVIDER_FIELDS: readonly Field[] = [
  { label: 'field.provider.name', path: ['provider', 'name'], kind: 'text', required: true },
  { label: 'field.provider.apiKey', path: ['provider', 'apiKey'], kind: 'secret', required: true },
  {
    label: 'field.provider.anthropicBaseUrl',
    path: ['provider', 'anthropic', 'baseUrl'],
    kind: 'text',
    hint: 'hint.provider.anthropicBaseUrl',
  },
  {
    label: 'field.provider.anthropicAuthType',
    path: ['provider', 'anthropic', 'authType'],
    kind: 'select',
    options: ['auth_token', 'api_key'],
  },
  {
    label: 'field.provider.openaiBaseUrl',
    path: ['provider', 'openai', 'baseUrl'],
    kind: 'text',
    hint: 'hint.provider.openaiBaseUrl',
  },
  { label: 'field.provider.openaiModel', path: ['provider', 'openai', 'model'], kind: 'text' },
  {
    label: 'field.provider.geminiBaseUrl',
    path: ['provider', 'gemini', 'baseUrl'],
    kind: 'text',
    hint: 'hint.provider.geminiBaseUrl',
  },
  { label: 'field.provider.geminiModel', path: ['provider', 'gemini', 'model'], kind: 'text' },
  { label: 'field.provider.modelDefault', path: ['provider', 'models', 'default'], kind: 'text' },
  { label: 'field.provider.modelHaiku', path: ['provider', 'models', 'haiku'], kind: 'text' },
  { label: 'field.provider.modelSonnet', path: ['provider', 'models', 'sonnet'], kind: 'text' },
  { label: 'field.provider.modelOpus', path: ['provider', 'models', 'opus'], kind: 'text' },
]

export type McpType = 'stdio' | 'http'

/** The fields of one MCP server, relative to `mcpServers.<name>`. They depend on its type. */
export function mcpFields(type: McpType): readonly Field[] {
  const typeField: Field = { label: 'field.mcp.type', path: ['type'], kind: 'select', options: ['stdio', 'http'] }
  if (type === 'http') {
    return [
      typeField,
      { label: 'field.mcp.url', path: ['url'], kind: 'text', required: true },
      { label: 'field.mcp.headers', path: ['headers'], kind: 'record' },
    ]
  }
  return [
    typeField,
    { label: 'field.mcp.command', path: ['command'], kind: 'text', required: true },
    { label: 'field.mcp.args', path: ['args'], kind: 'args' },
    { label: 'field.mcp.env', path: ['env'], kind: 'record' },
  ]
}

/**
 * ZCF's own settings, such as where it downloads from. The interface `language` is not
 * here: both editors switch it from their header, and it saves at once.
 */
export const SETTINGS_FIELDS: readonly Field[] = [
  {
    label: 'field.mirror',
    path: ['mirror'],
    kind: 'select',
    options: MIRRORS,
    optionLabel: 'mirror',
    hint: 'hint.mirror',
  },
  {
    label: 'field.configLanguage',
    path: ['configLanguage'],
    kind: 'select',
    options: CONFIG_LANGUAGES,
    optionLabel: 'language',
    hint: 'hint.configLanguage',
  },
]

/** The fields of one skill source, relative to `skills.<index>`. */
export const SKILL_FIELDS: readonly Field[] = [
  { label: 'field.skill.source', path: ['source'], kind: 'text', required: true, hint: 'hint.skill.source' },
  { label: 'field.skill.skills', path: ['skills'], kind: 'list', hint: 'hint.skill.skills' },
]

/** The ids of the built-in skills the draft already picks, from its `zcf` source. */
export function pickedCatalogSkills(sources: unknown): string[] {
  const list = Array.isArray(sources) ? sources : []
  const builtin = list.find(item => isTable(item) && item.source === BUILTIN_SKILLS_SOURCE)
  return isTable(builtin) && Array.isArray(builtin.skills) ? builtin.skills.map(String) : []
}

/**
 * Toggle one catalog skill in the draft's `skills` list: the built-in skills share a single
 * `zcf` source whose `skills` entry grows and shrinks. `undefined` when nothing is picked
 * anymore, so the empty key is removed rather than left behind.
 */
export function toggleCatalogSkill(sources: unknown, id: string): unknown[] | undefined {
  const list = Array.isArray(sources) ? [...sources] : []
  const entry = list.find(item => isTable(item) && item.source === BUILTIN_SKILLS_SOURCE)
  if (!entry) return [...list, { source: BUILTIN_SKILLS_SOURCE, skills: [id] }]
  const picked: string[] = Array.isArray(entry.skills) ? entry.skills.map(String) : []
  const next = picked.includes(id) ? picked.filter(name => name !== id) : [...picked, id]
  if (next.length === 0) {
    const rest = list.filter(item => item !== entry)
    return rest.length > 0 ? rest : undefined
  }
  const at = list.indexOf(entry)
  list[at] = { ...entry, skills: next }
  return list
}

/** The draft's entry for `source`, if the `skills` list has one for it. */
function findSkillSource(sources: unknown, source: string): Record<string, unknown> | undefined {
  return (Array.isArray(sources) ? sources : []).find(
    (item): item is Record<string, unknown> => isTable(item) && item.source === source,
  )
}

/** Whether the draft's `skills` list already installs `name` from `source`. */
export function hasSourcedSkill(sources: unknown, source: string, name: string): boolean {
  const entry = findSkillSource(sources, source)
  return !!entry && Array.isArray(entry.skills) && entry.skills.map(String).includes(name)
}

/**
 * Add one skill found by search: it joins that source's `skills` entry when there is one,
 * so a repository the user already draws from stays a single entry.
 */
export function addSourcedSkill(sources: unknown, source: string, name: string): unknown[] {
  const list: unknown[] = Array.isArray(sources) ? [...sources] : []
  const entry = findSkillSource(list, source)
  if (!entry) return [...list, { source, skills: [name] }]
  const picked: string[] = Array.isArray(entry.skills) ? entry.skills.map(String) : []
  if (!picked.includes(name)) list[list.indexOf(entry)] = { ...entry, skills: [...picked, name] }
  return list
}

/** The draft position of the `source` entry, for edits that remove it. */
export function skillSourceIndex(sources: unknown, source: string): number {
  return (Array.isArray(sources) ? sources : []).findIndex(item => isTable(item) && item.source === source)
}

/**
 * Whether two provider blocks hold the same config, whatever order their keys were
 * written in: a profile saved by hand marks active just as well as one ZCF wrote.
 */
export function sameProvider(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!isTable(a) || !isTable(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every(key => key in b && sameProvider(a[key], b[key]))
}

/**
 * Take skills back out of the sources that install them. The entries keep what they still
 * pick, and an entry left with no skills goes; `undefined` when nothing is left at all.
 * An entry that names no skills installs them all — often hand-written — and "all but
 * these" has no shape to write, so such an entry is left alone: toggling a preset off
 * over one is a no-op, not a removal of the entry.
 */
export function removeSourcedSkills(sources: unknown, source: string, names: readonly string[]): unknown[] | undefined {
  const drop = new Set(names)
  const list = (Array.isArray(sources) ? sources : []).flatMap(item => {
    if (!isTable(item) || item.source !== source) return [item]
    const picked = Array.isArray(item.skills) ? item.skills.map(String) : undefined
    if (picked === undefined) return [item]
    const next = picked.filter(name => !drop.has(name))
    return next.length > 0 ? [{ ...item, skills: next }] : []
  })
  return list.length > 0 ? list : undefined
}

/** The parts of a workflow preset the draft helpers below look at, straight from core's type. */
type PresetPick = Pick<WorkflowPreset, 'skills' | 'agents'>

/**
 * Whether the draft's `skills` covers `names` from `source`: an entry that names no skills
 * installs them all, so it covers whatever is picked from its source.
 */
function sourceCovers(sources: unknown, source: string, names: readonly string[]): boolean {
  const entries = (Array.isArray(sources) ? sources : []).filter(item => isTable(item) && item.source === source)
  if (entries.length === 0) return false
  if (entries.some(item => !Array.isArray(item.skills))) return true
  return names.every(name => hasSourcedSkill(sources, source, name))
}

/**
 * Whether the draft already installs every skill and agent of `preset`. A source entry
 * that names no skills installs them all, so it covers whatever the preset picks from it.
 */
export function presetCovered(sources: unknown, agents: unknown, preset: PresetPick): boolean {
  const picked = Array.isArray(agents) ? agents.map(String) : []
  if (!preset.agents.every(agent => picked.includes(agent))) return false
  return preset.skills.every(entry => sourceCovers(sources, entry.source, entry.skills ?? []))
}

/**
 * Toggle a workflow preset in the draft. Installing merges each of its skill sources into
 * the draft's `skills` and adds its agents; removing takes its picks back out, dropping the
 * keys when nothing is left. The caller writes both returned values where they came from.
 */
export function togglePreset(
  sources: unknown,
  agents: unknown,
  preset: PresetPick,
): { skills: unknown[] | undefined; agents: string[] | undefined } {
  const presetAgents: readonly string[] = preset.agents
  const pickedAgents = Array.isArray(agents) ? agents.map(String) : []
  if (presetCovered(sources, agents, preset)) {
    let list: unknown = sources
    for (const entry of preset.skills) list = removeSourcedSkills(list, entry.source, entry.skills ?? [])
    const nextAgents = pickedAgents.filter(agent => !presetAgents.includes(agent))
    return {
      skills: Array.isArray(list) && list.length > 0 ? list : undefined,
      agents: nextAgents.length > 0 ? nextAgents : undefined,
    }
  }
  let list: unknown[] = Array.isArray(sources) ? [...sources] : []
  for (const entry of preset.skills) {
    const names = entry.skills ?? []
    if (names.length === 0) {
      // The preset installs the whole source; a bare entry is added only when none draws from it yet.
      if (!list.some(item => isTable(item) && item.source === entry.source)) list.push({ source: entry.source })
    } else for (const name of names) list = addSourcedSkill(list, entry.source, name)
  }
  const nextAgents = [...pickedAgents]
  for (const agent of preset.agents) if (!nextAgents.includes(agent)) nextAgents.push(agent)
  return { skills: list.length > 0 ? list : undefined, agents: nextAgents.length > 0 ? nextAgents : undefined }
}

/** A fresh MCP server of the given type, so the form has something to fill in. */
export function newMcpServer(type: McpType): Record<string, unknown> {
  return type === 'http' ? { type, url: '' } : { type, command: '' }
}

/** Switch a server's type, keeping what both types share (nothing but the type). */
export function withMcpType(server: unknown, type: McpType): Record<string, unknown> {
  return isTable(server) && server.type === type ? server : newMcpServer(type)
}

/** A name for a new MCP server that is not taken yet: `server`, `server-2`, ... */
export function freshName(taken: readonly string[], base = 'server'): string {
  if (!taken.includes(base)) return base
  let index = 2
  while (taken.includes(`${base}-${index}`)) index++
  return `${base}-${index}`
}
