import { join } from 'pathe'

import { isTable, parseConfigText } from '../io/editors'
import type { KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider } from '../schema/config'
import { protocolModel, TOOL_NAMES } from '../schema/config'
import {
  cleanConfigStep,
  detectCommand,
  envPath,
  languageNotice,
  notice,
  npmInstallStep,
  npmUninstallSteps,
  sameJson,
  selfUpdateSteps,
  skillSteps,
} from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'codex' as const
const PACKAGE = '@openai/codex'
/** The `model_providers` entry ZCF owns in config.toml. */
const PROVIDER_ID = 'zcf'

function configFile(ctx: AdapterContext): string {
  return join(envPath(ctx, 'CODEX_HOME') ?? join(ctx.home, '.codex'), 'config.toml')
}

/**
 * Point Codex at the provider. The key goes in `experimental_bearer_token`, so
 * auth.json (and a ChatGPT login stored there) is left alone.
 */
export function providerEdits(provider: Provider, model: string | undefined): KeyEdit[] {
  const edits: KeyEdit[] = [
    { path: ['model_provider'], value: PROVIDER_ID },
    {
      path: ['model_providers', PROVIDER_ID],
      value: {
        name: provider.name,
        base_url: provider.openai!.baseUrl,
        wire_api: 'responses',
        experimental_bearer_token: provider.apiKey,
      },
    },
  ]
  if (model) edits.push({ path: ['model'], value: model })
  return edits
}

/** The fields of an MCP server that ZCF compares, in the shape Codex stores them. */
function comparable(value: unknown): unknown {
  if (!isTable(value)) return value
  if (typeof value.url === 'string') return { url: value.url, http_headers: value.http_headers ?? {} }
  return { command: value.command, args: value.args ?? [], env: value.env ?? {} }
}

function desired(server: McpServer): unknown {
  return server.type === 'http'
    ? { url: server.url, http_headers: server.headers }
    : { command: server.command, args: server.args, env: server.env }
}

async function mcpSteps(
  servers: Record<string, McpServer>,
  command: string,
  ctx: AdapterContext,
  file: string,
): Promise<PlanStep[]> {
  const names = Object.keys(servers)
  if (names.length === 0) return []

  const data = await parseConfigText('toml', await ctx.readFile(file))
  const existing = isTable(data) && isTable(data.mcp_servers) ? data.mcp_servers : {}
  const steps: PlanStep[] = []
  for (const name of names) {
    const server = servers[name]!
    if (Object.hasOwn(existing, name) && sameJson(comparable(existing[name]), desired(server))) continue

    // `codex mcp add` replaces a server with the same name, so a changed one needs no remove first.
    // Codex resolves `.cmd` shims such as npx itself on Windows, so commands are passed as they are.
    const target =
      server.type === 'http'
        ? ['--url', server.url]
        : [
            ...Object.entries(server.env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
            '--',
            server.command,
            ...server.args,
          ]
    steps.push({
      kind: 'command',
      title: { key: 'step.mcpAdd', params: { name } },
      command,
      args: ['mcp', 'add', name, ...target],
      touches: [file],
    })
    // `codex mcp add` has no flag for HTTP headers.
    if (server.type === 'http' && Object.keys(server.headers).length > 0) {
      steps.push({
        kind: 'file',
        title: { key: 'step.mcpHeaders', params: { name } },
        path: file,
        format: 'toml',
        edits: [{ path: ['mcp_servers', name, 'http_headers'], value: server.headers }],
      })
    }
  }
  return steps
}

export const codex: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  detect: ctx => detectCommand(ctx, ['codex']),

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []
    const file = configFile(ctx)

    // Codex has no language setting of its own; only an instruction string, which is the user's to fill.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    if (!status.installed) steps.push(npmInstallStep(TOOL, PACKAGE))

    const { provider } = config
    if (provider) {
      if (provider.openai) {
        const model = protocolModel(provider, 'openai')
        if (!model) notices.push(notice('warning', 'notice.modelMissing', { tool: TOOL, protocol: 'openai' }))
        steps.push({
          kind: 'file',
          title: { key: 'step.provider', params: { tool: TOOL, provider: provider.name } },
          path: file,
          format: 'toml',
          edits: providerEdits(provider, model),
        })
      } else {
        notices.push(notice('warning', 'notice.providerMissingProtocol', { tool: TOOL, protocol: 'openai' }))
      }
    }

    steps.push(...(await mcpSteps(config.mcpServers, status.command, ctx, file)))
    // The skills CLI installs Codex skills into the shared ~/.agents/skills folder, which Codex reads.
    steps.push(
      ...(await skillSteps(
        config.skills,
        ctx,
        { agent: TOOL, dir: join(ctx.home, '.agents', 'skills') },
        config.configLanguage,
      )),
    )

    return { tool: TOOL, steps, notices }
  },

  async planUpdate(status, ctx) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    return {
      tool: TOOL,
      steps: await selfUpdateSteps(TOOL, status, ['update'], PACKAGE, ctx),
      notices: [],
    }
  },

  async planUninstall(status, ctx, _provider) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    // The standalone install has no uninstaller of its own; its launcher and the packages
    // folder under CODEX_HOME are what the install script put in place.
    const { steps, notices } = await npmUninstallSteps(TOOL, PACKAGE, ctx, [
      join(ctx.home, '.local', 'bin', ctx.platform === 'win32' ? 'codex.exe' : 'codex'),
      join(envPath(ctx, 'CODEX_HOME') ?? join(ctx.home, '.codex'), 'packages', 'standalone'),
    ])
    // The provider route ZCF wrote: its own entry under `model_providers`, and a `model_provider`
    // pick that points at it. A `model` of the user's own stays.
    const file = configFile(ctx)
    const data = await parseConfigText('toml', await ctx.readFile(file))
    const table: Record<string, unknown> = isTable(data) ? data : {}
    const edits: KeyEdit[] = []
    if (isTable(table.model_providers) && Object.hasOwn(table.model_providers, PROVIDER_ID))
      edits.push({ path: ['model_providers', PROVIDER_ID], value: undefined })
    if (table.model_provider === PROVIDER_ID) edits.push({ path: ['model_provider'], value: undefined })
    if (edits.length > 0) steps.push(cleanConfigStep(TOOL, file, 'toml', edits))
    return { tool: TOOL, steps, notices }
  },
}
