import { rm, stat } from 'node:fs/promises'

import type { CommandRunner } from '../exec/runner'
import { BackupRun } from '../io/backup'
import { writeFileAtomic } from '../io/fs'
import { previewCopyStep, previewFileStep } from './diff'
import type { Plan, PlanActor, PlanStep, ToolPlan } from './types'

export type StepStatus = 'done' | 'unchanged' | 'failed' | 'skipped'

export interface StepResult {
  step: PlanStep
  status: StepStatus
  /** Error text for a failed step. */
  detail?: string
  /** Where the previous version of a changed file was copied, when one existed. */
  backup?: string
}

export interface ToolResult {
  tool: PlanActor
  ok: boolean
  steps: StepResult[]
}

export type ApplyEvent =
  | { type: 'step-start'; tool: PlanActor; index: number; step: PlanStep }
  | { type: 'step-end'; tool: PlanActor; index: number; result: StepResult }

export interface ApplyOptions {
  runner: CommandRunner
  /** Folder for this run's file snapshots; nothing is created there unless an existing file changes. */
  backupDir: string
  /** Files under `home` are backed up relative to it, e.g. `<backupDir>/.claude/settings.json`. */
  home?: string
  onEvent?: (event: ApplyEvent) => void
}

// `npm notice` lines, possibly colored, which would otherwise hide the real error.
// oxlint-disable-next-line no-control-regex
const NPM_NOTICE = /^(?:\u001B\[[\d;]*m)*npm notice/

// The line Node prints above a stack trace, such as `Error: Cannot find module '…'`.
const ERROR_LINE = /^\w*Error: /

/** The end of a command's output, leaving out npm's notices; with `notices`, those too. */
function lastLines(text: string, notices = false, count = 5): string {
  const lines = notices
    ? text.trim().split(/\r?\n/)
    : text
        .trim()
        .split(/\r?\n/)
        .filter(line => !NPM_NOTICE.test(line))
  const tail = lines.slice(-count)
  // A stack trace would push the error message itself out of the tail.
  const error = lines.slice(0, -count).find(line => ERROR_LINE.test(line))
  return (error ? [error, ...tail] : tail).join('\n').trim()
}

/** What one apply run shares across tools. */
interface RunState {
  /** Each file's backup, taken once per run before its first change. */
  backup: BackupRun
  /** The last queued command for each `serial` key. */
  queues: Map<string, Promise<unknown>>
}

/** Run `task` after every earlier task with the same key has finished. */
function serialized<T>(queues: RunState['queues'], key: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).then(task)
  queues.set(
    key,
    next.catch(() => undefined),
  )
  return next
}

async function runStep(step: PlanStep, options: ApplyOptions, state: RunState): Promise<StepResult> {
  // Back a file up once per run, before its first change.
  const snapshot = (path: string) => state.backup.snapshot(path)

  try {
    if (step.kind === 'command') {
      const backups = await Promise.all((step.touches ?? []).map(snapshot))
      const backup = backups.find(path => path !== undefined)
      const run = () => options.runner.run(step.command, step.args, step.env ? { env: step.env } : undefined)
      const result = await (step.serial ? serialized(state.queues, step.serial, run) : run())
      if (result.exitCode === 0) return { step, status: 'done', backup }
      const detail =
        lastLines(result.stderr) ||
        lastLines(result.stdout) ||
        lastLines(result.stderr, true) ||
        `exit code ${result.exitCode ?? 'unknown'}`
      return { step, status: 'failed', detail, backup }
    }

    if (step.kind === 'remove') {
      const info = await stat(step.path).catch(() => undefined)
      // A missing path counts as done work of the past: a best-effort removal must not fail the tool.
      if (info === undefined) return { step, status: 'unchanged' }
      // The binary is copied to the backups; a folder holds only versions the tool downloads again.
      const backup = info.isFile() ? await snapshot(step.path) : undefined
      await rm(step.path, { recursive: true, force: true })
      return { step, status: 'done', backup }
    }

    if (step.kind === 'copy') {
      const preview = await previewCopyStep(step)
      // An unreadable template is a packaging bug; say so rather than emptying the target.
      if (preview.after === '') throw new Error(`template missing: ${step.from}`)
      if (!preview.changed) return { step, status: 'unchanged' }
      const backup = await snapshot(step.to)
      await writeFileAtomic(step.to, preview.after)
      return { step, status: 'done', backup }
    }

    const preview = await previewFileStep(step)
    if (!preview.changed) return { step, status: 'unchanged' }

    const backup = await snapshot(step.path)

    await writeFileAtomic(step.path, preview.after)
    return { step, status: 'done', backup }
  } catch (error) {
    return {
      step,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function applyToolPlan(toolPlan: ToolPlan, options: ApplyOptions, state: RunState): Promise<ToolResult> {
  const steps: StepResult[] = []
  let failed = false

  for (const [index, step] of toolPlan.steps.entries()) {
    // Steps of one tool depend on each other, so after a failure only a fallback step runs;
    // a fallback step whose reason never happened (the updater worked) never runs either.
    if (failed !== (step.kind === 'command' && step.fallback === true)) {
      const result: StepResult = { step, status: 'skipped' }
      steps.push(result)
      options.onEvent?.({
        type: 'step-end',
        tool: toolPlan.tool,
        index,
        result,
      })
      continue
    }

    options.onEvent?.({
      type: 'step-start',
      tool: toolPlan.tool,
      index,
      step,
    })
    // Steps of one tool depend on each other, so they run one after another.
    // oxlint-disable-next-line no-await-in-loop
    const result = await runStep(step, options, state)
    steps.push(result)
    options.onEvent?.({
      type: 'step-end',
      tool: toolPlan.tool,
      index,
      result,
    })
    failed = result.status === 'failed'
  }

  return { tool: toolPlan.tool, ok: !failed, steps }
}

/**
 * Apply a plan. Tools run in parallel; the steps of one tool run in order, and
 * the first failure skips the rest of that tool's steps (later steps usually
 * depend on earlier ones, such as configuring a tool that failed to install),
 * except a step marked `fallback`, which runs in the failed step's place —
 * npm after a tool's own updater. What the run backed up is described in a
 * manifest in the backup folder, written even when a listener throws.
 */
export async function applyPlan(plan: Plan, options: ApplyOptions): Promise<ToolResult[]> {
  const state: RunState = { backup: new BackupRun(options.backupDir, options.home), queues: new Map() }
  try {
    return await Promise.all(plan.tools.map(toolPlan => applyToolPlan(toolPlan, options, state)))
  } finally {
    await state.backup.finish()
  }
}
