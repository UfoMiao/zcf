import type { ToolId } from '@zcf/core/schema'
import { TOOL_IDS } from '@zcf/core/schema'

import type { DraftPath } from './draft'
import { isTable } from './draft'

export type PageId = 'tools' | 'provider' | 'mcp' | 'skills' | 'apply'

export const PAGES: readonly PageId[] = ['tools', 'provider', 'mcp', 'skills', 'apply']

/** The config key each editing page works on, so a page can be flagged when it has problems. */
export const PAGE_ROOTS: Readonly<Record<PageId, string | undefined>> = {
  tools: 'tools',
  provider: 'provider',
  mcp: 'mcpServers',
  skills: 'skills',
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
  /** Message key of a short hint shown under the field. */
  hint?: string
  required?: boolean
}

/** The value to store for text typed into a field: an empty optional field is removed instead. */
export function fieldValue(field: Field, text: string): string | undefined {
  return text === '' && !field.required ? undefined : text
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

/** The fields of one skill source, relative to `skills.<index>`. */
export const SKILL_FIELDS: readonly Field[] = [
  { label: 'field.skill.source', path: ['source'], kind: 'text', required: true, hint: 'hint.skill.source' },
  { label: 'field.skill.skills', path: ['skills'], kind: 'list', hint: 'hint.skill.skills' },
]

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
