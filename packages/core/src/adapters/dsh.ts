import { join } from 'pathe'

import { isTable, JsExpression, parseConfigText, QuotedString } from '../io/editors'
import type { CommandStep, KeyEdit, KeyPath, Notice, PlanStep } from '../plan/types'
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
  skillSteps,
} from './shared'
import type { AdapterContext, ToolAdapter } from './types'

const TOOL = 'dsh' as const
const PACKAGE = '@deepseek-ai/dsh'
/** The provider route ZCF owns in the pi-ai adapter's `providers`. */
const ROUTE = 'zcf'
/** dsh resolves `apiKeyEnv` from its credential store, the launch environment and `.env` files, `$DSH_HOME/.env` last. */
const KEY_VARIABLE = 'ZCF_API_KEY'
const MCP_PLUGIN = '@deepseek-ai/dsh-mcp-client'
const MCP_ID_PREFIX = 'zcf-mcp-'
/** `dsh-mcp-client` takes server names of 1 to 32 letters, digits, `_` and `-`. */
const MCP_NAME_MAX = 32
const PATCH_FILE = 'cordis.patch.yml'

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

/** `value` under `path`, as nested tables. */
function nest(path: KeyPath, value: unknown): unknown {
  return path.reduceRight<unknown>((inner, key) => ({ [key]: inner }), value)
}

function valueAt(config: Entry, path: KeyPath): unknown {
  return path.reduce<unknown>((value, key) => (isTable(value) ? value[key] : undefined), config)
}

/**
 * The edit that sets `path` in `config` to `value`. A key on the way that holds no table, such
 * as an empty `providers:` or a `!!js` expression, is replaced by one.
 */
function editWithin(config: Entry, path: KeyPath, value: unknown): { path: KeyPath; value: unknown } {
  let table = config
  for (const [depth, key] of path.slice(0, -1).entries()) {
    const next = table[key]
    if (!isTable(next)) return { path: path.slice(0, depth + 1), value: nest(path.slice(depth + 1), value) }
    table = next
  }
  return { path, value }
}

/**
 * The home patch layer, `$DSH_HOME/cordis.patch.yml`, applies to every profile, after the
 * profile's own patch layer. It is a list of patches: `{ id, config }` replaces the whole config
 * of the plugin entry with that id, and `{ insert: [...] }` adds plugin entries. dsh has no
 * command that edits it.
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

  /** The index of the patch for plugin entry `id`; when there are several, dsh applies the last. */
  find(id: string): number {
    return this.entries.findLastIndex(entry => entry.id === id && !('insert' in entry))
  }

  /** An entry inserted by an earlier run, and the key path of its config. */
  findInserted(id: string): { entry: Entry; configPath: KeyPath } | undefined {
    // The last one, as for patches.
    for (const [index, patch] of [...this.entries.entries()].toReversed()) {
      const items: unknown[] = Array.isArray(patch.insert) ? patch.insert : []
      const position = items.findLastIndex(item => isTable(item) && item.id === id)
      const entry = items[position]
      if (isTable(entry)) return { entry, configPath: [index, 'insert', position, 'config'] }
    }
    return undefined
  }

  /**
   * Set `values` in the config of the patch for `id`, keeping its other keys. A missing patch, or
   * one whose config is a `!!js` expression, gets `whole` as its config instead.
   * @returns Whether the patch is new.
   */
  setConfig(id: string, values: [KeyPath, unknown][], whole: Entry): boolean {
    const index = this.find(id)
    if (index < 0) {
      this.append({ id, config: whole })
      return true
    }
    const { config } = this.entries[index]!
    if (!isTable(config)) {
      this.edits.push({ path: [index, 'config'], value: whole })
      return false
    }
    for (const [path, value] of values) {
      const edit = editWithin(config, path, value)
      if (!sameJson(valueAt(config, edit.path), edit.value))
        this.edits.push({ path: [index, 'config', ...edit.path], value: edit.value })
    }
    return false
  }

  append(entry: Entry): void {
    this.edits.push({ path: [this.next++], value: entry })
  }
}

