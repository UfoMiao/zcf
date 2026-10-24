import { join } from 'pathe'

import { isTable, parseConfigText } from '../io/editors'
import type { CommandStep, KeyEdit, KeyPath, Notice, PlanStep } from '../plan/types'
import type { McpServer, Provider } from '../schema/config'
import { TOOL_NAMES } from '../schema/config'
import { expandHome, piAiRoute } from './pi-ai'
import { detectCommand, envPath, notice, sameJson, skillSteps } from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'dsh' as const
const PACKAGE = '@deepseek-ai/dsh'
/** The provider route ZCF owns in the pi-ai adapter's `providers`. */
const ROUTE = 'zcf'
/** dsh resolves `apiKeyEnv` from its credential store, the launch environment and `.env` files, `$DSH_HOME/.env` last. */
const KEY_VARIABLE = 'ZCF_API_KEY'
const MCP_PLUGIN = '@deepseek-ai/dsh-mcp-client'
const MCP_ID_PREFIX = 'zcf-mcp-'

/**
 * Packages in dsh whose install scripts it needs, such as node-pty's prebuilt binary. npm 12
 * blocks install scripts that are not allowed by name; older npm ignores the option.
 */
const ALLOWED_SCRIPTS = ['@deepseek-ai/dsh-subprocess-local', 'koffi', 'node-pty', 'protobufjs', '@google/genai']

/** dsh has no installer or updater of its own; both install the latest release from npm. */
function npmStep(key: 'step.install' | 'step.update', spec: string): CommandStep {
  return {
    kind: 'command',
    title: { key, params: { tool: TOOL } },
    command: 'npm',
    args: ['install', '-g', `--allow-scripts=${ALLOWED_SCRIPTS.join(',')}`, spec],
  }
}

/** DeepSeek Harness keeps its data in `DSH_HOME`, by default `~/.dsh`. */
function dshHome(ctx: AdapterContext): string {
  const home = envPath(ctx, 'DSH_HOME')
  return home ? expandHome(ctx, home) : join(ctx.home, '.dsh')
}

type Entry = Record<string, unknown>

/**
 * The home patch layer, `$DSH_HOME/cordis.patch.yml`, applies to every profile. It is a list of
 * patches: `{ id, config }` replaces the config of the plugin entry with that id, and
 * `{ insert: [...] }` adds plugin entries. dsh has no command that edits it.
 */
class PatchList {
  readonly edits: KeyEdit[] = []
  private readonly entries: Entry[]
  private next: number

  constructor(entries: readonly unknown[]) {
    // Anything that is not a patch keeps its place, so indexes still match the file.
    this.entries = entries.map(entry => (isTable(entry) ? entry : {}))
    this.next = entries.length
  }

  /** The index of the patch for plugin entry `id`. */
  find(id: string): number {
    return this.entries.findIndex(entry => entry.id === id && !('insert' in entry))
  }

  /** An entry inserted by an earlier run, and the key path of its config. */
  findInserted(id: string): { entry: Entry; configPath: KeyPath } | undefined {
    for (const [index, patch] of this.entries.entries()) {
      const items: unknown[] = Array.isArray(patch.insert) ? patch.insert : []
      const position = items.findIndex(item => isTable(item) && item.id === id)
      const entry = items[position]
      if (isTable(entry)) return { entry, configPath: [index, 'insert', position, 'config'] }
    }
    return undefined
  }

  /**
   * Set `values` in the config of the patch for `id`, keeping its other keys. A missing patch, or
   * one whose config is a `!!js` expression, gets `whole` as its config instead.
   */
  setConfig(id: string, values: [KeyPath, unknown][], whole: Entry): void {
    const index = this.find(id)
    if (index < 0) return this.append({ id, config: whole })
    const { config } = this.entries[index]!
    if (config !== undefined && !isTable(config)) {
      this.edits.push({ path: [index, 'config'], value: whole })
      return
    }
    for (const [path, value] of values) this.edits.push({ path: [index, 'config', ...path], value })
  }

  append(entry: Entry): void {
    this.edits.push({ path: [this.next++], value: entry })
  }
}

