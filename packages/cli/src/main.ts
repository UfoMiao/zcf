import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type {
  AdapterContext,
  ConfigIssue,
  FilePreview,
  KeyEdit,
  Mirror,
  Plan,
  PlanStep,
  ToolId,
  ToolResult,
  ZcfConfig,
} from '@zcf/core'
import {
  applyPlan,
  applyPreset,
  BackupRun,
  BUILTIN_AGENT_IDS,
  BUILTIN_SKILLS_SOURCE,
  BUILTIN_STYLE_IDS,
  type BuiltinStyleId,
  createContext,
  defaultConfigPath,
  detectTools,
  editJson,
  envMirror,
  FileSyntaxError,
  isTable,
  listBackups,
  loadConfigFile,
  MAGPIE_FACES,
  type MagpieFace,
  MIRRORS,
  mirrorEnv,
  MessageError,
  parseBackupKeep,
  parseConfigText,
  parseMirrorName,
  parseZcfConfig,
  planTools,
  planUninstalls,
  planUpdates,
  previewPlan,
  isToolId,
  pruneBackups,
  pruneDoomed,
  readTextIfExists,
  resolveMirror,
  restoreBackup,
  ACTOR_NAMES,
  SKILLS_CATALOG,
  TOOL_IDS,
  TOOL_NAMES,
  writeFileAtomic,
} from '@zcf/core'
import { dim, green, yellow } from 'ansis'
import { cac } from 'cac'
import { join, resolve } from 'pathe'

import { version } from '../package.json'
import type { Translate } from './i18n'
import { createTranslator, detectLang, errorText, isLang, isLangPinned, langFlag } from './i18n'
import type { Output } from './render'
import { collectSecrets, hasWork, Renderer, tildify } from './render'
import { backupFolder, backupsRoot, createLocalService, loadPresetsFor } from './service'

export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_INVALID_CONFIG = 2

/** What `zcf ccu` runs its passthrough with: the events the command waits for, nothing more. */
export interface PassthroughChild {
  once(event: 'error', listener: (error: Error) => void): unknown
  once(event: 'close', listener: (code: number | null) => void): unknown
}

export interface MainOptions {
  stdout?: Output
  stderr?: Output
  context?: Partial<AdapterContext>
  now?: () => Date
  /** Whether stdin and stdout are a terminal, so the interactive UI can run. */
  interactive?: boolean
  /** Resolves to stop a long-running command such as `zcf ui`; Ctrl+C by default. */
  stop?: Promise<unknown>
  /** Where the built web UI lives; found next to the CLI by default. */
  webRoot?: string
  /** Starts the browser; by default a detached process, so it never keeps ZCF running. */
  openUrl?: (command: string, args: string[]) => void
  /** Loads the provider presets for `zcf init --preset`; tests inject one so nothing touches the network. */
  fetch?: typeof globalThis.fetch
  /** Starts `zcf ccu`'s child; tests inject a fake instead of a real interactive spawn. */
  passthrough?: (command: string, args: readonly string[]) => PassthroughChild
}

interface CommandFlags {
  file?: string
  tools?: string
  yes?: boolean
  mirror?: string
  port?: string | number
  open?: boolean
  keep?: string | number
  preset?: string | number
  apiKey?: string | number
  skills?: string
  agents?: string
  styles?: string
  defaultStyle?: string
  extras?: string
}

async function openDetached(command: string, args: string[]): Promise<void> {
  const { spawn } = await import('node:child_process')
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => undefined)
  child.unref()
}

function parsePort(value: string | number | undefined, t: Translate): number | undefined {
  if (value === undefined) return undefined
  const port = Number(value)
  if (String(value).trim() === '' || !Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new CliError(t('cli.invalidPort', { port: String(value) }), EXIT_ERROR)
  }
  return port
}

/** How many backup runs `zcf backup prune` keeps; a whole, non-negative count. */
function parseKeep(value: string | number | undefined, t: Translate): number {
  const keep = parseBackupKeep(value)
  if (keep === undefined) throw new CliError(t('cli.backup.badKeep', { keep: String(value) }), EXIT_ERROR)
  return keep
}

/** The command that opens a URL in the default browser. */
function openCommand(platform: NodeJS.Platform, url: string): [string, string[]] {
  if (platform === 'darwin') return ['open', [url]]
  // `start` would need cmd.exe quoting; the URL handler takes the URL as one argument.
  if (platform === 'win32') return ['rundll32', ['url.dll,FileProtocolHandler', url]]
  return ['xdg-open', [url]]
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message)
  }
}

/** Split a comma-separated flag value into names; a bare flag, which cac hands over as a boolean, names nothing. */
function parseNames(value: unknown): string[] {
  if (value === undefined) return []
  return typeof value === 'string'
    ? value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
    : []
}

function parseTools(value: unknown, t: ReturnType<typeof createTranslator>): ToolId[] | undefined {
  if (value === undefined) return undefined
  const names = parseNames(value)
  const tools = names.filter(isToolId)
  const unknown = names.filter(tool => !isToolId(tool))
  if (unknown.length > 0) {
    throw new CliError(
      t('cli.unknownTools', {
        tools: unknown.join(', '),
        known: TOOL_IDS.join(', '),
      }),
      EXIT_ERROR,
    )
  }
  return tools
}