function dshRoute(provider: Provider): { route?: Entry; model?: string; notices: Notice[] } {
  // dsh-llm-pi-ai serves the OpenAI and Anthropic protocols, not pi-ai's Gemini one.
  const found = piAiRoute(provider, TOOL, ['anthropic', 'openai'])
  if ('notice' in found) return { notices: [found.notice] }

  const { route } = found
  return {
    route: {
      displayName: provider.name,
      apiKeyEnv: KEY_VARIABLE,
      api: route.api,
      baseURL: route.baseUrl,
      // pi-ai's Anthropic client sends `x-api-key`; a gateway that wants a bearer token gets it as a
      // header, read when dsh loads the file from the same variable dsh copies from its `.env`.
      ...(route.bearer
        ? { headers: { Authorization: new JsExpression(`\`Bearer \${process.env.${KEY_VARIABLE}}\``) } }
        : {}),
      models: [{ id: route.model }],
    },
    model: route.model,
    notices: [],
  }
}

const REFERENCE = /\$\{([A-Za-z_]\w*)\}/

/** `text` as part of a JavaScript template literal. */
function templateText(text: string): string {
  return text.replaceAll(/[\\`]|\$\{/g, match => `\\${match}`)
}

/**
 * A value with `${NAME}` references, as Claude Code and `.mcp.json` files use them, reads those
 * variables when dsh loads the file. dsh drops credential-like variables from the environment it
 * passes to stdio servers, so this is how such a server gets its token.
 */
function dshValue(value: string): string | JsExpression | QuotedString {
  // A short credential is masked in previews only when it is quoted.
  if (!REFERENCE.test(value)) return value.length < 4 ? new QuotedString(value) : value
  const parts = value.split(REFERENCE)
  const source = parts.map((part, index) => (index % 2 === 0 ? templateText(part) : `\${process.env.${part} ?? ''}`))
  return new JsExpression(`\`${source.join('')}\``)
}

function dshValues(values: Record<string, string>): Record<string, ReturnType<typeof dshValue>> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, dshValue(value)]))
}

/** One `dsh-mcp-client` entry per server, in the shape dsh documents. */
function dshMcpConfig(name: string, server: McpServer): Entry {
  if (server.type === 'http') {
    return {
      serverName: name,
      transport: 'streamable-http',
      url: server.url,
      ...(Object.keys(server.headers).length > 0 ? { headers: dshValues(server.headers) } : {}),
    }
  }
  // dsh spawns stdio servers through the MCP SDK's cross-spawn, so Windows `.cmd` shims need no `cmd /c`.
  return {
    serverName: name,
    transport: 'stdio',
    command: server.command,
    args: server.args,
    ...(Object.keys(server.env).length > 0 ? { env: dshValues(server.env) } : {}),
  }
}

