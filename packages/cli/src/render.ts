import type {
  FilePreview,
  Message,
  Notice,
  Plan,
  PlanActor,
  PlanStep,
  StepResult,
  ToolResult,
  ZcfConfig,
} from '@zcf/core'
import { ACTOR_NAMES, isConfigLanguage, isExtraId, EXTRA_NAMES, isToolId, TOOL_NAMES } from '@zcf/core'
import { bold, cyan, dim, green, red, yellow } from 'ansis'

import type { Translate } from './i18n'

export interface Output {
  write: (text: string) => void
}

const SAFE_ARG = /^[\w@%+=:,./-]+$/

export function quoteArg(arg: string): string {
  return SAFE_ARG.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`
}

/** Every value in the config, plus any `extra` ones found elsewhere, that must never be printed. */
export function collectSecrets(config: ZcfConfig, extra: readonly string[] = []): string[] {
  const values = config.provider ? [config.provider.apiKey, ...extra] : [...extra]
  for (const server of Object.values(config.mcpServers)) {
    values.push(...Object.values(server.type === 'stdio' ? server.env : server.headers))
  }
  // A value like "Bearer <token>" may show up in error output as the bare token.
  const secrets = new Set<string>()
  for (const value of values) {
    secrets.add(value)
    // pi takes MCP values with every `$` that does not start `${NAME}` written as `$$`.
    if (value.includes('$')) secrets.add(value.replaceAll(/\$(?!\{)/g, () => '$$'))
    for (const part of value.split(/\s+/)) {
      if (part.length >= 8) secrets.add(part)
    }
  }
  const long = [...secrets].filter(secret => secret.length >= 4)
  // A short value would match all over the output, so it is only masked as a whole JSON string.
  const short = [...secrets]
    .filter(secret => secret.length > 0 && secret.length < 4)
    .map(secret => JSON.stringify(secret))
  return [...secretVariants(long), ...short].toSorted((a, b) => b.length - a.length)
}

/**
 * Each secret as it may appear in output: raw, escaped inside JSON, and either of
 * those inside a single-quoted shell argument. Longest first, so a secret that
 * contains another is masked whole.
 */
export function secretVariants(secrets: readonly string[]): string[] {
  const variants = new Set<string>()
  for (const secret of secrets) {
    const json = JSON.stringify(secret).slice(1, -1)
    for (const form of [secret, json]) {
      variants.add(form)
      variants.add(form.replaceAll("'", `'\\''`))
    }
  }
  return [...variants].toSorted((a, b) => b.length - a.length)
}

export function maskSecrets(text: string, secrets: readonly string[]): string {
  let masked = text
  // Long secrets keep a few characters so people can tell which one it is; short ones are hidden whole.
  for (const secret of secrets) {
    const quoted = secret.length > 1 && secret.startsWith('"') && secret.endsWith('"')
    const hint = secret.length >= 12 ? `${secret.slice(0, 3)}***${secret.slice(-2)}` : quoted ? '"***"' : '***'
    // A callback, so `$&` and similar in the secret are inserted literally, not as replacement patterns.
    masked = masked.replaceAll(secret, () => hint)
  }
  return masked
}

/** Whether applying would change anything: a file step with changes, or any command step. */
export function hasWork(plan: Plan, previews: ReadonlyMap<PlanStep, FilePreview>): boolean {
  return plan.tools.some(toolPlan => toolPlan.steps.some(step => previews.get(step)?.changed ?? true))
}