/**
 * A comma-separated flag whose values must all be known ids. Anything unknown fails before a
 * file is written, naming what may be picked instead.
 */
function parseKnownIds<T extends string>(value: unknown, known: readonly T[], t: Translate, key: string): T[] {
  const names = parseNames(value)
  const unknown = names.filter(name => !known.some(id => id === name))
  if (unknown.length > 0) throw new CliError(t(key, { list: unknown.join(', '), known: known.join(', ') }), EXIT_ERROR)
  return names.filter((name): name is T => known.some(id => id === name))
}

/** The extras `zcf init --extras` can name: magpie with the face it installs as (the app by default), or ccline. */
/** The names `zcf init --extras` takes: magpie with the face it installs as (the app by default), or ccline. */
const EXTRA_CHOICES = ['magpie', ...MAGPIE_FACES.map(face => `magpie:${face}`), 'ccline'] as const

function parseExtraPicks(value: unknown, t: Translate): { magpie?: MagpieFace; ccline?: boolean } {
  const picks: { magpie?: MagpieFace; ccline?: boolean } = {}
  for (const name of parseKnownIds(value, EXTRA_CHOICES, t, 'cli.init.unknownExtras')) {
    if (name === 'ccline') picks.ccline = true
    else picks.magpie = MAGPIE_FACES.find(face => name === `magpie:${face}`) ?? 'client'
  }
  return picks
}

/** The one style `--default-style` names; a list of them belongs to `--styles` instead. */
function parseDefaultStyle(value: unknown, t: Translate): BuiltinStyleId | undefined {
  if (value === undefined) return undefined
  if (parseNames(value).length > 1) throw new CliError(t('cli.init.oneStyle'), EXIT_ERROR)
  return parseKnownIds(value, BUILTIN_STYLE_IDS, t, 'cli.init.unknownStyles').at(0)
}

/**
 * The options `zcf init` takes besides `--file`, in help order. `key` is the flag's name on the
 * parsed command line, so this one table drives both the option list and the "was anything
 * asked" check; the global `-l, --lang` joins that check separately. How each flag's value
 * reaches the config stays in the action, beside the parsing it depends on.
 */
const INIT_OPTIONS = [
  { key: 'preset', option: '-p, --preset <id>', describe: (t: Translate) => t('cli.option.preset') },
  { key: 'apiKey', option: '-k, --api-key <key>', describe: (t: Translate) => t('cli.option.apiKey') },
  {
    key: 'tools',
    option: '-t, --tools <tools>',
    describe: (t: Translate) => t('cli.option.tools', { tools: TOOL_IDS.join(', ') }),
  },
  { key: 'skills', option: '--skills <skills>', describe: (t: Translate) => t('cli.option.skills') },
  { key: 'agents', option: '--agents <agents>', describe: (t: Translate) => t('cli.option.agents') },
  { key: 'styles', option: '--styles <styles>', describe: (t: Translate) => t('cli.option.styles') },
  {
    key: 'defaultStyle',
    option: '--default-style <style>',
    describe: (t: Translate) => t('cli.option.defaultStyle'),
  },
  { key: 'extras', option: '--extras <extras>', describe: (t: Translate) => t('cli.option.extras') },
  {
    key: 'mirror',
    option: '-m, --mirror <mirror>',
    describe: (t: Translate) => t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }),
  },
  { key: 'yes', option: '-y, --yes', describe: (t: Translate) => t('cli.option.yes') },
] as const satisfies readonly {
  key: keyof CommandFlags
  option: string
  describe: (t: Translate) => string
}[]

/** The strings of a config array, so a flag's picks can merge with them without duplicating. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** `held` followed by the picks it does not already hold, so running init again adds without duplicating. */
function withPicks(held: unknown, picks: readonly string[]): string[] {
  const names = stringList(held)
  return [...names, ...picks.filter(pick => !names.includes(pick))]
}

/**
 * The `skills` sources after built-in picks merge into the `zcf` source, the way the Skills page
 * toggles them. A `zcf` source that names no skills installs them all, which no pick can add to.
 */
function withSkillPicks(sources: unknown, picks: readonly string[]): unknown[] {
  const held = Array.isArray(sources) ? sources.filter(isTable) : []
  const builtin = held.find(source => source.source === BUILTIN_SKILLS_SOURCE)
  if (builtin === undefined) return [...held, { source: BUILTIN_SKILLS_SOURCE, skills: [...picks] }]
  if (!Array.isArray(builtin.skills)) return held
  return held.map(source =>
    source === builtin ? Object.assign({}, source, { skills: withPicks(source.skills, picks) }) : source,
  )
}

/** The issues of an invalid config, one line each, translated; a whole-file issue has no field name. */
function configIssues(issues: readonly ConfigIssue[], translate: Translate): string[] {
  return issues.map(
    ({ path: field, message }) => `  - ${field ? `${field}: ` : ''}${translate(message.key, message.params)}`,
  )
}

function parseMirror(value: unknown, t: Translate): Mirror | undefined {
  if (value === undefined) return undefined
  const name = typeof value === 'string' ? value : ''
  const mirror = parseMirrorName(name)
  if (mirror) return mirror
  throw new CliError(t('cli.unknownMirror', { mirror: name, known: MIRRORS.join(', ') }), EXIT_ERROR)
}

