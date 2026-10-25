import * as v from 'valibot'

import { MIRRORS } from '../mirror'
import type { Message } from '../plan/types'

export const TOOL_IDS = ['claude-code', 'codex', 'gemini-cli', 'opencode', 'cursor', 'pi', 'dsh'] as const

export const ToolIdSchema = v.picklist(TOOL_IDS)
export type ToolId = v.InferOutput<typeof ToolIdSchema>

export function isToolId(value: unknown): value is ToolId {
  return TOOL_IDS.some(id => id === value)
}

export const TOOL_NAMES: Record<ToolId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  'gemini-cli': 'Gemini CLI',
  opencode: 'OpenCode',
  cursor: 'Cursor CLI',
  pi: 'Pi',
  dsh: 'DeepSeek Harness',
}

const NonEmptyString = v.pipe(v.string(), v.trim(), v.minLength(1))
const UrlString = v.pipe(v.string(), v.trim(), v.url())

/**
 * One provider shared by every selected tool. Each protocol block is optional:
 * a tool whose protocol is missing reports a notice instead of being skipped silently.
 */
export const ProviderSchema = v.object({
  name: NonEmptyString,
  apiKey: NonEmptyString,
  anthropic: v.optional(
    v.object({
      baseUrl: UrlString,
      authType: v.optional(v.picklist(['auth_token', 'api_key']), 'auth_token'),
    }),
  ),
  /** An OpenAI-compatible endpoint, such as `https://api.example.com/v1`. */
  openai: v.optional(
    v.object({
      baseUrl: UrlString,
      /** The model on this endpoint; falls back to `models.default`. */
      model: v.optional(NonEmptyString),
    }),
  ),
  /** The Gemini API, or a gateway that speaks it. Without `baseUrl` the official endpoint is used. */
  gemini: v.optional(
    v.object({
      baseUrl: v.optional(UrlString),
      model: v.optional(NonEmptyString),
    }),
  ),
  models: v.optional(
    v.object({
      default: v.optional(NonEmptyString),
      haiku: v.optional(NonEmptyString),
      sonnet: v.optional(NonEmptyString),
      opus: v.optional(NonEmptyString),
    }),
    {},
  ),
})
export type Provider = v.InferOutput<typeof ProviderSchema>
export type ProviderProtocol = 'anthropic' | 'openai' | 'gemini'

/** The model a tool should use on one of the provider's protocols. */
export function protocolModel(provider: Provider, protocol: 'openai' | 'gemini'): string | undefined {
  return provider[protocol]?.model ?? provider.models.default
}

const McpStdioSchema = v.object({
  type: v.literal('stdio'),
  command: NonEmptyString,
  args: v.optional(v.array(v.string()), []),
  env: v.optional(v.record(v.string(), v.string()), {}),
})

const McpHttpSchema = v.object({
  type: v.literal('http'),
  url: UrlString,
  headers: v.optional(v.record(v.string(), v.string()), {}),
})

export const McpServerSchema = v.variant('type', [McpStdioSchema, McpHttpSchema])
export type McpServer = v.InferOutput<typeof McpServerSchema>

const McpServerNameSchema = v.pipe(
  v.string(),
  // A custom message is a message key; front ends translate it.
  v.regex(/^[\w-]+$/, 'configIssue.mcpServerName'),
)

export const SkillSourceSchema = v.object({
  /** Anything `npx skills add` accepts: owner/repo, a git URL or a local path; `zcf` stands for ZCF's own skill templates. */
  source: NonEmptyString,
  /** Install only these skills from the source; empty installs all of them. */
  skills: v.optional(v.array(NonEmptyString), []),
})
export type SkillSource = v.InferOutput<typeof SkillSourceSchema>

/** The languages the config accepts for `language`; `auto` follows the system locale. */
export const LANGUAGES = ['auto', 'en', 'zh-CN'] as const
export type LanguageSetting = (typeof LANGUAGES)[number]

export const ZcfConfigSchema = v.object({
  $schema: v.optional(v.string()),
  version: v.literal(1),
  tools: v.optional(v.array(ToolIdSchema), []),
  provider: v.optional(ProviderSchema),
  mcpServers: v.optional(v.record(McpServerNameSchema, McpServerSchema), {}),
  skills: v.optional(v.array(SkillSourceSchema), []),
  /** Where ZCF downloads tools and packages from; `china` uses mirrors in mainland China. */
  mirror: v.optional(v.picklist(MIRRORS), 'official'),
  /** The language ZCF talks to the user in; `auto` follows the system locale. */
  language: v.optional(v.picklist(LANGUAGES), 'auto'),
})
export type ZcfConfig = v.InferOutput<typeof ZcfConfigSchema>
export type ZcfConfigInput = v.InferInput<typeof ZcfConfigSchema>

export interface ConfigIssue {
  /** Dot path of the field, or empty for the whole file. */
  path: string
  message: Message
}

export type ParseConfigResult = { success: true; config: ZcfConfig } | { success: false; issues: ConfigIssue[] }

/** valibot writes `Object`, `Array` and `("a" | "b")`; front ends show `object`, `array` and `"a" | "b"`. */
function readableExpected(expected: string): string {
  if (expected === 'Object' || expected === 'Array') return expected.toLowerCase()
  return expected.replace(/^\((.*)\)$/, '$1')
}

/**
 * Turn an issue into a message key. valibot's own text is never passed on: it is English
 * only, and it quotes the rejected value, which may be a credential pasted into the wrong field.
 */
function issueMessage(issue: v.BaseIssue<unknown>): Message {
  if (issue.message.startsWith('configIssue.')) return { key: issue.message }
  if (issue.type === 'min_length') return { key: 'configIssue.empty' }
  if (issue.type === 'url') return { key: 'configIssue.url' }
  if (issue.kind === 'schema') {
    if (issue.received === 'undefined') return { key: 'configIssue.missing' }
    if (issue.expected) return { key: 'configIssue.expected', params: { expected: readableExpected(issue.expected) } }
  }
  return { key: 'configIssue.invalid' }
}

export function parseZcfConfig(input: unknown): ParseConfigResult {
  const result = v.safeParse(ZcfConfigSchema, input)
  if (result.success) return { success: true, config: result.output }

  return {
    success: false,
    issues: result.issues.map(issue => ({
      path: v.getDotPath(issue) ?? '',
      message: issueMessage(issue),
    })),
  }
}
