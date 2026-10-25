import type { CommandRunner } from '../exec/runner'
import type { Mirror } from '../mirror'
import type { ToolPlan } from '../plan/types'
import type { ToolId, ZcfConfig } from '../schema/config'

export interface AdapterContext {
  home: string
  platform: NodeJS.Platform
  /** Environment variables tools read their locations from, such as `CLAUDE_CONFIG_DIR`. */
  env: Record<string, string | undefined>
  runner: CommandRunner
  readFile: (path: string) => Promise<string | undefined>
  /**
   * The mirror chosen for this run, such as from a `--mirror` flag. When unset, `ZCF_MIRROR`
   * and then the config's `mirror` decide; adapters read the result through `planTools`.
   */
  mirror?: Mirror
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
  /**
   * Update the tool with its own updater, such as `claude update`. A tool ZCF also installs
   * from npm gets an npm step marked `fallback`, which runs when the updater fails.
   */
  planUpdate: (status: ToolStatus, ctx: AdapterContext) => Promise<ToolPlan>
  /**
   * Steps that remove the tool through its own uninstall channel (npm, the official
   * uninstaller, or deleting the native binary) and the settings ZCF wrote for it. Keys
   * ZCF cannot tell apart from the tool's own, MCP servers and skills are left alone.
   */
  planUninstall: (status: ToolStatus, ctx: AdapterContext) => Promise<ToolPlan>
}
