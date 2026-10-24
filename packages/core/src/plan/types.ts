import type { ToolId } from '../schema/config'

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
}

/** Change specific keys in a native config file, keeping the rest of the file as it is. */
export interface FileStep {
  kind: 'file'
  title: Message
  path: string
  format: FileFormat
  edits: KeyEdit[]
}

export type PlanStep = CommandStep | FileStep

export interface Notice {
  level: 'info' | 'warning'
  message: Message
}

export interface ToolPlan {
  tool: ToolId
  steps: PlanStep[]
  notices: Notice[]
  /** The version installed when the plan was made, where known; update plans set it. */
  version?: string
}

export interface Plan {
  tools: ToolPlan[]
}
