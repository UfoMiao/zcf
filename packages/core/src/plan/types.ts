import type { ExtraId, ToolId } from '../schema/config'

/** Who a plan belongs to: a coding tool, or an optional companion tool such as a gateway. */
export type PlanActor = ToolId | ExtraId

/** A translatable message. Core never formats text for people; front ends look up `key`. */
export interface Message {
  key: string
  params?: Record<string, string | number>
}

export type KeyPath = readonly (string | number)[]

/** Set `path` to `value`; `value: undefined` removes the key. */
export interface KeyEdit {
  path: KeyPath
  value: unknown
}

/**
 * `env` is a dotenv file of `KEY=value` lines; its key paths have one element, the variable name.
 * In `yaml` key paths, numbers index sequences, so an edit can target an entry of a top-level list.
 */
export type FileFormat = 'json' | 'toml' | 'env' | 'yaml'

/** Run one of the tool's own commands (or another mainstream CLI such as `npx skills`). */
export interface CommandStep {
  kind: 'command'
  title: Message
  command: string
  args: string[]
  /** Extra environment variables for the command, such as the mirror's npm registry. Never shown to people. */
  env?: Record<string, string>
  /** Files the command changes; they are backed up before it runs. */
  touches?: string[]
  /** Commands with the same key run one at a time, even across tools that apply in parallel. */
  serial?: string
  /**
   * Run only when an earlier step of the same tool failed, and skip otherwise: npm after a
   * tool's own updater, which recovers an npm install whose updater broke.
   */
  fallback?: boolean
}

/** Change specific keys in a native config file, keeping the rest of the file as it is. */
export interface FileStep {
  kind: 'file'
  title: Message
  path: string
  format: FileFormat
  edits: KeyEdit[]
}

/**
 * Delete a file or folder the tool's installer put in place, such as a native binary.
 * It is copied to the backup folder first, and a path that does not exist is `unchanged`.
 */
export interface RemoveStep {
  kind: 'remove'
  title: Message
  path: string
}

/**
 * Copy a file ZCF ships, such as an agent or output-style template, into the user's
 * config. Content-identical copies count as `unchanged`, so a rerun after a template
 * update refreshes the file and a rerun without one does nothing.
 */
export interface CopyStep {
  kind: 'copy'
  title: Message
  from: string
  to: string
}

export type PlanStep = CommandStep | FileStep | RemoveStep | CopyStep

export interface Notice {
  level: 'info' | 'warning'
  message: Message
}

export interface ToolPlan {
  tool: PlanActor
  steps: PlanStep[]
  notices: Notice[]
  /** The version installed when the plan was made, where known; update plans set it. */
  version?: string
}

export interface Plan {
  tools: ToolPlan[]
}
