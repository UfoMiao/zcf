import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { CommandStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { ConfigLanguage, McpServer, Provider } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import { envPath, notice, probe, sameJson, selfUpdateStep, skillSteps } from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'claude-code' as const

/** Env keys in settings.json that ZCF owns. Keys the config leaves unset are removed. */
const PROVIDER_ENV_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
] as const

/** On Windows, Claude Code cannot spawn these `.cmd` shims for a stdio MCP server without `cmd /c`. */
const WINDOWS_SHIMS = new Set(['npx', 'npm', 'pnpm', 'pnpx', 'yarn', 'bunx'])

function nativeBinary(ctx: AdapterContext): string {
  return join(ctx.home, '.local', 'bin', ctx.platform === 'win32' ? 'claude.exe' : 'claude')
}

/** The npm package that ships the same native binary as the official installer. */
const NPM_PACKAGE = '@anthropic-ai/claude-code'

function installStep(ctx: AdapterContext): CommandStep {
  const title = {
    key: 'step.install',
    params: { tool: TOOL },
  }
  // The native installer downloads from Google Cloud Storage, which mainland China cannot
  // reach; npm through the mirror's registry installs the same binary.
  // npm 12 skips install scripts unless allowed, and the package's postinstall links the binary.
  if (ctx.mirror === 'china')
    return {
      kind: 'command',
      title,
      command: 'npm',
      args: ['install', '-g', `--allow-scripts=${NPM_PACKAGE}`, NPM_PACKAGE],
    }
  // The official native installer; it also keeps Claude Code updated in the background.
  if (ctx.platform === 'win32') {
    return {
      kind: 'command',
      title,
      command: 'powershell',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://claude.ai/install.ps1 | iex'],
    }
  }
  return {
    kind: 'command',
    title,
    command: 'bash',
    // pipefail: a failed download must fail the step, not run an empty script.
    args: ['-c', 'set -o pipefail; curl -fsSL https://claude.ai/install.sh | bash'],
  }
}

export function providerEnv(provider: Provider): Record<string, string | undefined> {
  const anthropic = provider.anthropic!
  const tokenKey = anthropic.authType === 'api_key' ? 'ANTHROPIC_API_KEY' : 'ANTHROPIC_AUTH_TOKEN'
  const env: Record<string, string | undefined> = Object.fromEntries(PROVIDER_ENV_KEYS.map(key => [key, undefined]))
  env.ANTHROPIC_BASE_URL = anthropic.baseUrl
  env[tokenKey] = provider.apiKey
  env.ANTHROPIC_MODEL = provider.models.default
  env.ANTHROPIC_DEFAULT_HAIKU_MODEL = provider.models.haiku
  env.ANTHROPIC_DEFAULT_SONNET_MODEL = provider.models.sonnet
  env.ANTHROPIC_DEFAULT_OPUS_MODEL = provider.models.opus
  return env
}

/** The server definition in the shape Claude Code stores in `~/.claude.json`. */
export function claudeMcpServer(server: McpServer, platform: NodeJS.Platform): Record<string, unknown> {
  if (server.type === 'http') return { type: 'http', url: server.url, headers: server.headers }

  const wrap = platform === 'win32' && WINDOWS_SHIMS.has(server.command)
  return {
    type: 'stdio',
    command: wrap ? 'cmd' : server.command,
    args: wrap ? ['/c', server.command, ...server.args] : server.args,
    env: server.env,
  }
}

function normalizeExisting(value: unknown): unknown {
  if (!isTable(value)) return value
  const server = { ...value }
  if (server.type === undefined && 'command' in server) server.type = 'stdio'
  if (server.type === 'stdio') {
    server.args ??= []
    server.env ??= {}
  }
  if (server.type === 'http') server.headers ??= {}
  return server
}

/** Claude Code keeps its settings, skills and `.claude.json` under `CLAUDE_CONFIG_DIR` when it is set. */
function configDir(ctx: AdapterContext): string | undefined {
  return envPath(ctx, 'CLAUDE_CONFIG_DIR')
}

function settingsDir(ctx: AdapterContext): string {
  return configDir(ctx) ?? join(ctx.home, '.claude')
}

function stateFile(ctx: AdapterContext): string {
  return join(configDir(ctx) ?? ctx.home, '.claude.json')
}

async function existingMcpServers(ctx: AdapterContext): Promise<Record<string, unknown>> {
  const text = await ctx.readFile(stateFile(ctx))
  const data: unknown = text ? parse(text) : undefined
  return isTable(data) && isTable(data.mcpServers) ? data.mcpServers : {}
}

