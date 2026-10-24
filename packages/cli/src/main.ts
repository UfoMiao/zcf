import process from 'node:process'

import type { AdapterContext, FilePreview, Mirror, Plan, PlanStep, ToolId, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  createContext,
  defaultConfigPath,
  editJson,
  envMirror,
  FileSyntaxError,
  isMirror,
  loadConfigFile,
  MIRRORS,
  mirrorEnv,
  planTools,
  planUpdates,
  previewPlan,
  isToolId,
  readTextIfExists,
  resolveMirror,
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
import { collectSecrets, Renderer, tildify } from './render'

export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_INVALID_CONFIG = 2

export interface MainOptions {
  stdout?: Output
  stderr?: Output
  context?: Partial<AdapterContext>
  now?: () => Date
}

interface CommandFlags {
  file?: string
  tools?: string
  yes?: boolean
  mirror?: string
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
  if (isMirror(value)) return value
  const mirror = typeof value === 'string' ? value : ''
  throw new CliError(t('cli.unknownMirror', { mirror, known: MIRRORS.join(', ') }), EXIT_ERROR)
}

function hasWork(plan: Plan, previews: Map<PlanStep, FilePreview>): boolean {
  return plan.tools.some(toolPlan => toolPlan.steps.some(step => previews.get(step)?.changed ?? true))
}

function backupFolder(home: string, now: Date): string {
  return join(home, '.ufomiao', 'zcf', 'backups', now.toISOString().replace(/[:.]/g, '-'))
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
  const t = createTranslator(detectLang(argv))
  const ctx = createContext(options.context)
  const now = options.now ?? (() => new Date())

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

  /** Say so when downloads go through a mirror. The registry npm will use is the user's own when they set one. */
  function showMirror(renderer: Renderer, mirror: Mirror): void {
    if (mirror === 'official') return
    const registry =
      mirrorEnv(mirror, ctx.env).npm_config_registry ??
      Object.entries(ctx.env).find(([key]) => key.toLowerCase() === 'npm_config_registry')?.[1]
    renderer.line(dim(t('cli.mirrorInUse', { registry: registry ?? '' })))
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
        const result = await loadConfigFile(path)
        if (!result.success && !('missing' in result)) await loadConfig(flags.file)
        const configured = result.success ? result.config.mirror : undefined
        const mirror = fromEnv ?? configured ?? 'official'
        const source = fromEnv
          ? t('cli.mirrorSource.env')
          : result.success
            ? t('cli.mirrorSource.config', { path: tildify(path, ctx.home) })
            : t('cli.mirrorSource.default')
        renderer.line(t('cli.mirrorCurrent', { mirror: `${mirror} - ${t(`mirror.${mirror}`)}`, source }))
        renderer.line(dim(t('cli.mirrorHint')))
        return EXIT_OK
      }

      const mirror = parseMirror(value, t)!
      const text = await readTextIfExists(path)
      // A missing config starts as the smallest valid one; an existing one keeps everything but this key.
      const next = editJson(text ?? '{\n  "version": 1\n}\n', [{ path: ['mirror'], value: mirror }])
      await writeFileAtomic(path, next)
      renderer.line(t('cli.mirrorSet', { mirror: t(`mirror.${mirror}`), path: tildify(path, ctx.home) }))
      if (fromEnv && fromEnv !== mirror)
        renderer.line(yellow(t('cli.mirrorEnvOverrides', { value: ctx.env.ZCF_MIRROR ?? '' })))
      return EXIT_OK
    })

  try {
    cli.parse(['node', 'zcf', ...argv], { run: false })
    if (!cli.matchedCommand) {
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