export function tildify(path: string, home: string): string {
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

export class Renderer {
  constructor(
    private readonly out: Output,
    private readonly t: Translate,
    private readonly secrets: readonly string[],
    private readonly home: string,
  ) {}

  line(text = ''): void {
    this.out.write(`${maskSecrets(text, this.secrets)}\n`)
  }

  message(message: Message): string {
    const params = { ...message.params }
    if (isToolId(params.tool)) params.tool = TOOL_NAMES[params.tool]
    if (isExtraId(params.extra)) params.extra = EXTRA_NAMES[params.extra]
    if (isConfigLanguage(params.language)) params.language = this.t(`language.${params.language}`)
    return this.t(message.key, params)
  }

  stepTarget(step: PlanStep): string {
    if (step.kind === 'command') return `$ ${[step.command, ...step.args].map(quoteArg).join(' ')}`
    if (step.kind === 'copy') return `${tildify(step.from, this.home)} -> ${tildify(step.to, this.home)}`
    return tildify(step.path, this.home)
  }

  notice(notice: Notice): void {
    const text = this.message(notice.message)
    this.line(notice.level === 'warning' ? yellow(`  ! ${text}`) : dim(`  i ${text}`))
  }

  patch(preview: FilePreview): void {
    // Drop the "Index:" and "===" header lines; the path is already shown above.
    const lines = preview.patch
      .split('\n')
      .filter(line => line && !line.startsWith('Index:') && !line.startsWith('===='))
    for (const line of lines) {
      if (line.startsWith('+++') || line.startsWith('---')) continue
      const colored = line.startsWith('+')
        ? green(line)
        : line.startsWith('-')
          ? red(line)
          : line.startsWith('@@')
            ? cyan(line)
            : dim(line)
      this.line(`       ${colored}`)
    }
  }

  plan(plan: Plan, previews: Map<PlanStep, FilePreview>): void {
    for (const toolPlan of plan.tools) {
      this.line(bold(ACTOR_NAMES[toolPlan.tool]))
      for (const notice of toolPlan.notices) this.notice(notice)
      if (toolPlan.steps.length === 0 && toolPlan.notices.length === 0) this.line(dim(`  ${this.t('cli.nothingToDo')}`))

      for (const [index, step] of toolPlan.steps.entries()) {
        const preview = previews.get(step)
        const suffix =
          preview && !preview.changed
            ? dim(` (${this.t('cli.unchanged')})`)
            : preview?.before === undefined && preview
              ? dim(` (${this.t('cli.newFile')})`)
              : ''
        this.line(`  ${index + 1}. ${this.message(step.title)}${suffix}`)
        this.line(dim(`     ${this.stepTarget(step)}`))
        if (preview?.changed) this.patch(preview)
      }
      this.line()
    }
  }

  stepResult(tool: PlanActor, result: StepResult): void {
    // A fallback step that never ran means its reason never happened; there is nothing to say.
    if (result.status === 'skipped' && result.step.kind === 'command' && result.step.fallback) return
    const title = `${ACTOR_NAMES[tool]}: ${this.message(result.step.title)}`
    switch (result.status) {
      case 'done':
        this.line(`${green('✓')} ${title}`)
        break
      case 'unchanged':
        this.line(`${dim('·')} ${title} ${dim(`(${this.t('cli.unchanged')})`)}`)
        break
      case 'skipped':
        this.line(`${dim('-')} ${title} ${dim(`(${this.t('cli.skipped')})`)}`)
        break
      case 'failed':
        this.line(`${red('✗')} ${title}`)
        for (const detail of (result.detail ?? '').split('\n')) this.line(red(`    ${detail}`))
    }
  }

  summary(plan: Plan, results: readonly ToolResult[], backupDir: string): void {
    const steps = results.flatMap(result => result.steps)
    // A tool the plan talked out of any step counts as up to date, unless the reason was
    // that it is not installed: that is reported, but it is not "already up to date".
    const notInstalled = new Set(
      plan.tools
        .filter(toolPlan => toolPlan.notices.some(item => item.message.key === 'notice.notInstalled'))
        .map(toolPlan => toolPlan.tool),
    )
    const quiet = results.filter(
      result => result.ok && result.steps.length === 0 && !notInstalled.has(result.tool),
    ).length
    const failedTools = results.filter(result => !result.ok).length
    this.line()
    if (failedTools > 0) this.line(red(this.t('cli.applyFailed', { count: failedTools })))
    else
      this.line(
        green(
          this.t('cli.applyDone', {
            done: steps.filter(step => step.status === 'done').length,
            unchanged: steps.filter(step => step.status === 'unchanged').length + quiet,
          }),
        ),
      )
    if (steps.some(step => step.backup)) {
      this.line(
        dim(
          this.t('cli.backups', {
            path: tildify(backupDir, this.home),
          }),
        ),
      )
    }
  }
}