async function mcpSteps(servers: Record<string, McpServer>, command: string, ctx: AdapterContext): Promise<PlanStep[]> {
  const names = Object.keys(servers)
  if (names.length === 0) return []

  const existing = await existingMcpServers(ctx)
  // `claude mcp` rewrites .claude.json, which also holds Claude Code's own state.
  const touches = [stateFile(ctx)]
  const steps: PlanStep[] = []
  for (const name of names) {
    const desired = claudeMcpServer(servers[name]!, ctx.platform)
    if (Object.hasOwn(existing, name)) {
      if (sameJson(normalizeExisting(existing[name]), desired)) continue
      steps.push({
        kind: 'command',
        title: {
          key: 'step.mcpRemove',
          params: { name },
        },
        command,
        args: ['mcp', 'remove', name, '--scope', 'user'],
        touches,
      })
    }
    steps.push({
      kind: 'command',
      title: {
        key: 'step.mcpAdd',
        params: { name },
      },
      command,
      args: ['mcp', 'add-json', name, JSON.stringify(desired), '--scope', 'user'],
      touches,
    })
  }
  return steps
}

/** Claude Code passes this settings value verbatim to the model as the language to respond in. */
export const RESPONSE_LANGUAGE: Record<ConfigLanguage, string | undefined> = {
  en: undefined,
  'zh-CN': 'Simplified Chinese',
}

/**
 * Apply `configLanguage` through Claude Code's own `language` key. Nothing to do when the
 * file already says so. English only removes a value ZCF itself wrote earlier: a language the
 * user picked themselves in Claude Code (such as "japanese") is theirs, not ZCF's to clear.
 */
async function languageStep(language: ConfigLanguage, ctx: AdapterContext): Promise<PlanStep | undefined> {
  const path = join(settingsDir(ctx), 'settings.json')
  const text = await ctx.readFile(path)
  const data: unknown = text ? parse(text) : undefined
  const current = isTable(data) ? data.language : undefined
  const desired = RESPONSE_LANGUAGE[language]
  if (current === desired || (desired === undefined && current !== RESPONSE_LANGUAGE['zh-CN'])) return undefined
  return {
    kind: 'file',
    title: { key: 'step.language', params: { tool: TOOL, language } },
    path,
    format: 'json',
    edits: [{ path: ['language'], value: desired }],
  }
}

export const claudeCode: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  async detect(ctx) {
    return (
      (await probe(ctx, 'claude')) ??
      (await probe(ctx, nativeBinary(ctx))) ?? {
        installed: false,
        command: nativeBinary(ctx),
      }
    )
  },

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []

    if (!status.installed) steps.push(installStep(ctx))
    // npm puts `claude` on PATH, unlike the native installer.
    const command = !status.installed && ctx.mirror === 'china' ? 'claude' : status.command
    // npm reports success even when the postinstall that links the binary did not run.
    if (!status.installed && ctx.mirror === 'china')
      steps.push({
        kind: 'command',
        title: { key: 'step.verify', params: { tool: TOOL } },
        command,
        args: ['--version'],
      })

    if (config.provider) {
      if (config.provider.anthropic) {
        const edits: KeyEdit[] = Object.entries(providerEnv(config.provider)).map(([key, value]) => ({
          path: ['env', key],
          value,
        }))
        steps.push({
          kind: 'file',
          title: {
            key: 'step.provider',
            params: { tool: TOOL, provider: config.provider.name },
          },
          path: join(settingsDir(ctx), 'settings.json'),
          format: 'json',
          edits,
        })
      } else {
        notices.push(notice('warning', 'notice.providerMissingProtocol', { tool: TOOL, protocol: 'anthropic' }))
      }
    }

    const language = await languageStep(config.configLanguage, ctx)
    if (language) steps.push(language)
    steps.push(...(await mcpSteps(config.mcpServers, command, ctx)))
    steps.push(...(await skillSteps(config.skills, ctx, { agent: TOOL, dir: join(settingsDir(ctx), 'skills') })))

    return { tool: TOOL, steps, notices }
  },

  planUpdate(status, ctx) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    // `claude update` runs npm on an npm install, which takes the mirror's registry; a native
    // install downloads from Anthropic, and ZCF cannot tell the two apart from `claude --version`.
    const notices = ctx.mirror === 'china' ? [notice('info', 'notice.nativeUpdateNotMirrored', { tool: TOOL })] : []
    return { tool: TOOL, steps: [selfUpdateStep(TOOL, status, ['update'])], notices }
  },
}
