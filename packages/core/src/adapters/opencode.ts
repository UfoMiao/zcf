import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { FileStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider } from '../schema/config'
import { protocolModel, TOOL_NAMES } from '../schema/config'
import { detectCommand, envPath, notice, npmInstallStep, selfUpdateStep, skillSteps } from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'opencode' as const

/** The provider id ZCF owns in `provider`; models are picked as `zcf/<model>`. */
const PROVIDER_ID = 'zcf'

/** OpenCode keeps its global config under `$XDG_CONFIG_HOME/opencode`, `~/.config/opencode` by default, on every platform. */
function configDir(ctx: AdapterContext): string {
  return join(envPath(ctx, 'XDG_CONFIG_HOME') ?? join(ctx.home, '.config'), 'opencode')
}

/** OpenCode reads `opencode.json` and then `opencode.jsonc`, so an existing `.jsonc` file is the one that wins. */
async function configFile(ctx: AdapterContext): Promise<{ path: string; data: Record<string, unknown> | undefined }> {
  const dir = configDir(ctx)
  for (const name of ['opencode.jsonc', 'opencode.json']) {
    const path = join(dir, name)
    // oxlint-disable-next-line no-await-in-loop
    const text = await ctx.readFile(path)
    if (text === undefined) continue
    const data: unknown = parse(text, [], { allowTrailingComma: true })
    return { path, data: isTable(data) ? data : {} }
  }
  return { path: join(dir, 'opencode.json'), data: undefined }
}

interface Route {
  protocol: 'anthropic' | 'openai'
  /** The AI SDK package OpenCode loads for the provider. */
  npm: string
  options: Record<string, string | undefined>
  model: string | undefined
  /** Every model ZCF offers in the `/models` picker. */
  models: string[]
  smallModel: string | undefined
}

function anthropicRoute(provider: Provider): Route | undefined {
  const anthropic = provider.anthropic
  if (!anthropic) return undefined
  const { models } = provider
  const bearer = anthropic.authType !== 'api_key'
  return {
    protocol: 'anthropic',
    npm: '@ai-sdk/anthropic',
    options: {
      // Claude-style base URLs leave out the version that the AI SDK expects to be part of it.
      baseURL: `${anthropic.baseUrl.replace(/\/+$/, '')}/v1`,
      apiKey: bearer ? undefined : provider.apiKey,
      authToken: bearer ? provider.apiKey : undefined,
    },
    model: models.default,
    models: [models.default, models.haiku, models.sonnet, models.opus].filter(model => model !== undefined),
    smallModel: models.haiku,
  }
}

function openaiRoute(provider: Provider): Route | undefined {
  if (!provider.openai) return undefined
  const model = protocolModel(provider, 'openai')
  return {
    protocol: 'openai',
    npm: '@ai-sdk/openai-compatible',
    options: { baseURL: provider.openai.baseUrl, apiKey: provider.apiKey, authToken: undefined },
    model,
    models: model ? [model] : [],
    smallModel: undefined,
  }
}

/** Prefer the protocol that names a model; between equals, Anthropic keeps prompt caching and thinking. */
function pickRoute(provider: Provider): Route | undefined {
  const routes = [anthropicRoute(provider), openaiRoute(provider)].filter(route => route !== undefined)
  return routes.find(route => route.model) ?? routes[0]
}

/** A `model` or `small_model` that points at the ZCF provider; other providers' picks are left alone. */
function ownedModel(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(`${PROVIDER_ID}/`)
}

function providerEdits(provider: Provider, route: Route, existing: Record<string, unknown> | undefined): KeyEdit[] {
  const base = ['provider', PROVIDER_ID]
  const pick = (key: 'model' | 'small_model', model: string | undefined): KeyEdit[] => {
    if (model) return [{ path: [key], value: `${PROVIDER_ID}/${model}` }]
    // Drop a pick of a model ZCF no longer offers.
    return ownedModel(existing?.[key]) ? [{ path: [key], value: undefined }] : []
  }
  return [
    { path: [...base, 'npm'], value: route.npm },
    { path: [...base, 'name'], value: provider.name },
    ...Object.entries(route.options).map(([key, value]) => ({ path: [...base, 'options', key], value })),
    { path: [...base, 'models'], value: Object.fromEntries(route.models.map(model => [model, {}])) },
    ...pick('model', route.model),
    ...pick('small_model', route.smallModel),
  ]
}

function filled(record: Record<string, string>): Record<string, string> | undefined {
  return Object.keys(record).length > 0 ? record : undefined
}

/** The server definition in the shape OpenCode stores under `mcp`. */
export function opencodeMcpServer(server: McpServer): Record<string, unknown> {
  if (server.type === 'http') return { type: 'remote', url: server.url, headers: filled(server.headers), enabled: true }
  return { type: 'local', command: [server.command, ...server.args], environment: filled(server.env), enabled: true }
}

export const opencode: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  async detect(ctx) {
    // The official install script puts the binary in ~/.opencode/bin and only adds it to PATH for new shells.
    const script = join(ctx.home, '.opencode', 'bin', ctx.platform === 'win32' ? 'opencode.exe' : 'opencode')
    return detectCommand(ctx, ['opencode', script], 'opencode')
  },

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []

    // npm is the install that works the same on every platform, Windows included.
    if (!status.installed) steps.push(npmInstallStep(TOOL, 'opencode-ai'))

    const file = await configFile(ctx)
    const fileStep = (title: FileStep['title'], edits: KeyEdit[]): FileStep => ({
      kind: 'file',
      title,
      path: file.path,
      format: 'json',
      edits,
    })
    const fileSteps: FileStep[] = []

    if (config.provider) {
      const route = pickRoute(config.provider)
      if (route) {
        fileSteps.push(
          fileStep(
            { key: 'step.provider', params: { tool: TOOL, provider: config.provider.name } },
            providerEdits(config.provider, route, file.data),
          ),
        )
        if (!route.model)
          notices.push(notice('warning', 'notice.modelMissing', { tool: TOOL, protocol: route.protocol }))
      } else {
        notices.push(notice('warning', 'notice.providerMissingProtocol', { tool: TOOL, protocol: 'openai' }))
      }
    }

    // `opencode mcp add` only asks interactively, so each entry is written directly; an unchanged one is a no-op.
    for (const [name, server] of Object.entries(config.mcpServers)) {
      fileSteps.push(
        fileStep({ key: 'step.mcpAdd', params: { name } }, [{ path: ['mcp', name], value: opencodeMcpServer(server) }]),
      )
    }

    // A new file gets the schema link so editors can validate it.
    if (!file.data) fileSteps[0]?.edits.unshift({ path: ['$schema'], value: 'https://opencode.ai/config.json' })
    steps.push(...fileSteps)

    steps.push(...(await skillSteps(config.skills, ctx, { agent: TOOL, dir: join(configDir(ctx), 'skills') })))

    return { tool: TOOL, steps, notices }
  },

  planUpdate(status) {
    if (!status.installed) {
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    }
    // `opencode upgrade` detects how it was installed (npm, script, brew, ...) and updates the same way.
    return { tool: TOOL, steps: [selfUpdateStep(TOOL, status, ['upgrade'])], notices: [] }
  },
}
