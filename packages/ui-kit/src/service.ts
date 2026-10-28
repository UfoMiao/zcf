import type {
  BackupInfo,
  ConfigIssue,
  FilePreview,
  Mirror,
  Plan,
  PlanActor,
  PresetList,
  RestoreResult,
  SkillSearchList,
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
  tool: PlanActor
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
  /** Search the community skills index for other people's skills to install. */
  searchSkills: (query: string) => Promise<SkillSearchList>
  /** Apply the saved config, reporting each finished step. */
  apply: (onStep?: (event: StepEvent) => void) => Promise<ApplyOutcome>
  /** The backups of files ZCF changed, newest first; an entry's `id` names it for the calls below. */
  backups: () => Promise<BackupInfo[]>
  /** Put a backup's files back. The files as they are now are backed up into a run of their
   * own first, and that run's id comes back, so the restore itself can be undone. */
  restoreBackup: (id: string) => Promise<RestoreResult>
  /** Remove the oldest backups beyond the newest `keep` (20 by default), returning their ids. */
  pruneBackups: (keep?: number) => Promise<string[]>
}
