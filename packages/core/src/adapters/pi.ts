import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { CommandStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import { expandHome, piAiRoute } from './pi-ai'
import {
  cleanConfigStep,
  detectCommand,
  envPath,
  languageNotice,
  notice,
  npmUninstallSteps,
  sameJson,
  selfUpdateSteps,
  skillSteps,
} from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'pi' as const
const PACKAGE = '@earendil-works/pi-coding-agent'
/** The provider id ZCF owns in `models.json`. */
const PROVIDER_ID = 'zcf'

/** pi keeps its user-level files in `PI_CODING_AGENT_DIR`, by default `~/.pi/agent`. */
function agentDir(ctx: AdapterContext): string {
  const dir = envPath(ctx, 'PI_CODING_AGENT_DIR')
  return dir ? expandHome(ctx, dir) : join(ctx.home, '.pi', 'agent')
}

function installStep(): CommandStep {
  // pi documents npm as its cross-platform install and needs no lifecycle scripts.
  return {
    kind: 'command',
    title: { key: 'step.install', params: { tool: TOOL } },
    command: 'npm',
    args: ['install', '-g', '--ignore-scripts', PACKAGE],
  }
}

/** pi reads `$NAME`, `${NAME}` and a leading `!command` in `apiKey`; `$$` and `$!` keep a key literal. */
function literalKey(key: string): string {
  const escaped = key.replaceAll('$', () => '$$')
  return escaped.startsWith('!') ? `$${escaped}` : escaped
}

/**
 * pi resolves MCP `env` and header values the same way. A `${NAME}` reference is kept, as Claude
 * Code and `.mcp.json` files use it; any other `$` and a leading `!` stay literal.
 */
function literalMcpValue(value: string): string {
  const escaped = value.replaceAll(/\$(?!\{)/g, () => '$$')
  return escaped.startsWith('!') ? `$${escaped}` : escaped
}

function literalMcpValues(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, literalMcpValue(value)]))
}

async function providerSteps(
  provider: Provider,
  ctx: AdapterContext,
): Promise<{ steps: PlanStep[]; notices: Notice[] }> {
  const found = piAiRoute(provider, TOOL)
  if ('notice' in found) return { steps: [], notices: [found.notice] }

  const { route } = found
  const file = join(agentDir(ctx), 'models.json')
  const text = await ctx.readFile(file)
  const data: unknown = text ? parse(text) : undefined
  const providers = isTable(data) && isTable(data.providers) ? data.providers : {}
  const current = providers[PROVIDER_ID]
  const fields = {
    name: provider.name,
    baseUrl: route.baseUrl,
    api: route.api,
    apiKey: literalKey(provider.apiKey),
    authHeader: route.bearer ? true : undefined,
  }
  const model = { id: route.model }

  // Edit ZCF's provider key by key, so model settings added in pi, such as `reasoning`, stay.
  const edits: KeyEdit[] = []
  const base = ['providers', PROVIDER_ID]
  if (!isTable(current)) {
    const defined = Object.entries(fields).filter(([, value]) => value !== undefined)
    edits.push({ path: base, value: { ...Object.fromEntries(defined), models: [model] } })
  } else {
    for (const [key, value] of Object.entries(fields)) edits.push({ path: [...base, key], value })
    const models: unknown = current.models
    if (!Array.isArray(models)) edits.push({ path: [...base, 'models'], value: [model] })
    else if (!models.some(entry => isTable(entry) && entry.id === route.model)) {
      edits.push({ path: [...base, 'models', models.length], value: model })
    }
  }

  return {
    steps: [
      {
        kind: 'file',
        title: { key: 'step.provider', params: { tool: TOOL, provider: provider.name } },
        path: file,
        format: 'json',
        edits,
      },
      {
        kind: 'file',
        title: { key: 'step.defaultModel', params: { model: route.model } },
        path: join(agentDir(ctx), 'settings.json'),
        format: 'json',
        edits: [
          { path: ['defaultProvider'], value: PROVIDER_ID },
          { path: ['defaultModel'], value: route.model },
        ],
      },
    ],
    notices: [],
  }
}

/** The fields `pi mcp add` writes, so a server already in `mcp.json` can be compared with the config. */
function piMcpServer(server: McpServer): Record<string, unknown> {
  if (server.type === 'http') return { url: server.url, headers: literalMcpValues(server.headers) }
  return { command: server.command, args: server.args, env: literalMcpValues(server.env) }
}

