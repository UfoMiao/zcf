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

/**
 * Optional companion tools ZCF can install alongside the coding tools, such as a local
 * model gateway. They take no per-tool config; only their install differs.
 */
export const EXTRA_IDS = ['magpie', 'ccline'] as const
export type ExtraId = (typeof EXTRA_IDS)[number]
export const EXTRA_NAMES: Record<ExtraId, string> = {
  magpie: 'magpie',
  ccline: 'CCometixLine',
}

/** Whether a value names an extra, the way `isToolId` names a tool. */
export function isExtraId(value: unknown): value is ExtraId {
  return EXTRA_IDS.some(id => id === value)
}

/** Every name a plan can carry: coding tools and the extras beside them. */
export const ACTOR_NAMES: Record<ToolId | ExtraId, string> = { ...TOOL_NAMES, ...EXTRA_NAMES }

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
export { McpServerNameSchema }

export const SkillSourceSchema = v.object({
  /** Anything `npx skills add` accepts: owner/repo, a git URL or a local path; `zcf` stands for ZCF's own skill templates. */
  source: NonEmptyString,
  /** Install only these skills from the source; empty installs all of them. */
  skills: v.optional(v.array(NonEmptyString), []),
})
export type SkillSource = v.InferOutput<typeof SkillSourceSchema>

/** The agent templates ZCF ships, in `templates/agents/<language>/<id>/AGENT.md`. */
export const BUILTIN_AGENT_IDS = ['init-architect', 'get-current-datetime', 'planner', 'ui-ux-designer'] as const
export type BuiltinAgentId = (typeof BUILTIN_AGENT_IDS)[number]

/** The output-style templates ZCF ships, in `templates/output-styles/<language>/<id>.md`. */
export const BUILTIN_STYLE_IDS = [
  'engineer-professional',
  'nekomata-engineer',
  'laowang-engineer',
  'ojousama-engineer',
  'rem-engineer',
  'leibus-engineer',
] as const
export type BuiltinStyleId = (typeof BUILTIN_STYLE_IDS)[number]

/**
 * A named provider the user keeps for switching. Only the top-level `provider` is applied;
 * switching copies a profile's provider there, so the active setup stays one block.
 */
export const ProfileSchema = v.object({
  id: v.pipe(
    v.string(),
    // A custom message is a message key; front ends translate it.
    v.regex(/^[\w-]+$/, 'configIssue.profileId'),
  ),
  name: NonEmptyString,
  provider: ProviderSchema,
})
export type Profile = v.InferOutput<typeof ProfileSchema>

/**
 * A custom workflow bundle: one name that installs the skills, agents and MCP servers it
 * lists. Skills are full sources; agents and servers are referenced by id or name and must
 * exist in their own sections, so a bundle never repeats a server's definition.
 */
export const WorkflowSchema = v.object({
  name: NonEmptyString,
  skills: v.optional(v.array(SkillSourceSchema), []),
  agents: v.optional(v.array(v.picklist(BUILTIN_AGENT_IDS)), []),
  mcp: v.optional(v.array(McpServerNameSchema), []),
})
export type Workflow = v.InferOutput<typeof WorkflowSchema>

/** The output styles to install; every one is optional, and so is the default. */
export const StylesSchema = v.object({
  outputStyles: v.optional(v.array(v.picklist(BUILTIN_STYLE_IDS)), []),
  /** Claude Code's `outputStyle` settings key; unset removes ZCF's own pick. */
  defaultOutputStyle: v.optional(v.picklist(BUILTIN_STYLE_IDS)),
})
export type Styles = v.InferOutput<typeof StylesSchema>

/**
 * Optional companion tools. `magpie` picks a face of the same install: `client` for the
 * desktop app, `cli` for terminal use; `ccline` installs the CCometixLine status bar and
 * wires it into Claude Code's settings.
 */
export const MAGPIE_FACES = ['client', 'cli'] as const
export type MagpieFace = (typeof MAGPIE_FACES)[number]

export const ExtrasSchema = v.object({
  magpie: v.optional(v.picklist(MAGPIE_FACES)),
  ccline: v.optional(v.boolean()),
})
export type Extras = v.InferOutput<typeof ExtrasSchema>

/** The languages the config accepts for `language`; `auto` follows the system locale. */
export const LANGUAGES = ['auto', 'en', 'zh-CN'] as const
export type LanguageSetting = (typeof LANGUAGES)[number]

/** Whether a draft value is a `language` the config accepts, for the editors' language switch. */
export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return LANGUAGES.some(lang => lang === value)
}

/**
 * The languages the config accepts for `configLanguage`: the language the tools themselves
 * work in once ZCF applies. No `auto`: no tool has one, and Claude Code passes the value it
 * finds verbatim to the model, so an unresolved `auto` would end up in its settings.
 */
export const CONFIG_LANGUAGES = ['en', 'zh-CN'] as const
export type ConfigLanguage = (typeof CONFIG_LANGUAGES)[number]

/** Whether a value is a `configLanguage`, so step titles can show it by name. */
export function isConfigLanguage(value: unknown): value is ConfigLanguage {
  return CONFIG_LANGUAGES.some(lang => lang === value)
}

export const ZcfConfigSchema = v.object({
  $schema: v.optional(v.string()),
  version: v.literal(1),
  tools: v.optional(v.array(ToolIdSchema), []),
  provider: v.optional(ProviderSchema),
  /** Saved providers to switch between; the top-level `provider` is the one applied. */
  profiles: v.optional(v.array(ProfileSchema), []),
  mcpServers: v.optional(v.record(McpServerNameSchema, McpServerSchema), {}),
  skills: v.optional(v.array(SkillSourceSchema), []),
  /** Built-in agent templates to install for the tools that take agents. */
  agents: v.optional(v.array(v.picklist(BUILTIN_AGENT_IDS)), []),
  /** Custom workflow bundles, each a name over skills, agents and MCP servers. */
  workflows: v.optional(v.array(WorkflowSchema), []),
  styles: v.optional(StylesSchema, {}),
  extras: v.optional(ExtrasSchema, {}),
  /** Where ZCF downloads tools and packages from; `china` uses mirrors in mainland China. */
  mirror: v.optional(v.picklist(MIRRORS), 'official'),
  /** The language ZCF talks to the user in; `auto` follows the system locale. */
  language: v.optional(v.picklist(LANGUAGES), 'auto'),
  /** The language the configured tools respond in; only tools with a setting of their own receive it. */
  configLanguage: v.optional(v.picklist(CONFIG_LANGUAGES), 'en'),
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
