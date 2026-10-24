import type { ConfigIssue, FilePreview, Plan, StepResult, ToolId, ToolResult, ToolStatus } from '@zcf/core'

import type { Draft } from './draft'

export interface LoadedConfig {
  path: string
  /** Missing when the file cannot be parsed; `issues` then says why. */
  draft?: Draft
  exists: boolean
  issues: ConfigIssue[]
}

export interface PlanView {
  plan: Plan
  /** File previews by tool and step index, matching `plan.tools[i].steps[j]`; empty for command steps. */
  previews: (FilePreview | null)[][]
  /** Values the front end must mask wherever it shows plan or apply output. */
  secrets: string[]
}

export interface StepEvent {
  tool: ToolId
  index: number
  result: StepResult
}

export interface ApplyOutcome {
  results: ToolResult[]
  backupDir: string
}

/**
 * Everything a front end needs from ZCF. The terminal UI calls core directly; the
 * web UI reaches the same functions over a local HTTP API.
 */
export interface ZcfService {
  load: () => Promise<LoadedConfig>
  save: (draft: Draft) => Promise<void>
  detect: (tools: readonly ToolId[]) => Promise<Partial<Record<ToolId, ToolStatus>>>
  /** Plan the saved config. */
  plan: () => Promise<PlanView>
  /** Apply the saved config, reporting each finished step. */
  apply: (onStep?: (event: StepEvent) => void) => Promise<ApplyOutcome>
}
