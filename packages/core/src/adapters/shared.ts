import { join } from 'pathe'

import { isTable, JsExpression } from '../io/editors'
import type { CommandStep, Notice } from '../plan/types'
import type { SkillSource, ToolId } from '../schema/config'
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

/** Install a tool that is published on npm, for tools whose official install is `npm install -g`. */
export function npmInstallStep(tool: ToolId, pkg: string): CommandStep {
  return {
    kind: 'command',
    title: { key: 'step.install', params: { tool } },
    command: 'npm',
    args: ['install', '-g', pkg],
  }
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

export function notice(level: Notice['level'], key: string, params: Record<string, string | number> = {}): Notice {
  return { level, message: { key, params } }
}

/** Compare two JSON-like values, ignoring key order. A `JsExpression` equals its source, as read back from a file. */
export function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (value: unknown): unknown => {
    if (value instanceof JsExpression) return value.source
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

export function skillsAddStep({ source, skills }: SkillSource, agent: string): CommandStep {
  return {
    kind: 'command',
    title: {
      key: 'step.skillsAdd',
      params: { source },
    },
    command: 'npx',
    args: ['-y', 'skills', 'add', source, '-g', '-y', '-a', agent, ...skills.flatMap(name => ['-s', name])],
  }
}

export interface SkillsTarget {
  /** The `skills` CLI agent id, such as `claude-code` or `gemini-cli`. */
  agent: string
  /** The global skills folder the `skills` CLI installs into for that agent. */
  dir: string
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
): Promise<CommandStep[]> {
  const isInstalled = async (name: string) => (await ctx.readFile(join(target.dir, name, 'SKILL.md'))) !== undefined
  const needed = await Promise.all(
    sources.map(
      async source => source.skills.length === 0 || (await Promise.all(source.skills.map(isInstalled))).includes(false),
    ),
  )
  return sources.filter((_, index) => needed[index]).map(source => skillsAddStep(source, target.agent))
}

/** An environment variable as a path, or `undefined` when it is unset or blank. */
export function envPath(ctx: AdapterContext, name: string): string | undefined {
  return ctx.env[name]?.trim() || undefined
}