function comparable(existing: unknown, type: McpServer['type']): unknown {
  if (!isTable(existing)) return existing
  if (type === 'http') return { url: existing.url, headers: existing.headers ?? {} }
  return { command: existing.command, args: existing.args ?? [], env: existing.env ?? {} }
}

function mcpAddArgs(name: string, server: McpServer): string[] {
  if (server.type === 'http') {
    return [
      'mcp',
      'add',
      name,
      '--url',
      server.url,
      ...Object.entries(literalMcpValues(server.headers)).flatMap(([key, value]) => ['--header', `${key}=${value}`]),
    ]
  }
  // pi spawns stdio servers with cross-spawn, so Windows `.cmd` shims such as `npx` need no `cmd /c`.
  return [
    'mcp',
    'add',
    name,
    ...Object.entries(literalMcpValues(server.env)).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
    '--',
    server.command,
    ...server.args,
  ]
}

async function mcpSteps(servers: Record<string, McpServer>, command: string, ctx: AdapterContext): Promise<PlanStep[]> {
  const names = Object.keys(servers)
  if (names.length === 0) return []

  const file = join(agentDir(ctx), 'mcp.json')
  const text = await ctx.readFile(file)
  const data: unknown = text ? parse(text) : undefined
  const existing = isTable(data) && isTable(data.mcpServers) ? data.mcpServers : {}

  // `pi mcp add` replaces a server with the same name, so a changed server needs no removal first.
  return names
    .filter(name => {
      const server = servers[name]!
      return !Object.hasOwn(existing, name) || !sameJson(comparable(existing[name], server.type), piMcpServer(server))
    })
    .map(name => ({
      kind: 'command',
      title: { key: 'step.mcpAdd', params: { name } },
      command,
      args: mcpAddArgs(name, servers[name]!),
      touches: [file],
    }))
}

export const pi: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  detect: ctx => detectCommand(ctx, ['pi']),

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []

    if (!status.installed) steps.push(installStep())

    // pi has no language setting of its own; its docs point at AGENTS.md instructions instead.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    if (config.provider) {
      const provider = await providerSteps(config.provider, ctx)
      steps.push(...provider.steps)
      notices.push(...provider.notices)
    }

    steps.push(...(await mcpSteps(config.mcpServers, status.command, ctx)))
    // The `skills` CLI installs pi skills into the shared Agent Skills folder, which pi reads.
    steps.push(
      ...(await skillSteps(
        config.skills,
        ctx,
        { agent: 'pi', dir: join(ctx.home, '.agents', 'skills') },
        config.configLanguage,
      )),
    )

    return { tool: TOOL, steps, notices }
  },

  async planUpdate(status, ctx) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    // `pi update --self` updates pi however it was installed, without touching pi packages.
    // The npm fallback matches the install ZCF itself performs, scripts and all.
    return {
      tool: TOOL,
      steps: await selfUpdateSteps(TOOL, status, ['update', '--self'], PACKAGE, ctx, [], true),
      notices: [],
    }
  },

  async planUninstall(status, ctx, _provider) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    // pi documents no uninstall; a global npm install is what ZCF and the docs set up, and
    // anything else (Nix, brew) has its own manager.
    const { steps, notices } = await npmUninstallSteps(TOOL, PACKAGE, ctx)
    // The provider route ZCF wrote: its own entry in models.json, and the default picks in
    // settings.json while they point at it.
    const modelsFile = join(agentDir(ctx), 'models.json')
    const modelsText = await ctx.readFile(modelsFile)
    const modelsData: unknown = modelsText ? parse(modelsText) : undefined
    if (isTable(modelsData) && isTable(modelsData.providers) && Object.hasOwn(modelsData.providers, PROVIDER_ID))
      steps.push(cleanConfigStep(TOOL, modelsFile, 'json', [{ path: ['providers', PROVIDER_ID], value: undefined }]))
    const settingsFile = join(agentDir(ctx), 'settings.json')
    const settingsText = await ctx.readFile(settingsFile)
    const settingsData: unknown = settingsText ? parse(settingsText) : undefined
    if (isTable(settingsData) && settingsData.defaultProvider === PROVIDER_ID) {
      steps.push(
        cleanConfigStep(TOOL, settingsFile, 'json', [
          { path: ['defaultProvider'], value: undefined },
          { path: ['defaultModel'], value: undefined },
        ]),
      )
    }
    return { tool: TOOL, steps, notices }
  },
}
