import * as v from 'valibot'

export const TOOL_IDS = ['claude-code', 'codex', 'gemini-cli', 'opencode'] as const

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
  openai: v.optional(
    v.object({
      baseUrl: UrlString,
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
  v.regex(/^[\w-]+$/, 'MCP server names may only contain letters, digits, "_" and "-"'),
)

export const SkillSourceSchema = v.object({
  /** Anything `npx skills add` accepts: owner/repo, a git URL, or a local path. */
  source: NonEmptyString,
  /** Install only these skills from the source; empty installs all of them. */
  skills: v.optional(v.array(NonEmptyString), []),
})
export type SkillSource = v.InferOutput<typeof SkillSourceSchema>

export const ZcfConfigSchema = v.object({
  $schema: v.optional(v.string()),
  version: v.literal(1),
  tools: v.optional(v.array(ToolIdSchema), []),
  provider: v.optional(ProviderSchema),
  mcpServers: v.optional(v.record(McpServerNameSchema, McpServerSchema), {}),
  skills: v.optional(v.array(SkillSourceSchema), []),
})
export type ZcfConfig = v.InferOutput<typeof ZcfConfigSchema>
export type ZcfConfigInput = v.InferInput<typeof ZcfConfigSchema>

export interface ConfigIssue {
  path: string
  message: string
}

export type ParseConfigResult = { success: true; config: ZcfConfig } | { success: false; issues: ConfigIssue[] }

export function parseZcfConfig(input: unknown): ParseConfigResult {
  const result = v.safeParse(ZcfConfigSchema, input)
  if (result.success) return { success: true, config: result.output }

  return {
    success: false,
    issues: result.issues.map(issue => ({
      path: v.getDotPath(issue) ?? '',
      message: issue.message,
    })),
  }
}
