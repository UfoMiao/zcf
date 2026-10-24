import type {
  ConfigIssue,
  FilePreview,
  Mirror,
  Plan,
  PresetList,
  StepResult,
  ToolId,
  ToolResult,
  ToolStatus,
} from '@zcf/core'

import type { Draft } from './draft'

export interface LoadedConfig {
  path: string
  /** Missing when the file cannot be parsed; `issues` then says why. */
  draft?: Draft
  exists: boolean
  issues: ConfigIssue[]
  /** The mirror `ZCF_MIRROR` picks for this process, which outranks the config's `mirror`. */
  envMirror?: Mirror
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
  /**
   * Save `draft`, writing only what changed since `base`, the draft this editor last loaded or
   * saved. Without it, the file is compared as it is now.
   */
  save: (draft: Draft, base?: Draft) => Promise<void>
  detect: (tools: readonly ToolId[]) => Promise<Partial<Record<ToolId, ToolStatus>>>
  /** Plan the saved config. */
  plan: () => Promise<PlanView>
  /** Provider presets, fetched from the ZCF repository and cached; `refresh` skips a fresh copy. */
  presets: (refresh?: boolean) => Promise<PresetList>
  /** Apply the saved config, reporting each finished step. */
  apply: (onStep?: (event: StepEvent) => void) => Promise<ApplyOutcome>
}