function dshRoute(provider: Provider): { route?: Entry; model?: string; notices: Notice[] } {
  const found = piAiRoute(provider, TOOL)
  if ('notice' in found) return { notices: [found.notice] }

  const { route } = found
  return {
    route: {
      displayName: provider.name,
      apiKeyEnv: KEY_VARIABLE,
      api: route.api,
      baseURL: route.baseUrl,
      // pi-ai's Anthropic client sends `x-api-key`; a gateway that wants a bearer token gets it as a header.
      ...(route.bearer ? { headers: { Authorization: `Bearer ${provider.apiKey}` } } : {}),
      models: [{ id: route.model }],
    },
    model: route.model,
    notices: [],
  }
}

/** One `dsh-mcp-client` entry per server, in the shape dsh documents. */
function dshMcpConfig(name: string, server: McpServer): Entry {
  if (server.type === 'http') {
    return {
      serverName: name,
      transport: 'streamable-http',
      url: server.url,
      ...(Object.keys(server.headers).length > 0 ? { headers: server.headers } : {}),
    }
  }
  // dsh spawns stdio servers through the MCP SDK's cross-spawn, so Windows `.cmd` shims need no `cmd /c`.
  return {
    serverName: name,
    transport: 'stdio',
    command: server.command,
    args: server.args,
    ...(Object.keys(server.env).length > 0 ? { env: server.env } : {}),
  }
}

function addMcpServers(patches: PatchList, servers: Record<string, McpServer>): void {
  const added: Entry[] = []
  for (const [name, server] of Object.entries(servers)) {
    const id = `${MCP_ID_PREFIX}${name}`
    const config = dshMcpConfig(name, server)
    const found = patches.findInserted(id)
    if (!found) {
      added.push({ id, name: MCP_PLUGIN, config })
      continue
    }
    if (!sameJson(found.entry.config, config)) patches.edits.push({ path: found.configPath, value: config })
  }
  if (added.length > 0) patches.append({ insert: added })
}

export const dsh: ToolAdapter = {
  id: TOOL,
  displayName: TOOL_NAMES[TOOL],

  detect: ctx => detectCommand(ctx, ['dsh']),

  async plan(config, status, ctx) {
    const steps: PlanStep[] = []
    const notices: Notice[] = []
    const home = dshHome(ctx)
    const patchFile = join(home, 'cordis.patch.yml')

    if (!status.installed) steps.push(npmStep('step.install', PACKAGE))

    const data = await parseConfigText('yaml', await ctx.readFile(patchFile))
    const patches = new PatchList(Array.isArray(data) ? data : [])

    if (config.provider) {
      const { route, model, notices: routeNotices } = dshRoute(config.provider)
      notices.push(...routeNotices)
      if (route && model) {
        steps.push({
          kind: 'file',
          title: { key: 'step.provider', params: { tool: TOOL, provider: config.provider.name } },
          path: join(home, '.env'),
          format: 'env',
          edits: [{ path: [KEY_VARIABLE], value: config.provider.apiKey }],
        })
        // A patch replaces the plugin's whole config, so ZCF edits only its own route and keeps the others.
        patches.setConfig('llm-pi-ai', [[['providers', ROUTE], route]], { providers: { [ROUTE]: route } })
        patches.setConfig(
          'agent-default-model',
          [
            [['provider'], ROUTE],
            [['model'], model],
          ],
          { provider: ROUTE, model },
        )
      }
    }

    addMcpServers(patches, config.mcpServers)

    if (patches.edits.length > 0) {
      // One step for the whole file: the edits address patches by index, so they must apply together.
      steps.push({
        kind: 'file',
        title: { key: 'step.writeConfig', params: { file: 'cordis.patch.yml' } },
        path: patchFile,
        format: 'yaml',
        edits: patches.edits,
      })
    }

    // dsh reads `~/.agents/skills`, where the `skills` CLI installs for its `universal` agent.
    steps.push(
      ...(await skillSteps(config.skills, ctx, { agent: 'universal', dir: join(ctx.home, '.agents', 'skills') })),
    )

    return { tool: TOOL, steps, notices }
  },

  planUpdate(status) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    return { tool: TOOL, steps: [npmStep('step.update', `${PACKAGE}@latest`)], notices: [] }
  },
}
