import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { AdapterContext, FilePreview, Mirror, Plan, PlanStep, ToolId, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  createContext,
  defaultConfigPath,
  editJson,
  envMirror,
  FileSyntaxError,
  isTable,
  loadConfigFile,
  MIRRORS,
  mirrorEnv,
  parseConfigText,
  parseMirrorName,
  planTools,
  planUpdates,
  previewPlan,
  isToolId,
  readTextIfExists,
  resolveMirror,
  snapshotFile,
  TOOL_IDS,
  writeFileAtomic,
} from '@zcf/core'
import { dim, yellow } from 'ansis'
import { cac } from 'cac'
import { join, resolve } from 'pathe'

import { version } from '../package.json'
import type { Translate } from './i18n'
import { createTranslator, detectLang } from './i18n'
import type { Output } from './render'
import { collectSecrets, hasWork, Renderer, tildify } from './render'
import { backupFolder, createLocalService } from './service'

export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_INVALID_CONFIG = 2

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
}

interface CommandFlags {
  file?: string
  tools?: string
  yes?: boolean
  mirror?: string
  port?: string | number
  open?: boolean
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

function parseTools(value: unknown, t: ReturnType<typeof createTranslator>): ToolId[] | undefined {
  if (value === undefined) return undefined
  // cac hands over a boolean for a bare `--tools`, which selects nothing.
  const names =
    typeof value === 'string'
      ? value
          .split(',')
          .map(tool => tool.trim())
          .filter(Boolean)
      : []
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
    await runTui(createLocalService(ctx, path, now), t, lang, ctx.home)
    return EXIT_OK
  }

  const configPath = (file: string | undefined) => (file ? resolve(file) : defaultConfigPath(ctx.home))

  async function loadConfig(file: string | undefined): Promise<ZcfConfig> {
    const path = configPath(file)
    const result = await loadConfigFile(path)
    if (result.success) return result.config
    if ('missing' in result) throw new CliError(t('cli.configMissing', { path }), EXIT_INVALID_CONFIG)
    const details = result.issues.map(
      ({ path: field, message }) => `  - ${field ? `${field}: ` : ''}${t(message.key, message.params)}`,
    )
    throw new CliError([t('cli.configInvalid', { path }), ...details].join('\n'), EXIT_INVALID_CONFIG)
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

  async function runPlan(plan: Plan, renderer: Renderer): Promise<number> {
    const backupDir = backupFolder(ctx.home, now())
    const results = await applyPlan(plan, {
      runner: ctx.runner,
      backupDir,
      home: ctx.home,
      onEvent: event => event.type === 'step-end' && renderer.stepResult(event.tool, event.result),
    })
    renderer.summary(results, backupDir)
    return results.every(result => result.ok) ? EXIT_OK : EXIT_ERROR
  }

  const cli = cac('zcf')
  cli.usage('<command> [options]')
  cli.option('--lang <lang>', t('cli.option.lang'))
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
    .option('--tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('--mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
    .action(async (flags: CommandFlags) => {
      const { plan, previews, renderer } = await preparePlan(flags)
      renderer.plan(plan, previews)
      return EXIT_OK
    })

  cli
    .command('apply', t('cli.command.apply'))
    .option('--file <path>', t('cli.option.file'))
    .option('--tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('--mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
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
      return runPlan(plan, renderer)
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
      const server = await startUiServer({
        service: createLocalService(ctx, path, now),
        lang,
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
    .option('--tools <tools>', t('cli.option.tools', { tools: TOOL_IDS.join(', ') }))
    .option('--mirror <mirror>', t('cli.option.mirror', { mirrors: MIRRORS.join(', ') }))
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
      return runPlan(plan, renderer)
    })

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
      const backupDir = backupFolder(ctx.home, now())
      const backup = next === existing ? undefined : await snapshotFile(path, backupDir, ctx.home)
      await writeFileAtomic(path, next)
      renderer.line(t('cli.mirrorSet', { mirror: t(`mirror.${mirror}`), path: tildify(path, ctx.home) }))
      if (backup) renderer.line(dim(t('cli.backups', { path: tildify(backupDir, ctx.home) })))
      if (fromEnv && fromEnv !== mirror)
        renderer.line(yellow(t('cli.mirrorEnvOverrides', { value: ctx.env.ZCF_MIRROR ?? '' })))
      return EXIT_OK
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
    const message = error instanceof Error ? error.message : String(error)
    stderr.write(`${t('cli.unexpectedError', { message })}\n`)
    return EXIT_ERROR
  }
}
