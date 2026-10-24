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
  /** Where the previous version of the file was copied, for a file step that changed an existing file. */
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
  try {
    if (step.kind === 'command') {
      const result = await options.runner.run(step.command, step.args)
      if (result.exitCode === 0) return { step, status: 'done' }
      const detail = lastLines(result.stderr) || lastLines(result.stdout) || `exit code ${result.exitCode ?? 'unknown'}`
      return { step, status: 'failed', detail }
    }

    const preview = await previewFileStep(step)
    if (!preview.changed) return { step, status: 'unchanged' }

    // Back a file up once per run, before its first change.
    if (!snapshots.has(step.path)) snapshots.set(step.path, snapshotFile(step.path, options.backupDir, options.home))
    const backup = await snapshots.get(step.path)

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
