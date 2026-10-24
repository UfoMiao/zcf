import type { CommandRunner } from '../exec/runner'
import type { ToolPlan } from '../plan/types'
import type { ToolId, ZcfConfig } from '../schema/config'

export interface AdapterContext {
  home: string
  platform: NodeJS.Platform
  /** Environment variables tools read their locations from, such as `CLAUDE_CONFIG_DIR`. */
  env: Record<string, string | undefined>
  runner: CommandRunner
  readFile: (path: string) => Promise<string | undefined>
}

export interface ToolStatus {
  installed: boolean
  version?: string
  /** How later steps should call the tool. After a fresh install this may be an absolute path not yet on PATH. */
  command: string
}

export interface ToolAdapter {
  id: ToolId
  displayName: string
  detect: (ctx: AdapterContext) => Promise<ToolStatus>
  /** Steps that bring the tool in line with the ZCF config, installing it first when needed. */
  plan: (config: ZcfConfig, status: ToolStatus, ctx: AdapterContext) => Promise<ToolPlan>
  /** Update the tool with its own updater. */
  planUpdate: (status: ToolStatus, ctx: AdapterContext) => ToolPlan
}