/** A registry URL without credentials, path or query, which may hold a token. */
function registryOrigin(registry: string): string {
  try {
    return new URL(registry).origin
  } catch {
    return '***'
  }
}

/** cac only reports argument mistakes as English text, so match its messages and translate them. */
function argumentError(error: unknown, t: Translate): string | undefined {
  if (!(error instanceof Error) || error.name !== 'CACError') return undefined
  const unknown = /^Unknown option `(.+)`$/.exec(error.message)
  if (unknown) return t('cli.unknownOption', { option: unknown[1]! })
  const missing = /^option `(.+)` value is missing$/.exec(error.message)
  if (missing) return t('cli.optionValueMissing', { option: missing[1]! })
  const unused = /^Unused args: (.+)$/.exec(error.message)
  if (unused) return t('cli.unusedArgs', { args: unused[1]!.replaceAll('`', '') })
  return t('cli.badArguments', { message: error.message })
}

export async function main(argv: readonly string[], options: MainOptions = {}): Promise<number> {
  const stdout = options.stdout ?? {
    write: text => process.stdout.write(text),
  }
  const stderr = options.stderr ?? {
    write: text => process.stderr.write(text),
  }
  const lang = detectLang(argv)
  const t = createTranslator(lang)
  const ctx = createContext(options.context)
  const now = options.now ?? (() => new Date())
  const interactive = options.interactive ?? (process.stdin.isTTY && process.stdout.isTTY)

  async function runTuiCommand(file: string | undefined): Promise<number> {
    if (!interactive) throw new CliError(t('cli.tuiNeedsTerminal'), EXIT_ERROR)
    const path = file ? resolve(file) : defaultConfigPath(ctx.home)
    const { runTui } = await import('./tui/run')
    await runTui(createLocalService(ctx, path, now), lang, ctx.home, isLangPinned(argv))
    return EXIT_OK
  }

  const configPath = (file: string | undefined) => (file ? resolve(file) : defaultConfigPath(ctx.home))

  /** The issues of an invalid config, one line each, translated; a whole-file issue has no field name. */
  async function loadConfig(file: string | undefined): Promise<ZcfConfig> {
    const path = configPath(file)
    const result = await loadConfigFile(path)
    if (result.success) return result.config
    if ('missing' in result) throw new CliError(t('cli.configMissing', { path }), EXIT_INVALID_CONFIG)
    throw new CliError(
      [t('cli.configInvalid', { path }), ...configIssues(result.issues, t)].join('\n'),
      EXIT_INVALID_CONFIG,
    )
  }

  async function preparePlan(
    flags: CommandFlags,
  ): Promise<{ config: ZcfConfig; plan: Plan; previews: Map<PlanStep, FilePreview>; renderer: Renderer }> {
    const config = await loadConfig(flags.file)
    const tools = parseTools(flags.tools, t) ?? config.tools
    if (tools.length === 0) throw new CliError(t('cli.noTools'), EXIT_ERROR)

    const override = parseMirror(flags.mirror, t)
    const plan = await planTools(config, { ...ctx, mirror: override }, tools)
    const previews = await previewPlan(plan, ctx.readFile)
    const fileSecrets = [...previews.values()].flatMap(preview => preview.secrets)
    const renderer = new Renderer(stdout, t, collectSecrets(config, fileSecrets), ctx.home)
    showMirror(renderer, resolveMirror({ override, env: ctx.env, config }))
    return { config, plan, previews, renderer }
  }

  /** A misspelled ZCF_MIRROR would otherwise be ignored without a word. */
  function warnUnknownEnvMirror(renderer: Renderer): void {
    const value = ctx.env.ZCF_MIRROR?.trim()
    if (value && !envMirror(ctx.env))
      renderer.line(yellow(t('cli.unknownEnvMirror', { value, known: MIRRORS.join(', ') })))
  }

  /**
   * Say so when downloads go through a mirror. The registry shown is the user's own when they set
   * `npm_config_registry`; a registry in `.npmrc` gives way to the mirror they chose.
   */
  function showMirror(renderer: Renderer, mirror: Mirror): void {
    warnUnknownEnvMirror(renderer)
    if (mirror === 'official') return
    const registry =
      mirrorEnv(mirror, ctx.env).npm_config_registry ??
      Object.entries(ctx.env).find(([key]) => key.toLowerCase() === 'npm_config_registry')?.[1]
    renderer.line(dim(t('cli.mirrorInUse', { registry: registryOrigin(registry ?? '') })))
    renderer.line()
  }

  /**
   * Apply a plan, showing each step as it ends. With `settle`, which may restate results and add
   * notes (as `zcf update` does for tools that had nothing newer), steps are shown once settled.
   */
  async function runPlan(
    plan: Plan,
    renderer: Renderer,
    settle?: (results: ToolResult[]) => Promise<{ results: ToolResult[]; notes: string[] }>,
  ): Promise<{ code: number; results: ToolResult[] }> {
    const backupDir = backupFolder(ctx.home, now())
    const applied = await applyPlan(plan, {
      runner: ctx.runner,
      backupDir,
      home: ctx.home,
      onEvent: event => !settle && event.type === 'step-end' && renderer.stepResult(event.tool, event.result),
    })
    const { results, notes } = settle ? await settle(applied) : { results: applied, notes: [] }
    if (settle) {
      for (const result of results) {
        for (const step of result.steps) renderer.stepResult(result.tool, step)
      }
    }
    if (notes.length > 0) renderer.line()
    for (const note of notes) renderer.line(note)
    renderer.summary(plan, results, backupDir)
    return { code: results.every(result => result.ok) ? EXIT_OK : EXIT_ERROR, results }
  }

  /**
   * An updater exits 0 whether or not it found a newer version, so compare versions after updating.
   * A tool still on the same version after its own updater ran counts as already up to date. After
   * an npm install it may instead be another copy earlier on PATH, so that case is only reported.
   */
  async function compareVersions(
    plan: Plan,
    results: ToolResult[],
    detectCtx: AdapterContext,
  ): Promise<{ results: ToolResult[]; notes: string[] }> {
    const notes: string[] = []
    const planned = new Map(plan.tools.map(toolPlan => [toolPlan.tool, toolPlan]))
    const updated = results.filter(
      (result): result is ToolResult & { tool: ToolId } =>
        isToolId(result.tool) &&
        result.ok &&
        planned.get(result.tool)?.version !== undefined &&
        result.steps.some(step => step.status === 'done'),
    )
    if (updated.length === 0) return { results, notes }
    const after = await detectTools(
      updated.map(result => result.tool),
      detectCtx,
    )
    const settled = results.map(result => {
      const toolPlan = planned.get(result.tool)
      const from = toolPlan?.version
      const to = isToolId(result.tool) ? after[result.tool]?.version : undefined
      if (!updated.some(item => item === result) || !from || !to) return result
      const tool = ACTOR_NAMES[result.tool]
      if (to !== from) {
        notes.push(green(t('cli.updated', { tool, from, to })))
        return result
      }
      const viaNpm = result.steps.some(
        item => item.status === 'done' && item.step.kind === 'command' && item.step.command === 'npm',
      )
      if (viaNpm) {
        notes.push(yellow(t('cli.updateSameVersion', { tool, version: to })))
        return result
      }
      notes.push(dim(t('cli.upToDate', { tool, version: to })))
      return {
        ...result,
        steps: result.steps.map(step => (step.status === 'done' ? { ...step, status: 'unchanged' as const } : step)),
      }
    })
    return { results: settled, notes }
  }

  const cli = cac('zcf')
  cli.usage('<command> [options]')
  cli.option('-l, --lang <lang>', t('cli.option.lang'))
  // cac writes its help headings in English; translate them by their text.
  const helpTitles: Record<string, string> = {
    Usage: t('cli.help.usage'),
    Commands: t('cli.help.commands'),
    Options: t('cli.help.options'),
    'For more info, run any command with the `--help` flag': t('cli.help.moreInfo'),
  }
  cli.help(sections => [
    sections[0]!,
    {
      body: t('cli.description'),
    },
    ...sections.slice(1).map(({ title, body }) => ({ title: title && (helpTitles[title] ?? title), body })),
  ])
  cli.version(version)
  for (const option of cli.globalCommand.options) {
    if (option.name === 'help') option.description = t('cli.option.help')
    if (option.name === 'version') option.description = t('cli.option.version')
  }

  cli
    .command('plan', t('cli.command.plan'))
    .option('--file <path>', t('cli.option.file'))
    .option('-t, --tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('-m, --mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
    .action(async (flags: CommandFlags) => {
      const { plan, previews, renderer } = await preparePlan(flags)
      renderer.plan(plan, previews)
      return EXIT_OK
    })

  cli
    .command('apply', t('cli.command.apply'))
    .option('--file <path>', t('cli.option.file'))
    .option('-t, --tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('-m, --mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
    .option('-y, --yes', t('cli.option.yes'))
    .action(async (flags: CommandFlags) => {
      const { plan, previews, renderer } = await preparePlan(flags)
      renderer.plan(plan, previews)
      if (!hasWork(plan, previews)) {
        renderer.line(t('cli.nothingToDo'))
        return EXIT_OK
      }
      if (!flags.yes) {
        renderer.line(t('cli.confirmHint'))
        return EXIT_OK
      }
      return (await runPlan(plan, renderer)).code
    })

  cli
    .command('tui', t('cli.command.tui'))
    .option('--file <path>', t('cli.option.file'))
    .action(async (flags: CommandFlags) => runTuiCommand(flags.file))

  cli
    .command('ui', t('cli.command.ui'))
    .option('--file <path>', t('cli.option.file'))
    .option('--port <port>', t('cli.option.port'))
    .option('--open', t('cli.option.open'), { default: true })
    .action(async (flags: CommandFlags) => {
      const port = parsePort(flags.port, t)
      const path = flags.file ? resolve(flags.file) : defaultConfigPath(ctx.home)
      const { fileAssets, startUiServer } = await import('./server')
      const here = fileURLToPath(new URL('.', import.meta.url))
      // Bundled, the web app sits in dist/web next to this code; from source, in packages/web/dist.
      const asset = await fileAssets(
        options.webRoot ? [options.webRoot] : [join(here, 'web'), join(here, '../../web/dist')],
      )
      if (!asset) throw new CliError(t('cli.uiMissingAssets'), EXIT_ERROR)
      // The browser picks its own language from the config; this one covers the strings the
      // server itself sends, so it follows the config too unless a flag pinned it.
      const loaded = await loadConfigFile(path)
      const configLang = loaded.success ? loaded.config.language : undefined
      const uiLang = !isLangPinned(argv) && isLang(configLang) ? configLang : lang
      const server = await startUiServer({
        service: createLocalService(ctx, path, now),
        lang: uiLang,
        langPinned: isLangPinned(argv),
        home: ctx.home,
        asset,
        port,
      })
      stdout.write(`${t('cli.uiListening', { url: server.url })}\n${t('cli.uiStop')}\n`)
      if (flags.open !== false) {
        const [command, args] = openCommand(ctx.platform, server.url)
        if (options.openUrl) options.openUrl(command, args)
        else void openDetached(command, args)
      }
      await (options.stop ?? new Promise(done => process.once('SIGINT', done)))
      await server.close()
      return EXIT_OK
    })

  cli
    .command('update', t('cli.command.update'))
    .option('--file <path>', t('cli.option.file'))
    .option('-t, --tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('-m, --mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
    .action(async (flags: CommandFlags) => {
      const override = parseMirror(flags.mirror, t)
      const listed = parseTools(flags.tools, t)
      // The config is required for its tools; with --tools, a missing or broken one only means no mirror setting.
      const loaded = listed ? await loadConfigFile(configPath(flags.file)) : undefined
      const config = listed ? (loaded?.success ? loaded.config : undefined) : await loadConfig(flags.file)
      const tools = listed ?? config?.tools ?? []
      if (tools.length === 0) throw new CliError(t('cli.noTools'), EXIT_ERROR)
      const renderer = new Renderer(stdout, t, [], ctx.home)
      if (loaded && !loaded.success && !('missing' in loaded))
        renderer.line(yellow(t('cli.configMirrorIgnored', { path: tildify(configPath(flags.file), ctx.home) })))
      const mirror = resolveMirror({ override, env: ctx.env, config })
      showMirror(renderer, mirror)
      const plan = await planUpdates(tools, { ...ctx, mirror })
      for (const toolPlan of plan.tools) {
        for (const notice of toolPlan.notices) renderer.notice(notice)
      }
      return (await runPlan(plan, renderer, results => compareVersions(plan, results, { ...ctx, mirror }))).code
    })

  cli
    .command('uninstall [...tools]', t('cli.command.uninstall'))
    .option('--file <path>', t('cli.option.file'))
    .option('-y, --yes', t('cli.option.yes'))
    .action(async (names: string[], flags: CommandFlags) => {
      // A variadic argument list goes through the same parser as --tools.
      const tools = parseTools(names.join(','), t) ?? []
      if (tools.length === 0) throw new CliError(t('cli.noTools'), EXIT_ERROR)
      // The uninstall works without a config; it only narrows what the cleanup may touch,
      // and `removeFromConfig` is the one that names a broken file.
      const loaded = await loadConfigFile(configPath(flags.file))
      const config = loaded.success ? loaded.config : undefined
      const plan = await planUninstalls(tools, ctx, config?.provider)
      const previews = await previewPlan(plan, ctx.readFile)
      // The cleanup steps print the values they take out, so they go out masked.
      const fileSecrets = [...previews.values()].flatMap(preview => preview.secrets)
      const renderer = new Renderer(stdout, t, config ? collectSecrets(config, fileSecrets) : fileSecrets, ctx.home)
      renderer.plan(plan, previews)
      if (!hasWork(plan, previews)) {
        renderer.line(t('cli.nothingToUninstall'))
        return EXIT_OK
      }
      if (!flags.yes) {
        renderer.line(t('cli.confirmHint'))
        return EXIT_OK
      }
      const { code, results } = await runPlan(plan, renderer)
      const removed = results
        .filter((result): result is ToolResult & { tool: ToolId } => result.ok && isToolId(result.tool))
        .map(result => result.tool)
      await removeFromConfig(removed, flags.file, renderer)
      // Say so when a copy survives the uninstall, the same way update explains a stale version.
      const after = await detectTools(removed, ctx)
      for (const tool of removed) {
        if (after[tool]?.installed) renderer.line(yellow(t('cli.uninstallLeftover', { tool: TOOL_NAMES[tool] })))
      }
      return code
    })

  /** Back the file at `path` up into a run of its own, for an edit that changes it. */
  async function backupBeforeEdit(path: string): Promise<{ dir: string; backup: string } | undefined> {
    const at = now()
    const run = new BackupRun(backupFolder(ctx.home, at), ctx.home, () => at, 'save')
    const backup = await run.snapshot(path)
    await run.finish()
    return backup === undefined ? undefined : { dir: run.dir, backup }
  }

  /** Take uninstalled tools out of "tools" in the config, so a later apply does not reinstall them. */
  async function removeFromConfig(
    removed: readonly ToolId[],
    file: string | undefined,
    renderer: Renderer,
  ): Promise<void> {
    if (removed.length === 0) return
    const path = configPath(file)
    const existing = await readTextIfExists(path)
    const raw = existing?.trim() ? await parseConfigText('json', existing) : undefined
    const tools = isTable(raw) && Array.isArray(raw.tools) ? raw.tools.filter(isToolId) : []
    const dropped = tools.filter(tool => removed.includes(tool))
    if (dropped.length === 0) return
    const left = tools.filter(tool => !removed.includes(tool))
    let next: string
    try {
      next = editJson(existing, [{ path: ['tools'], value: left.length > 0 ? left : undefined }])
    } catch (error) {
      if (!(error instanceof FileSyntaxError)) throw error
      throw new FileSyntaxError(error.format, error.line, error.column, tildify(path, ctx.home))
    }
    const backed = next === existing ? undefined : await backupBeforeEdit(path)
    await writeFileAtomic(path, next)
    renderer.line(
      t('cli.uninstallConfigUpdated', {
        tools: dropped.map(tool => TOOL_NAMES[tool]).join(', '),
        path: tildify(path, ctx.home),
      }),
    )
    if (backed) renderer.line(dim(t('cli.backups', { path: tildify(backed.dir, ctx.home) })))
  }

  cli
    .command('mirror [mirror]', t('cli.command.mirror'))
    .option('--file <path>', t('cli.option.file'))
    .action(async (value: string | undefined, flags: CommandFlags) => {
      const path = configPath(flags.file)
      const renderer = new Renderer(stdout, t, [], ctx.home)
      const fromEnv = envMirror(ctx.env)
      if (value === undefined) {
        warnUnknownEnvMirror(renderer)
        const text = await readTextIfExists(path)
        // Only a mirror the file names comes from it; the schema fills in `official` otherwise.
        const config = text === undefined ? undefined : await loadConfig(flags.file)
        const raw = text === undefined ? undefined : await parseConfigText('json', text)
        const configured = isTable(raw) && raw.mirror !== undefined ? config?.mirror : undefined
        const mirror = fromEnv ?? configured ?? 'official'
        const source = fromEnv
          ? t('cli.mirrorSource.env')
          : configured
            ? t('cli.mirrorSource.config', { path: tildify(path, ctx.home) })
            : t('cli.mirrorSource.default')
        renderer.line(t('cli.mirrorCurrent', { mirror: `${mirror} - ${t(`mirror.${mirror}`)}`, source }))
        renderer.line(dim(t('cli.mirrorHint')))
        return EXIT_OK
      }

      const mirror = parseMirror(value, t)!
      const existing = await readTextIfExists(path)
      // A missing or empty config starts as the smallest valid one; an existing one keeps everything but this key.
      const text = existing?.trim() ? existing : undefined
      let next: string
      try {
        if (text !== undefined && !isTable(await parseConfigText('json', text)))
          throw new CliError(t('cli.configInvalid', { path }), EXIT_INVALID_CONFIG)
        next = editJson(text ?? '{\n  "version": 1\n}\n', [{ path: ['mirror'], value: mirror }])
      } catch (error) {
        if (!(error instanceof FileSyntaxError)) throw error
        throw new FileSyntaxError(error.format, error.line, error.column, tildify(path, ctx.home))
      }
      const backed = next === existing ? undefined : await backupBeforeEdit(path)
      await writeFileAtomic(path, next)
      renderer.line(t('cli.mirrorSet', { mirror: t(`mirror.${mirror}`), path: tildify(path, ctx.home) }))
      if (backed) renderer.line(dim(t('cli.backups', { path: tildify(backed.dir, ctx.home) })))
      if (fromEnv && fromEnv !== mirror)
        renderer.line(yellow(t('cli.mirrorEnvOverrides', { value: ctx.env.ZCF_MIRROR ?? '' })))
      return EXIT_OK
    })

  cli
    .command('backup [command] [id]', t('cli.command.backup'))
    .option('-y, --yes', t('cli.option.yes'))
    .option('--keep <n>', t('cli.backup.option.keep'))
    .action(async (command: string | undefined, id: string | undefined, flags: CommandFlags) => {
      const root = backupsRoot(ctx.home)
      const renderer = new Renderer(stdout, t, [], ctx.home)
      // The run's own line in lists and summaries: what made it and how much it holds.
      const describe = (backup: { id: string; reason?: string; entries: unknown[] }) =>
        t('cli.backup.summary', {
          id: backup.id,
          reason: t(`cli.backup.reason.${backup.reason ?? 'unknown'}`),
          count: backup.entries.length,
        })

      if (command === undefined || command === 'list') {
        const backups = await listBackups(root)
        if (backups.length === 0) {
          renderer.line(t('cli.backup.none'))
          return EXIT_OK
        }
        for (const backup of backups) renderer.line(describe(backup))
        return EXIT_OK
      }

      if (command === 'restore') {
        if (id === undefined) throw new CliError(t('cli.backup.restoreNeedsId'), EXIT_ERROR)
        const backup = (await listBackups(root)).find(item => item.id === id)
        if (backup === undefined) throw new CliError(t('cli.backup.missing', { id }), EXIT_ERROR)
        renderer.line(describe(backup))
        if (!flags.yes) {
          renderer.line(t('cli.confirmHint'))
          return EXIT_OK
        }
        // The restore backs up what is there now, so it can itself be undone with that run.
        const result = await restoreBackup(root, id, ctx.home, now)
        renderer.line(
          t('cli.backup.restored', { changed: result.changed, unchanged: result.unchanged, missing: result.missing }),
        )
        if (result.corrupt > 0) renderer.line(yellow(t('cli.backup.corrupt', { count: result.corrupt })))
        if (result.outside > 0) renderer.line(yellow(t('cli.backup.outside', { count: result.outside })))
        if (result.id !== undefined)
          renderer.line(dim(t('cli.backups', { path: tildify(join(root, result.id), ctx.home) })))
        return EXIT_OK
      }

      if (command === 'prune') {
        const keep = flags.keep === undefined ? 20 : parseKeep(flags.keep, t)
        const backups = await listBackups(root)
        const doomed = pruneDoomed(backups, keep)
        if (doomed.length === 0) {
          renderer.line(t('cli.backup.prunedNone', { count: backups.length }))
          return EXIT_OK
        }
        renderer.line(t('cli.backup.pruneList', { count: doomed.length, ids: doomed.join(', ') }))
        if (!flags.yes) {
          renderer.line(t('cli.confirmHint'))
          return EXIT_OK
        }
        const removed = await pruneBackups(root, keep)
        renderer.line(t('cli.backup.pruned', { count: removed.length, ids: removed.join(', ') }))
        return EXIT_OK
      }

      throw new CliError(t('cli.backup.unknownCommand', { command }), EXIT_ERROR)
    })

  const initCommand = cli.command('init', t('cli.command.init')).option('--file <path>', t('cli.option.file'))
  for (const flag of INIT_OPTIONS) initCommand.option(flag.option, flag.describe(t))
  initCommand.action(async (flags: CommandFlags) => {
    const flaggedLang = langFlag(argv)
    // Nothing asked for: point at the editor instead of writing an empty config.
    const asked = INIT_OPTIONS.some(flag => flags[flag.key] !== undefined) || flaggedLang !== undefined
    if (!asked) {
      new Renderer(stdout, t, [], ctx.home).line(t('cli.init.hintTui'))
      return EXIT_OK
    }

    // Every id is checked before the file is touched, so a typo writes nothing.
    const tools = parseTools(flags.tools, t)
    const mirror = parseMirror(flags.mirror, t)
    const skills = parseKnownIds(
      flags.skills,
      SKILLS_CATALOG.map(skill => skill.id),
      t,
      'cli.init.unknownSkills',
    )
    const agents = parseKnownIds(flags.agents, BUILTIN_AGENT_IDS, t, 'cli.init.unknownAgents')
    const styles = parseKnownIds(flags.styles, BUILTIN_STYLE_IDS, t, 'cli.init.unknownStyles')
    const defaultStyle = parseDefaultStyle(flags.defaultStyle, t)
    const extras = parseExtraPicks(flags.extras, t)
    const apiKey = flags.apiKey === undefined ? undefined : String(flags.apiKey)

    const path = configPath(flags.file)
    const existing = await readTextIfExists(path)
    // A missing or empty config starts as the smallest valid one; an existing one keeps everything but the keys asked for.
    const text = existing?.trim() ? existing : undefined
    let next: string
    try {
      const raw = text === undefined ? undefined : await parseConfigText('json', text)
      if (text !== undefined && !isTable(raw)) throw new CliError(t('cli.configInvalid', { path }), EXIT_INVALID_CONFIG)
      const draft = isTable(raw) ? raw : {}

      let provider: Record<string, unknown> | undefined
      if (flags.preset !== undefined) {
        const id = String(flags.preset)
        const list = await loadPresetsFor(ctx, draft.mirror, { override: mirror, fetch: options.fetch })
        if (list.presets.length === 0) throw new CliError(t('cli.init.presetsUnavailable'), EXIT_ERROR)
        const preset = list.presets.find(item => item.id === id)
        if (preset === undefined)
          throw new CliError(
            t('cli.init.unknownPreset', { list: id, known: list.presets.map(item => item.id).join(', ') }),
            EXIT_ERROR,
          )
        provider = applyPreset(preset, draft.provider)
      }
      if (apiKey !== undefined) {
        const current = provider ?? (isTable(draft.provider) ? { ...draft.provider } : undefined)
        if (current === undefined) throw new CliError(t('cli.init.apiKeyNoProvider'), EXIT_ERROR)
        provider = { ...current, apiKey }
      }

      const edits: KeyEdit[] = []
      if (tools !== undefined) edits.push({ path: ['tools'], value: tools })
      if (provider !== undefined) edits.push({ path: ['provider'], value: provider })
      if (skills.length > 0) edits.push({ path: ['skills'], value: withSkillPicks(draft.skills, skills) })
      if (agents.length > 0) edits.push({ path: ['agents'], value: withPicks(draft.agents, agents) })
      if (styles.length > 0 || defaultStyle !== undefined) {
        const styleBlock = isTable(draft.styles) ? draft.styles : {}
        edits.push({
          path: ['styles'],
          value: {
            ...styleBlock,
            outputStyles: withPicks(styleBlock.outputStyles, styles),
            ...(defaultStyle !== undefined ? { defaultOutputStyle: defaultStyle } : {}),
          },
        })
      }
      for (const [key, value] of Object.entries(extras)) edits.push({ path: ['extras', key], value })
      if (mirror !== undefined) edits.push({ path: ['mirror'], value: mirror })
      if (flaggedLang !== undefined) edits.push({ path: ['language'], value: flaggedLang })

      next = editJson(text ?? '{\n  "version": 1\n}\n', edits)
      // The merged result must hold as a config, so init never writes something a plan cannot read.
      const merged = parseZcfConfig(await parseConfigText('json', next))
      if (!merged.success)
        throw new CliError(
          [t('cli.configInvalid', { path }), ...configIssues(merged.issues, t)].join('\n'),
          EXIT_INVALID_CONFIG,
        )
    } catch (error) {
      if (!(error instanceof FileSyntaxError)) throw error
      throw new FileSyntaxError(error.format, error.line, error.column, tildify(path, ctx.home))
    }

    const backed = next === existing ? undefined : await backupBeforeEdit(path)
    await writeFileAtomic(path, next)
    // The saved file is applied through the same pipeline `zcf apply` runs.
    const { plan, previews, renderer } = await preparePlan({ file: flags.file })
    if (backed) renderer.line(dim(t('cli.backups', { path: tildify(backed.dir, ctx.home) })))
    renderer.line(t('cli.init.saved', { path: tildify(path, ctx.home) }))
    renderer.line()
    renderer.plan(plan, previews)
    if (!hasWork(plan, previews)) {
      renderer.line(t('cli.nothingToDo'))
      return EXIT_OK
    }
    if (!flags.yes) {
      renderer.line(t('cli.confirmHint'))
      return EXIT_OK
    }
    return (await runPlan(plan, renderer)).code
  })

  cli
    .command('switch <profile>', t('cli.command.switch'))
    .option('--file <path>', t('cli.option.file'))
    .action(async (query: string, flags: CommandFlags) => {
      // The config has to validate, so the profiles below it are shaped as the schema expects.
      const config = await loadConfig(flags.file)
      if (config.profiles.length === 0) throw new CliError(t('cli.switch.noProfiles'), EXIT_ERROR)
      const known = config.profiles.map(item => `${item.id} (${item.name})`)

      const path = configPath(flags.file)
      const existing = await readTextIfExists(path)
      // The provider is copied as the file writes it, not with the defaults the schema fills in.
      const raw = await parseConfigText('json', existing)
      const profiles = isTable(raw) && Array.isArray(raw.profiles) ? raw.profiles.filter(isTable) : []
      const entry = profiles.find(item => item.id === query) ?? profiles.find(item => item.name === query)
      const matched = config.profiles.find(item => item.id === query || item.name === query)
      if (!isTable(entry) || !isTable(entry.provider) || matched === undefined)
        throw new CliError(t('cli.switch.unknown', { query, known: known.join(', ') }), EXIT_ERROR)
      const next = editJson(existing, [{ path: ['provider'], value: entry.provider }])
      const backed = next === existing ? undefined : await backupBeforeEdit(path)
      await writeFileAtomic(path, next)
      const renderer = new Renderer(stdout, t, [], ctx.home)
      renderer.line(t('cli.switch.done', { profile: matched.name }))
      if (backed) renderer.line(dim(t('cli.backups', { path: tildify(backed.dir, ctx.home) })))
      return EXIT_OK
    })

  cli.command('ccu', t('cli.command.ccu')).action(async () => {
    // One cheap probe first, so a missing npx is a clear message instead of a bare spawn error.
    const probe = await ctx.runner.run('npx', ['--version'])
    if (probe.exitCode === undefined) throw new CliError(t('cli.ccu.noNpx'), EXIT_ERROR)
    const args = ['-y', 'ccusage@latest']
    // A real ChildProcess satisfies the interface; only the two events the command waits for are used.
    const child: PassthroughChild = options.passthrough
      ? options.passthrough('npx', args)
      : (await import('node:child_process')).spawn('npx', args, {
          stdio: 'inherit',
          // Patched Node refuses to spawn npm's .cmd shims directly (EINVAL); through the shell
          // cmd.exe finds npx.cmd, and the fixed arguments make the shell call safe.
          shell: ctx.platform === 'win32',
        })
    return await new Promise<number>((done, reject) => {
      child.once('error', error => reject(new CliError(t('cli.ccu.failed', { message: error.message }), EXIT_ERROR)))
      child.once('close', code => done(code ?? EXIT_ERROR))
    })
  })

  try {
    cli.parse(['node', 'zcf', ...argv], { run: false })
    if (!cli.matchedCommand) {
      if (argv.length === 0 && interactive) return await runTuiCommand(undefined)
      if (!cli.options.help && !cli.options.version) cli.outputHelp()
      return argv.length === 0 || cli.options.help || cli.options.version ? EXIT_OK : EXIT_ERROR
    }
    const code: unknown = await cli.runMatchedCommand()
    return typeof code === 'number' ? code : EXIT_OK
  } catch (error) {
    if (error instanceof FileSyntaxError) {
      const { path = '', format, line, column } = error
      stderr.write(`${t('cli.fileInvalid', { path, format: format.toUpperCase(), line, column })}\n`)
      return EXIT_ERROR
    }
    const argumentMessage = argumentError(error, t)
    if (argumentMessage) {
      stderr.write(`${argumentMessage}\n`)
      return EXIT_ERROR
    }
    if (error instanceof CliError) {
      stderr.write(`${error.message}\n`)
      return error.exitCode
    }
    // Core and the service throw these with a message key; translate instead of the English fallback.
    if (error instanceof MessageError) {
      stderr.write(`${errorText(error, t)}\n`)
      return EXIT_ERROR
    }
    const message = error instanceof Error ? error.message : String(error)
    stderr.write(`${t('cli.unexpectedError', { message })}\n`)
    return EXIT_ERROR
  }
}
