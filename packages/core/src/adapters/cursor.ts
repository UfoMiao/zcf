import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { isTable } from '../io/editors'
import type { CommandStep, KeyEdit, Notice, PlanStep } from '../plan/types'
import type { McpServer } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import {
  detectCommand,
  envPath,
  languageNotice,
  notice,
  removeStep,
  sameJson,
  selfUpdateStep,
  skillSteps,
} from './shared'
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

/**
 * Edits that bring `mcpServers.<name>` in line. An entry with the same transport (a command or a URL)
 * is edited field by field, so settings ZCF does not manage (such as `envFile` or `auth`) stay; a new
 * entry or a change of transport replaces it.
 */
function mcpEdits(name: string, server: McpServer, existing: unknown): KeyEdit[] {
  const desired = cursorMcpServer(server)
  const servers = isTable(existing) ? existing.mcpServers : undefined
  const current = isTable(servers) ? servers[name] : undefined
  const sameTransport = isTable(current) && 'command' in current === 'command' in desired
  if (!sameTransport) return [{ path: ['mcpServers', name], value: desired }]
  // Equal fields are skipped: rewriting a list or record would reflow how the user laid it out.
  return Object.entries(desired)
    .filter(([key, value]) => !sameJson(current[key], value))
    .map(([key, value]) => ({ path: ['mcpServers', name, key], value }))
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

    // Cursor has no language setting of its own; the docs point at rules files instead.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    // Cursor only serves its own models; there is no base URL or API key to point elsewhere.
    if (config.provider) notices.push(notice('info', 'notice.providerNotSupported', { tool: TOOL }))

    // The CLI has no command that adds a server, so entries are written to mcp.json directly.
    const mcpFile = join(cursorDir(ctx), 'mcp.json')
    const servers = Object.entries(config.mcpServers)
    const text = servers.length > 0 ? await ctx.readFile(mcpFile) : undefined
    const existing: unknown = text ? parse(text, [], { allowTrailingComma: true }) : undefined
    for (const [name, server] of servers) {
      steps.push({
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name } },
        path: mcpFile,
        format: 'json',
        edits: mcpEdits(name, server, existing),
      })
    }

    // The skills CLI installs Cursor's global skills into the shared ~/.agents/skills.
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

  // Cursor CLI keeps itself updated; there is no npm package to fall back to.
  async planUpdate(status) {
    if (!status.installed) {
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    }
    return { tool: TOOL, steps: [selfUpdateStep(TOOL, status, ['update'])], notices: [] }
  },

  async planUninstall(status, ctx, _provider) {
    if (!status.installed) {
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    }
    // No uninstall command and no npm package; the install put the launcher (and its versions
    // folder next to it) in place, so deleting them is the whole uninstall.
    const paths =
      ctx.platform === 'win32'
        ? [join(envPath(ctx, 'LOCALAPPDATA') ?? join(ctx.home, 'AppData', 'Local'), 'cursor-agent')]
        : [join(ctx.home, '.local', 'bin', 'cursor-agent'), join(ctx.home, '.local', 'share', 'cursor-agent')]
    // Cursor has no provider route, and its MCP servers live in mcp.json shared with the
    // editor, so there is nothing ZCF owns to take out.
    return { tool: TOOL, steps: paths.map(path => removeStep(TOOL, path)), notices: [] }
  },
}
