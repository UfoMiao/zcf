import type { CommandRunner } from '../exec/runner'
import { snapshotFile, writeFileAtomic } from '../io/fs'
import type { ToolId } from '../schema/config'
import { previewFileStep } from './diff'
import type { Plan, PlanStep, ToolPlan } from './types'

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
  tool: ToolId
  ok: boolean
  steps: StepResult[]
}

export type ApplyEvent =
  | { type: 'step-start'; tool: ToolId; index: number; step: PlanStep }
  | { type: 'step-end'; tool: ToolId; index: number; result: StepResult }

export interface ApplyOptions {
  runner: CommandRunner
  /** Folder for this run's file snapshots; nothing is created there unless an existing file changes. */
  backupDir: string
  /** Files under `home` are backed up relative to it, e.g. `<backupDir>/.claude/settings.json`. */
  home?: string
  onEvent?: (event: ApplyEvent) => void
}

function lastLines(text: string, count = 5): string {
  return text.trim().split(/\r?\n/).slice(-count).join('\n')
}

async function runStep(
  step: PlanStep,
  options: ApplyOptions,
  snapshots: Map<string, Promise<string | undefined>>,
): Promise<StepResult> {
  // Back a file up once per run, before its first change.
  const snapshot = async (path: string) => {
    if (!snapshots.has(path)) snapshots.set(path, snapshotFile(path, options.backupDir, options.home))
    return snapshots.get(path)
  }

  try {
    if (step.kind === 'command') {
      const backups = await Promise.all((step.touches ?? []).map(snapshot))
      const backup = backups.find(path => path !== undefined)
      const result = await options.runner.run(step.command, step.args, step.env ? { env: step.env } : undefined)
      if (result.exitCode === 0) return { step, status: 'done', backup }
      const detail = lastLines(result.stderr) || lastLines(result.stdout) || `exit code ${result.exitCode ?? 'unknown'}`
      return { step, status: 'failed', detail, backup }
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

async function applyToolPlan(
  toolPlan: ToolPlan,
  options: ApplyOptions,
  snapshots: Map<string, Promise<string | undefined>>,
): Promise<ToolResult> {
  const steps: StepResult[] = []
  let failed = false

  for (const [index, step] of toolPlan.steps.entries()) {
    if (failed) {
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
    const result = await runStep(step, options, snapshots)
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
 * depend on earlier ones, such as configuring a tool that failed to install).
 */
export async function applyPlan(plan: Plan, options: ApplyOptions): Promise<ToolResult[]> {
  const snapshots = new Map<string, Promise<string | undefined>>()
  return Promise.all(plan.tools.map(toolPlan => applyToolPlan(toolPlan, options, snapshots)))
}
