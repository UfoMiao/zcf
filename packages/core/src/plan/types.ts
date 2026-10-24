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

export type FileFormat = 'json' | 'toml'

/** Run one of the tool's own commands (or another mainstream CLI such as `npx skills`). */
export interface CommandStep {
  kind: 'command'
  title: Message
  command: string
  args: string[]
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
}

export interface Plan {
  tools: ToolPlan[]
}
