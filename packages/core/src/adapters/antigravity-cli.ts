import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { CommandStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import { detectCommand, envPath, languageNotice, notice, removeStep, sameJson, skillSteps } from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'antigravity-cli' as const
const SETTINGS_SHOWN = '~/.gemini/antigravity-cli/settings.json'

/** Where the official installer puts the `agy` binary on each platform. */
function binDir(ctx: AdapterContext): string {
  if (ctx.platform === 'win32') {
    const localAppData = envPath(ctx, 'LOCALAPPDATA') ?? join(ctx.home, 'AppData', 'Local')
    return join(localAppData, 'agy', 'bin')
  }
  return join(ctx.home, '.local', 'bin')
}

/** The installed binary. It is only on PATH for new shells, so a fresh install is called through this path. */
function nativeBinary(ctx: AdapterContext): string {
  return join(binDir(ctx), ctx.platform === 'win32' ? 'agy.exe' : 'agy')
}

function installStep(ctx: AdapterContext): CommandStep {
  const title = { key: 'step.install', params: { tool: TOOL } }
  if (ctx.platform === 'win32') {
    return {
      kind: 'command',
      title,
      command: 'powershell',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'irm https://antigravity.google/cli/install.ps1 | iex',
      ],
    }
  }
  return {
    kind: 'command',
    title,
    command: 'bash',
    // pipefail: a failed download must fail the step, not run an empty script.
    args: ['-c', 'set -o pipefail; curl -fsSL https://antigravity.google/cli/install.sh | bash'],
  }
}

/** Antigravity's own folder, shared by the CLI, the App and the IDE. No env var relocates it. */
function geminiDir(ctx: AdapterContext): string {
  return join(ctx.home, '.gemini')
}

/** Empty lists and records are left out; `args`, `env` and `headers` are optional. */
function filled<T extends object>(value: T): T | undefined {
  return Object.keys(value).length > 0 ? value : undefined
}

/**
 * The server in the shape `mcp_config.json` stores it: `command` for stdio, `serverUrl` for
 * Streamable HTTP. There is no `type` field, and the docs say `httpUrl` is not supported.
 */
function antigravityMcpServer(server: McpServer): Record<string, unknown> {
  if (server.type === 'http') return { serverUrl: server.url, headers: filled(server.headers) }
  return { command: server.command, args: filled(server.args), env: filled(server.env) }
}

/**
 * Edits that bring `mcpServers.<name>` in line. An entry with the same transport is edited
 * field by field, so keys ZCF does not manage (such as `disabled` or `enabledTools`) stay;
 * a new entry or a change of transport replaces it.
 */
function mcpEdits(name: string, server: McpServer, existing: unknown): KeyEdit[] {
  const desired = antigravityMcpServer(server)
  const servers = isTable(existing) ? existing.mcpServers : undefined
  const current = isTable(servers) ? servers[name] : undefined
  const sameTransport = isTable(current) && 'command' in current === 'command' in desired
  if (!sameTransport) return [{ path: ['mcpServers', name], value: desired }]
  // Equal fields are skipped: rewriting a list or record would reflow how the user laid it out.
  return Object.entries(desired)
    .filter(([key, value]) => !sameJson(current[key], value))
    .map(([key, value]) => ({ path: ['mcpServers', name, key], value }))
}

export const antigravityCli: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  detect: ctx => detectCommand(ctx, ['agy', nativeBinary(ctx)], nativeBinary(ctx)),

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []

    if (!status.installed) steps.push(installStep(ctx))

    // The settings reference has no language key.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    // The CLI reads an API key only from GEMINI_API_KEY in its environment (no .env file), and
    // API-key mode also needs `modelProvider` in settings.json. Writing that setting without the
    // variable would break Google sign-in, so ZCF names the manual route instead of writing it.
    if (config.provider) {
      // The path is shown, not edited; `~` reads the same in every front end and shell.
      notices.push(notice('info', 'notice.providerEnvOnly', { tool: TOOL, file: SETTINGS_SHOWN }))
    }

    // There is no `agy mcp add`; the servers live in mcp_config.json, shared with the App and IDE.
    const mcpFile = join(geminiDir(ctx), 'config', 'mcp_config.json')
    const servers = Object.entries(config.mcpServers)
    const text = servers.length > 0 ? await ctx.readFile(mcpFile) : undefined
    const existing: unknown = text ? parse(text, [], { allowTrailingComma: true }) : undefined
    for (const [name, server] of servers) {
      const edits = mcpEdits(name, server, existing)
      if (edits.length === 0) continue
      steps.push({
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name } },
        path: mcpFile,
        format: 'json',
        edits,
      })
    }

    // The CLI reads global skills from ~/.gemini/config/skills, not the shared ~/.agents/skills.
    steps.push(
      ...(await skillSteps(
        config.skills,
        ctx,
        { agent: TOOL, dir: join(geminiDir(ctx), 'config', 'skills') },
        config.configLanguage,
      )),
    )

    return { tool: TOOL, steps, notices }
  },

  // The binary updates itself in the background; there is no update command, and the
  // installer only says so when the binary is already there.
  async planUpdate(status) {
    const key = status.installed ? 'notice.selfUpdates' : 'notice.notInstalled'
    return { tool: TOOL, steps: [], notices: [notice('info', key, { tool: TOOL })] }
  },

  async planUninstall(status, ctx, _provider) {
    if (!status.installed) {
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    }
    // No uninstall command exists; the installer only placed the binary. ~/.gemini stays: the
    // App, the IDE and Gemini CLI share it, and ZCF writes no provider there.
    const path = ctx.platform === 'win32' ? binDir(ctx) : nativeBinary(ctx)
    return { tool: TOOL, steps: [removeStep(TOOL, path)], notices: [] }
  },
}
