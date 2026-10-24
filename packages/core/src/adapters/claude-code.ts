import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { CommandStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider, SkillSource } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import type { AdapterContext, ToolAdapter, ToolStatus } from './types'

const TOOL = 'claude-code' as const
const VERSION_PATTERN = /\d+\.\d+\.\d+/

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

async function probe(ctx: AdapterContext, command: string): Promise<ToolStatus | undefined> {
  const result = await ctx.runner.run(command, ['--version'])
  if (result.exitCode !== 0) return undefined
  return { installed: true, command, version: VERSION_PATTERN.exec(result.stdout)?.[0] }
}

function installStep(ctx: AdapterContext): CommandStep {
  const title = {
    key: 'step.install',
    params: { tool: TOOL },
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
    args: ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'],
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

function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted)
    if (isTable(value))
      return Object.fromEntries(
        Object.keys(value)
          .toSorted()
          .map(key => [key, sorted(value[key])]),
      )
    return value
  }
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
}

async function existingMcpServers(ctx: AdapterContext): Promise<Record<string, unknown>> {
  const text = await ctx.readFile(join(ctx.home, '.claude.json'))
  const data: unknown = text ? parse(text) : undefined
  return isTable(data) && isTable(data.mcpServers) ? data.mcpServers : {}
}

async function mcpSteps(servers: Record<string, McpServer>, command: string, ctx: AdapterContext): Promise<PlanStep[]> {
  const names = Object.keys(servers)
  if (names.length === 0) return []

  const existing = await existingMcpServers(ctx)
  const steps: PlanStep[] = []
  for (const name of names) {
    const desired = claudeMcpServer(servers[name]!, ctx.platform)
    if (name in existing) {
      if (sameJson(normalizeExisting(existing[name]), desired)) continue
      steps.push({
        kind: 'command',
        title: {
          key: 'step.mcpRemove',
          params: { name },
        },
        command,
        args: ['mcp', 'remove', name, '--scope', 'user'],
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
    })
  }
  return steps
}

export function skillsAddStep({ source, skills }: SkillSource, agent: string): CommandStep {
  return {
    kind: 'command',
    title: {
      key: 'step.skillsAdd',
      params: { source },
    },
    command: 'npx',
    args: ['-y', 'skills', 'add', source, '-g', '-y', '-a', agent, ...skills.flatMap(name => ['-s', name])],
  }
}

/**
 * Install skills with the `skills` CLI. A source that names its skills is skipped
 * once all of them are installed; one that installs everything always runs, since
 * the skills it holds are only known after fetching it.
 */
async function skillSteps(sources: readonly SkillSource[], ctx: AdapterContext): Promise<CommandStep[]> {
  const isInstalled = async (name: string) =>
    (await ctx.readFile(join(ctx.home, '.claude', 'skills', name, 'SKILL.md'))) !== undefined
  const needed = await Promise.all(
    sources.map(
      async source => source.skills.length === 0 || (await Promise.all(source.skills.map(isInstalled))).includes(false),
    ),
  )
  return sources.filter((_, index) => needed[index]).map(source => skillsAddStep(source, TOOL))
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
          path: join(ctx.home, '.claude', 'settings.json'),
          format: 'json',
          edits,
        })
      } else {
        notices.push({
          level: 'warning',
          message: {
            key: 'notice.providerMissingProtocol',
            params: { tool: TOOL, protocol: 'anthropic' },
          },
        })
      }
    }

    steps.push(...(await mcpSteps(config.mcpServers, status.command, ctx)))
    steps.push(...(await skillSteps(config.skills, ctx)))

    return { tool: TOOL, steps, notices }
  },

  planUpdate(status) {
    if (!status.installed) {
      return {
        tool: TOOL,
        steps: [],
        notices: [
          {
            level: 'info',
            message: {
              key: 'notice.notInstalled',
              params: { tool: TOOL },
            },
          },
        ],
      }
    }
    return {
      tool: TOOL,
      steps: [
        {
          kind: 'command',
          title: {
            key: 'step.update',
            params: { tool: TOOL },
          },
          command: status.command,
          args: ['update'],
        },
      ],
      notices: [],
    }
  },
}