function addMcpServers(patches: PatchList, servers: Record<string, McpServer>, notices: Notice[]): void {
  const added: Entry[] = []
  for (const [name, server] of Object.entries(servers)) {
    if (name.length > MCP_NAME_MAX) {
      notices.push(notice('warning', 'notice.mcpNameTooLong', { tool: TOOL, name, max: MCP_NAME_MAX }))
      continue
    }
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
    const patchFile = join(home, PATCH_FILE)

    if (!status.installed) steps.push(npmStep('step.install', PACKAGE))

    // dsh has no language setting of its own.
    notices.push(...languageNotice(TOOL, config.configLanguage))

    const data = await parseConfigText('yaml', await ctx.readFile(patchFile))
    const patches = new PatchList(Array.isArray(data) ? data : [])
    // dsh refuses a patch file that is not a list; ZCF leaves it for the user to fix.
    const usable = data === undefined || Array.isArray(data)
    if (!usable) notices.push(notice('warning', 'notice.fileNotList', { tool: TOOL, file: PATCH_FILE }))

    if (config.provider && usable) {
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
        // A patch replaces the plugin's whole config, so in a patch already in this file ZCF edits
        // only its own route and keeps the others.
        const added = [
          patches.setConfig('llm-pi-ai', [[['providers', ROUTE], route]], { providers: { [ROUTE]: route } }),
          patches.setConfig(
            'agent-default-model',
            [
              [['provider'], ROUTE],
              [['model'], model],
            ],
            { provider: ROUTE, model },
          ),
        ]
        // A new home patch hides what dsh's Models page saves in the profile's patch layer.
        if (added.includes(true)) notices.push(notice('info', 'notice.dshHomePatch', { tool: TOOL, file: PATCH_FILE }))
      }
    }

    if (usable) addMcpServers(patches, config.mcpServers, notices)

    if (patches.edits.length > 0) {
      // One step for the whole file: the edits address patches by index, so they must apply together.
      steps.push({
        kind: 'file',
        title: { key: 'step.writeConfig', params: { file: PATCH_FILE } },
        path: patchFile,
        format: 'yaml',
        edits: patches.edits,
      })
    }

    // dsh reads `~/.agents/skills`, where the `skills` CLI installs for its `universal` agent.
    steps.push(
      ...(await skillSteps(
        config.skills,
        ctx,
        { agent: 'universal', dir: join(ctx.home, '.agents', 'skills') },
        config.configLanguage,
      )),
    )

    return { tool: TOOL, steps, notices }
  },

  async planUpdate(status) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    return { tool: TOOL, steps: [npmStep('step.update', `${PACKAGE}@latest`)], notices: [] }
  },

  async planUninstall(status, ctx, _provider) {
    if (!status.installed)
      return { tool: TOOL, steps: [], notices: [notice('info', 'notice.notInstalled', { tool: TOOL })] }
    // dsh documents no uninstall; npm is the only channel it ships on.
    const { steps, notices } = await npmUninstallSteps(TOOL, PACKAGE, ctx)
    // The provider route ZCF wrote: its key in .env, and the route and default-model picks in
    // the home patch layer. The MCP entries ZCF inserted are shared config, so they stay.
    const home = dshHome(ctx)
    const envFile = join(home, '.env')
    if ((await ctx.readFile(envFile)) !== undefined)
      steps.push(cleanConfigStep(TOOL, envFile, 'env', [{ path: [KEY_VARIABLE], value: undefined }]))
    const patchFile = join(home, PATCH_FILE)
    const data = await parseConfigText('yaml', await ctx.readFile(patchFile))
    const patches = new PatchList(Array.isArray(data) ? data : [])
    const routePatch = patches.find('llm-pi-ai')
    const routeConfig = patchConfig(data, routePatch)
    const modelPatch = patches.find('agent-default-model')
    const modelConfig = patchConfig(data, modelPatch)
    const routeProviders = isTable(routeConfig?.providers) ? routeConfig.providers : undefined
    const edits: KeyEdit[] = []
    if (routePatch >= 0 && routeProviders && Object.hasOwn(routeProviders, ROUTE))
      edits.push({ path: [routePatch, 'config', 'providers', ROUTE], value: undefined })
    if (modelConfig?.provider === ROUTE) {
      edits.push({ path: [modelPatch, 'config', 'provider'], value: undefined })
      if (Object.hasOwn(modelConfig, 'model')) edits.push({ path: [modelPatch, 'config', 'model'], value: undefined })
    }
    if (edits.length > 0) steps.push(cleanConfigStep(TOOL, patchFile, 'yaml', edits))
    return { tool: TOOL, steps, notices }
  },
}

/** The config table of the patch at `index`, when the file holds one there. */
function patchConfig(data: unknown, index: number): Entry | undefined {
  const entry = Array.isArray(data) ? data[index] : undefined
  const config = isTable(entry) ? entry.config : undefined
  return isTable(config) ? config : undefined
}
