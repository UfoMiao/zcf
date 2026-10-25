import { join } from 'pathe'

import { isTable, parseConfigText } from '../io/editors'
import type { KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider } from '../schema/config'
import { protocolModel, TOOL_NAMES } from '../schema/config'
import {
  detectCommand,
  envPath,
  languageNotice,
  notice,
  npmInstallStep,
  npmUpdateStep,
  sameJson,
  skillSteps,
} from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'gemini-cli' as const
const PACKAGE = '@google/gemini-cli'

/** Gemini CLI uses `GEMINI_CLI_HOME` in place of the home folder when it is set. */
function geminiDir(ctx: AdapterContext): string {
  return join(envPath(ctx, 'GEMINI_CLI_HOME') ?? ctx.home, '.gemini')
}

/**
 * The key and endpoint go in ~/.gemini/.env, since settings.json has no place for
 * them. Auth is `gemini-api-key` either way: it honours `GOOGLE_GEMINI_BASE_URL`, and
 * the interactive CLI rejects a `gateway` selection. The model goes in settings.json,
 * where `/model` also writes it, so a `GEMINI_MODEL` left in .env would override it.
 */
export function providerEdits(provider: Provider): { env: KeyEdit[]; settings: KeyEdit[] } {
  const { baseUrl } = provider.gemini!
  const model = protocolModel(provider, 'gemini')
  const env: KeyEdit[] = [
    { path: ['GEMINI_API_KEY'], value: provider.apiKey },
    { path: ['GOOGLE_GEMINI_BASE_URL'], value: baseUrl },
  ]
  const settings: KeyEdit[] = [{ path: ['security', 'auth', 'selectedType'], value: 'gemini-api-key' }]
  if (model) {
    env.push({ path: ['GEMINI_MODEL'], value: undefined })
    settings.push({ path: ['model', 'name'], value: model })
  }
  return { env, settings }
}

/** The fields of an MCP server that ZCF compares, in the shape Gemini CLI stores them. */
function comparable(value: unknown): unknown {
  if (!isTable(value)) return value
  // `httpUrl` is the older spelling of an HTTP server.
  const url = value.httpUrl ?? (value.type === 'http' ? value.url : undefined)
  if (url !== undefined) return { url, headers: value.headers ?? {} }
  return { command: value.command, args: value.args ?? [], env: value.env ?? {} }
}

function desired(server: McpServer): unknown {
  return server.type === 'http'
    ? { url: server.url, headers: server.headers }
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

  const data = await parseConfigText('json', await ctx.readFile(file))
  const existing = isTable(data) && isTable(data.mcpServers) ? data.mcpServers : {}
  const steps: PlanStep[] = []
  for (const name of names) {
    const server = servers[name]!
    if (Object.hasOwn(existing, name) && sameJson(comparable(existing[name]), desired(server))) continue

    // `gemini mcp add` replaces a server with the same name. Without `-s user` it writes
    // to the current project. Arguments after `--` reach the server even when they look
    // like options, such as `npx -y`. Gemini CLI starts `.cmd` shims itself on Windows.
    const target =
      server.type === 'http'
        ? ['-t', 'http', name, server.url]
        : [name, server.command, ...(server.args.length > 0 ? ['--', ...server.args] : [])]
    steps.push({
      kind: 'command',
      title: { key: 'step.mcpAdd', params: { name } },
      command,
      args: ['mcp', 'add', '-s', 'user', ...target],
      touches: [file],
    })
    // `gemini mcp add -e` cuts a value at its second `=` and drops empty ones, so env
    // and headers are written to the file. This also keeps them out of the process list.
    const secrets = server.type === 'http' ? server.headers : server.env
    if (Object.keys(secrets).length > 0) {
      steps.push({
        kind: 'file',
        title: { key: server.type === 'http' ? 'step.mcpHeaders' : 'step.mcpEnv', params: { name } },
        path: file,
        format: 'json',
        edits: [{ path: ['mcpServers', name, server.type === 'http' ? 'headers' : 'env'], value: secrets }],
      })
    }
  }
  return steps
}

export const geminiCli: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  detect: ctx => detectCommand(ctx, ['gemini']),

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []
    const settingsFile = join(geminiDir(ctx), 'settings.json')

    // Gemini CLI has no language setting of its own; the docs point at GEMINI.md instructions instead.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    if (!status.installed) steps.push(npmInstallStep(TOOL, PACKAGE))

    const { provider } = config
    if (provider) {
      if (provider.gemini) {
        const edits = providerEdits(provider)
        const title = { key: 'step.provider', params: { tool: TOOL, provider: provider.name } }
        steps.push(
          { kind: 'file', title, path: join(geminiDir(ctx), '.env'), format: 'env', edits: edits.env },
          { kind: 'file', title, path: settingsFile, format: 'json', edits: edits.settings },
        )
      } else {
        notices.push(notice('warning', 'notice.providerMissingProtocol', { tool: TOOL, protocol: 'gemini' }))
      }
    }

    steps.push(...(await mcpSteps(config.mcpServers, status.command, ctx, settingsFile)))
    // The skills CLI installs Gemini CLI's global skills into the shared ~/.agents/skills.
    steps.push(...(await skillSteps(config.skills, ctx, { agent: TOOL, dir: join(ctx.home, '.agents', 'skills') })))

    return { tool: TOOL, steps, notices }
  },

  // Gemini CLI has no update command; npm is how it is installed.
  planUpdate(status) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    return { tool: TOOL, steps: [npmUpdateStep(TOOL, PACKAGE)], notices: [] }
  },
}
