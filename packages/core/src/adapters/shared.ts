import { basename, join } from 'pathe'

import { isTable, JsExpression, QuotedString } from '../io/editors'
import { githubMirrorEnv } from '../mirror'
import type { CommandStep, FileFormat, FileStep, KeyEdit, Notice, PlanStep, RemoveStep } from '../plan/types'
import type { ConfigLanguage, SkillSource, ToolId } from '../schema/config'
import { builtinSkillsPath, BUILTIN_SKILLS_SOURCE } from '../schema/skills'
import type { AdapterContext, ToolStatus } from './types'

const VERSION_PATTERN = /\d+\.\d+\.\d+(?:-[\w.]+)?/

/** Run `<command> --version`; `undefined` when the command is missing or fails. */
export async function probe(ctx: AdapterContext, command: string): Promise<ToolStatus | undefined> {
  const result = await ctx.runner.run(command, ['--version'])
  if (result.exitCode !== 0) return undefined
  return { installed: true, command, version: VERSION_PATTERN.exec(result.stdout)?.[0] }
}

/** The first of `commands` that answers `--version`, or a not-installed status that will call `fallback`. */
export async function detectCommand(
  ctx: AdapterContext,
  commands: readonly string[],
  fallback = commands[0]!,
): Promise<ToolStatus> {
  for (const command of commands) {
    // Later commands are fallbacks, only tried when the earlier ones are missing.
    // oxlint-disable-next-line no-await-in-loop
    const status = await probe(ctx, command)
    if (status) return status
  }
  return { installed: false, command: fallback }
}

/**
 * Install a tool that is published on npm, for tools whose official install is `npm install -g`.
 * npm 12 skips install scripts unless they are allowed by name, so a package whose postinstall
 * fetches or links its binary passes `allowScripts`; older npm ignores the option.
 */
/** The `npm install -g` arguments the install and its fallback update share, so the flags stay in sync. */
function npmInstallArgs(pkg: string, allowScripts: readonly string[], ignoreScripts: boolean): string[] {
  return [
    'install',
    '-g',
    ...(allowScripts.length > 0 ? [`--allow-scripts=${allowScripts.join(',')}`] : []),
    ...(ignoreScripts ? ['--ignore-scripts'] : []),
    pkg,
  ]
}

export function npmInstallStep(tool: ToolId, pkg: string, allowScripts: readonly string[] = []): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.install', params: { tool } },
    command: 'npm',
    args: npmInstallArgs(pkg, allowScripts, false),
  }
}

/** Run the freshly installed tool, since npm reports success even when the binary it needs is missing. */
export function verifyStep(tool: ToolId, command: string): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.verify', params: { tool } },
    command,
    args: ['--version'],
  }
}

/** The package an `npm install -g <pkg>@latest` step updates, or `undefined` for any other step. */
export function npmLatestPackage(step: PlanStep): string | undefined {
  if (step.kind !== 'command' || step.command !== 'npm' || step.args[0] !== 'install') return undefined
  const spec = step.args.at(-1)
  return spec?.endsWith('@latest') ? spec.slice(0, -'@latest'.length) : undefined
}

/** Update a tool with npm, for tools that have no updater of their own. */
export function npmUpdateStep(tool: ToolId, pkg: string): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.update', params: { tool } },
    command: 'npm',
    args: ['install', '-g', `${pkg}@latest`],
  }
}

/** Update a tool with its own updater, such as `codex update`. */
export function selfUpdateStep(tool: ToolId, status: ToolStatus, args: string[]): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.update', params: { tool } },
    command: status.command,
    args,
  }
}

/**
 * An npm update that runs only when the tool's own updater failed. Only a tool npm owns gets
 * one: updating a native install through npm would leave two copies behind.
 */
export function npmFallbackUpdateStep(
  tool: ToolId,
  pkg: string,
  ctx: AdapterContext,
  allowScripts: readonly string[] = [],
  ignoreScripts = false,
): Promise<CommandStep | undefined> {
  return npmOwned(ctx, pkg).then(owned =>
    owned
      ? {
          kind: 'command',
          title: { key: 'step.updateNpm', params: { tool } },
          command: 'npm',
          args: npmInstallArgs(`${pkg}@latest`, allowScripts, ignoreScripts),
          fallback: true,
        }
      : undefined,
  )
}

