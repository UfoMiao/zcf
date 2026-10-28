import type { CommandRunner } from '../exec/runner'
import type { Mirror } from '../mirror'
import type { ToolPlan } from '../plan/types'
import type { Provider, ToolId, ZcfConfig } from '../schema/config'

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
  /**
   * The folder of the built-in skill templates ZCF ships, such as `<zcf>/dist/templates/skills`.
   * The `zcf` skill source installs from the language folder inside it; without it that source
   * is passed to the skills CLI as written.
   */
  builtinSkillsDir?: string
  /** The built-in agent templates, such as `<zcf>/dist/templates/agents`; same layout as the skills. */
  builtinAgentsDir?: string
  /** The built-in output-style templates, such as `<zcf>/dist/templates/output-styles`. */
  builtinOutputStylesDir?: string
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
   * uninstaller, or deleting the native binary) and the settings ZCF wrote for it. The
   * provider says what ZCF wrote; without it, or for a value that differs, a setting may
   * be the user's own and stays. Keys ZCF cannot tell apart from the tool's own, MCP
   * servers and skills are left alone.
   */
  planUninstall: (status: ToolStatus, ctx: AdapterContext, provider: Provider | undefined) => Promise<ToolPlan>
}
