import process from 'node:process'

import type { AdapterContext, FilePreview, Plan, PlanStep, ToolId, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  createContext,
  defaultConfigPath,
  FileSyntaxError,
  loadConfigFile,
  planTools,
  planUpdates,
  previewFileStep,
  isToolId,
  TOOL_IDS,
} from '@zcf/core'
import { cac } from 'cac'
import { join, resolve } from 'pathe'

import { version } from '../package.json'
import { createTranslator, detectLang } from './i18n'
import type { Output } from './render'
import { collectSecrets, Renderer } from './render'

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

function hasWork(plan: Plan, previews: Map<PlanStep, FilePreview>): boolean {
  return plan.tools.some(toolPlan => toolPlan.steps.some(step => previews.get(step)?.changed ?? true))
}

function backupFolder(home: string, now: Date): string {
  return join(home, '.ufomiao', 'zcf', 'backups', now.toISOString().replace(/[:.]/g, '-'))
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

  async function loadConfig(file: string | undefined): Promise<ZcfConfig> {
    const path = file ? resolve(file) : defaultConfigPath(ctx.home)
    const result = await loadConfigFile(path)
    if (result.success) return result.config
    if ('missing' in result) throw new CliError(t('cli.configMissing', { path }), EXIT_INVALID_CONFIG)
    const details = result.issues.map(issue => `  - ${issue.path ? `${issue.path}: ` : ''}${issue.message}`)
    throw new CliError([t('cli.configInvalid', { path }), ...details].join('\n'), EXIT_INVALID_CONFIG)
  }

  async function preparePlan(
    flags: CommandFlags,
  ): Promise<{ config: ZcfConfig; plan: Plan; previews: Map<PlanStep, FilePreview>; renderer: Renderer }> {
    const config = await loadConfig(flags.file)
    const tools = parseTools(flags.tools, t) ?? config.tools
    if (tools.length === 0) throw new CliError(t('cli.noTools'), EXIT_ERROR)

    const plan = await planTools(config, ctx, tools)
    const previews = new Map<PlanStep, FilePreview>()
    await Promise.all(
      plan.tools
        .flatMap(toolPlan => toolPlan.steps)
        .map(async step => {
          if (step.kind === 'file') previews.set(step, await previewFileStep(step, ctx.readFile))
        }),
    )
    const fileSecrets = [...previews.values()].flatMap(preview => preview.secrets)
    const renderer = new Renderer(stdout, t, collectSecrets(config, fileSecrets), ctx.home)
    return { config, plan, previews, renderer }
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
  cli.help(sections => [
    sections[0]!,
    {
      body: t('cli.description'),
    },
    ...sections.slice(1),
  ])
  cli.version(version)

  cli
    .command('plan', t('cli.command.plan'))
    .option('--file <path>', t('cli.option.file'))
    .option('--tools <tools>', t('cli.option.tools'))
    .action(async (flags: CommandFlags) => {
      const { plan, previews, renderer } = await preparePlan(flags)
      renderer.plan(plan, previews)
      return EXIT_OK
    })

  cli
    .command('apply', t('cli.command.apply'))
    .option('--file <path>', t('cli.option.file'))
    .option('--tools <tools>', t('cli.option.tools'))
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
    .option('--tools <tools>', t('cli.option.tools'))
    .action(async (flags: CommandFlags) => {
      const tools = parseTools(flags.tools, t) ?? (await loadConfig(flags.file)).tools
      if (tools.length === 0) throw new CliError(t('cli.noTools'), EXIT_ERROR)
      const renderer = new Renderer(stdout, t, [], ctx.home)
      const plan = await planUpdates(tools, ctx)
      for (const toolPlan of plan.tools) {
        for (const notice of toolPlan.notices) renderer.notice(notice)
      }
      return runPlan(plan, renderer)
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
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    return error instanceof CliError ? error.exitCode : EXIT_ERROR
  }
}