/** A tool's own updater, with the npm fallback behind it when npm owns the package. */
export async function selfUpdateSteps(
  tool: ToolId,
  status: ToolStatus,
  args: string[],
  pkg: string,
  ctx: AdapterContext,
  allowScripts: readonly string[] = [],
  ignoreScripts = false,
): Promise<CommandStep[]> {
  const update = selfUpdateStep(tool, status, args)
  const fallback = await npmFallbackUpdateStep(tool, pkg, ctx, allowScripts, ignoreScripts)
  return fallback ? [update, fallback] : [update]
}

/** Whether the global npm prefix holds `pkg`, so `npm uninstall -g` is the uninstall for it. */
export async function npmOwned(ctx: AdapterContext, pkg: string): Promise<boolean> {
  // npm exits 1 when the prefix does not hold the package.
  const result = await ctx.runner.run('npm', ['ls', '-g', pkg, '--depth=0'])
  return result.exitCode === 0
}

/** Uninstall a tool through the npm that installed it. */
export function npmUninstallStep(tool: ToolId, pkg: string): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.uninstall', params: { tool } },
    command: 'npm',
    args: ['uninstall', '-g', pkg],
  }
}

/** Delete a file or folder an installer put in place; a path that is not there changes nothing. */
export function removeStep(tool: ToolId, path: string): RemoveStep {
  return {
    kind: 'remove',
    title: { key: 'step.deleteFile', params: { tool, file: basename(path) } },
    path,
  }
}

/**
 * The uninstall steps of a tool ZCF installs from npm: `npm uninstall -g` when npm owns it,
 * else what its official uninstaller says (or `nativePaths` to delete), else a notice in
 * magpie's words — ZCF cannot tell how it was installed, so it leaves the binary alone.
 */
export async function npmUninstallSteps(
  tool: ToolId,
  pkg: string,
  ctx: AdapterContext,
  nativePaths: readonly string[] = [],
): Promise<{ steps: PlanStep[]; notices: Notice[] }> {
  if (await npmOwned(ctx, pkg)) return { steps: [npmUninstallStep(tool, pkg)], notices: [] }
  if (nativePaths.length > 0) return { steps: nativePaths.map(path => removeStep(tool, path)), notices: [] }
  return {
    steps: [],
    notices: [notice('warning', 'notice.foreignInstall', { tool })],
  }
}

/** The file step that takes ZCF's own keys out of a native config file. */
/**
 * The provider settings ZCF may take out on uninstall: a key goes only when the file still
 * holds exactly the value the config writes for it. Without a provider, or when a value
 * differs, the writing may be the user's own and stays, reported as `foreign`.
 */
export function ownedSettingKeys(
  keys: readonly string[],
  desired: Record<string, string | undefined> | undefined,
  current: Record<string, unknown>,
): { keys: string[]; foreign: boolean } {
  const owned: string[] = []
  let foreign = false
  for (const key of keys) {
    if (!(key in current)) continue
    if (desired?.[key] !== undefined && current[key] === desired[key]) owned.push(key)
    else foreign = true
  }
  return { keys: owned, foreign }
}

export function cleanConfigStep(tool: ToolId, path: string, format: FileFormat, edits: KeyEdit[]): FileStep {
  return {
    kind: 'file',
    title: { key: 'step.cleanConfig', params: { tool } },
    path,
    format,
    edits,
  }
}

export function notice(level: Notice['level'], key: string, params: Record<string, string | number> = {}): Notice {
  return { level, message: { key, params } }
}

/**
 * The notice for a tool with no language setting of its own, so nothing is written for it: with
 * `configLanguage` zh-CN the plan says so for that tool. English is what every tool does on its
 * own, so nothing is said.
 */
export function languageNotice(tool: ToolId, language: ConfigLanguage): Notice[] {
  return language === 'zh-CN' ? [notice('warning', 'notice.languageNotSupported', { tool, language })] : []
}

