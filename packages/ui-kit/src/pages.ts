import type { ToolId } from '@zcf/core/schema'
import { BUILTIN_SKILLS_SOURCE, CONFIG_LANGUAGES, MIRRORS, TOOL_IDS } from '@zcf/core/schema'

import type { DraftPath } from './draft'
import { isTable } from './draft'

export type PageId = 'tools' | 'provider' | 'mcp' | 'skills' | 'settings' | 'apply'

export const PAGES: readonly PageId[] = ['tools', 'provider', 'mcp', 'skills', 'settings', 'apply']

/** The config keys each editing page works on, so a page can be flagged when it has problems. */
export const PAGE_ROOTS: Readonly<Record<PageId, readonly string[] | undefined>> = {
  tools: ['tools'],
  provider: ['provider'],
  mcp: ['mcpServers'],
  skills: ['skills'],
  settings: ['mirror', 'configLanguage'],
  apply: undefined,
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
