import { join } from 'pathe'

import type { CommandStep, Notice, PlanStep } from '../plan/types'
import type { McpServer } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import { detectCommand, envPath, notice, selfUpdateStep, skillSteps } from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'cursor' as const

/**
 * Where the official installer leaves the `cursor-agent` launcher. It is only on PATH
 * for new shells, so a fresh install is called through this path.
 */
function nativeBinary(ctx: AdapterContext): string {
  if (ctx.platform === 'win32') {
    const localAppData = envPath(ctx, 'LOCALAPPDATA') ?? join(ctx.home, 'AppData', 'Local')
    return join(localAppData, 'cursor-agent', 'cursor-agent.cmd')
  }
  return join(ctx.home, '.local', 'bin', 'cursor-agent')
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
        "irm 'https://cursor.com/install?win32=true' | iex",
      ],
    }
  }
  return {
    kind: 'command',
    title,
    command: 'bash',
    // pipefail: a failed download must fail the step, not run an empty script.
    args: ['-c', 'set -o pipefail; curl -fsS https://cursor.com/install | bash'],
  }
}

/** The CLI shares `~/.cursor/mcp.json` with the editor. */
function cursorDir(ctx: AdapterContext): string {
  return join(ctx.home, '.cursor')
}

/** Empty lists and records are left out; Cursor treats `args`, `env` and `headers` as optional. */
function filled<T extends object>(value: T): T | undefined {
  return Object.keys(value).length > 0 ? value : undefined
}

/** The server definition in the shape Cursor stores in `mcp.json`. */
function cursorMcpServer(server: McpServer): Record<string, unknown> {
  if (server.type === 'http') return { url: server.url, headers: filled(server.headers) }
  return { type: 'stdio', command: server.command, args: filled(server.args), env: filled(server.env) }
}

export const cursor: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  // `agent` is the newer name, but it is too generic to trust on PATH; the installer still creates `cursor-agent`.
  async detect(ctx) {
    return detectCommand(ctx, ['cursor-agent', nativeBinary(ctx)], nativeBinary(ctx))
  },

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []

    if (!status.installed) steps.push(installStep(ctx))

    // Cursor only serves its own models; there is no base URL or API key to point elsewhere.
    if (config.provider) notices.push(notice('info', 'notice.providerNotSupported', { tool: TOOL }))

    // The CLI has no command that adds a server, so entries are written to mcp.json directly.
    for (const [name, server] of Object.entries(config.mcpServers)) {
      steps.push({
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name } },
        path: join(cursorDir(ctx), 'mcp.json'),
        format: 'json',
        edits: [{ path: ['mcpServers', name], value: cursorMcpServer(server) }],
      })
    }

    steps.push(...(await skillSteps(config.skills, ctx, { agent: TOOL, dir: join(cursorDir(ctx), 'skills') })))

    return { tool: TOOL, steps, notices }
  },

  planUpdate(status) {
    if (!status.installed) {
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    }
    return { tool: TOOL, steps: [selfUpdateStep(TOOL, status, ['update'])], notices: [] }
  },
}