/** Compare two JSON-like values, ignoring key order. A `JsExpression` or `QuotedString` equals the string read back from a file. */
export function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (value: unknown): unknown => {
    if (value instanceof JsExpression || value instanceof QuotedString) return value.toJSON()
    if (Array.isArray(value)) return value.map(sorted)
    if (isTable(value))
      return Object.fromEntries(
        Object.keys(value)
          .toSorted()
          .map(key => [key, sorted(value[key])]),
      )
    return value
  }
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
}

/**
 * Environment variables that come with every `npx skills add`: on the China mirror, the
 * git configuration that clones from github.com through the mirror prefix. The skills CLI
 * and everything else the command does stay exactly as they are.
 */
export function skillsAddStep(
  { source, skills }: SkillSource,
  agent: string,
  gitMirrorEnv: Record<string, string>,
  /** The source as the user wrote it, shown in the title when the installed path differs, such as `zcf`. */
  display: string,
): CommandStep {
  return {
    kind: 'command',
    title: {
      key: 'step.skillsAdd',
      params: { source: display },
    },
    command: 'npx',
    args: ['-y', 'skills', 'add', source, '-g', '-y', '-a', agent, ...skills.flatMap(name => ['-s', name])],
    env: Object.keys(gitMirrorEnv).length > 0 ? gitMirrorEnv : undefined,
    // Tools apply in parallel, and concurrent `npx` runs of one package can break npx's shared cache.
    serial: 'npx-skills',
  }
}

export interface SkillsTarget {
  /** The `skills` CLI agent id, such as `claude-code` or `gemini-cli`. */
  agent: string
  /** The global skills folder the `skills` CLI installs into for that agent. */
  dir: string
}

/**
 * Whether the user's own git configuration already rewrites URLs (`url.<base>.insteadOf`
 * rules, from any config file). The mirror's rewrite is added only when it does not: git
 * prefers an env-injected rule over a file rule of the same match length, so injecting
 * anyway would shadow a proxy the user chose.
 */
export async function userRewritesGitUrls(ctx: AdapterContext): Promise<boolean> {
  const result = await ctx.runner.run('git', ['config', '--get-regexp', '^url\\.'])
  // Exit 1 is git's normal "no rule matches", not a failure. A git that cannot run at all
  // (missing, or its config broken) leaves the clone itself nothing to work with either,
  // so it counts as no rewrites too: the injected rule has nothing of the user's to shadow.
  return result.exitCode === 0
}

/**
 * Install skills with the `skills` CLI. A source that names its skills is skipped
 * once all of them are installed; one that installs everything always runs, since
 * the skills it holds are only known after fetching it.
 */
export async function skillSteps(
  sources: readonly SkillSource[],
  ctx: AdapterContext,
  target: SkillsTarget,
  /** The config's `configLanguage`: the language the tools work in, and so the one the built-in templates speak. */
  language: ConfigLanguage,
): Promise<CommandStep[]> {
  // The built-in `zcf` source installs from the language folder of the shipped templates;
  // every other source is passed to the skills CLI exactly as the user wrote it.
  const each = sources.map(source => {
    const installed =
      ctx.builtinSkillsDir && source.source === BUILTIN_SKILLS_SOURCE
        ? { ...source, source: builtinSkillsPath(ctx.builtinSkillsDir, language) }
        : source
    return [installed, source.source] as const
  })
  const isInstalled = async (name: string) => (await ctx.readFile(join(target.dir, name, 'SKILL.md'))) !== undefined
  const needed = await Promise.all(
    each.map(
      async ([source]) =>
        source.skills.length === 0 || (await Promise.all(source.skills.map(isInstalled))).includes(false),
    ),
  )
  const pending = each.filter((_, index) => needed[index])
  if (pending.length === 0) return []
  const mirror = ctx.mirror ?? 'official'
  // Asking the user's git costs a process, so it happens only when a rewrite is on the table.
  const userRewrites = mirror === 'china' ? await userRewritesGitUrls(ctx) : false
  const gitMirrorEnv = githubMirrorEnv(mirror, ctx.env, userRewrites)
  return pending.map(([source, display]) => skillsAddStep(source, target.agent, gitMirrorEnv, display))
}

/** An environment variable as a path, or `undefined` when it is unset or blank. */
export function envPath(ctx: AdapterContext, name: string): string | undefined {
  return ctx.env[name]?.trim() || undefined
}
