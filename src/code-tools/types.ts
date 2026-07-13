import type { AiOutputLanguage, SupportedLang } from '../constants'

/**
 * Canonical code-tool identifiers. Extend this union when adding adapters.
 */
export type CodeToolId = 'claude-code' | 'codex'

export type ConfigFileFormat = 'json' | 'toml' | 'markdown' | 'yaml'
export type ConfigMergeStrategy = 'copy' | 'merge' | 'overwrite' | 'append' | 'skip'

export interface CodeToolConfigFile {
  id: string
  path: string
  format: ConfigFileFormat
  mergeStrategy: ConfigMergeStrategy
  isSkillManifest?: boolean
}

export interface CodeToolPaths {
  homeDir: string
  configFiles: CodeToolConfigFile[]
  skillsDir?: string
  templateDir: string
}

export interface CodeToolContext {
  lang: SupportedLang
  force?: boolean
  skipPrompt?: boolean
}

/**
 * Init options passed to adapter.init(). Mirrors InitOptions from commands/init.ts.
 */
export interface CodeToolInitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string
  apiUrl?: string
  apiModel?: string
  apiHaikuModel?: string
  apiSonnetModel?: string
  apiOpusModel?: string
  provider?: string
  mcpServices?: string[] | string | boolean
  workflows?: string[] | string | boolean
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string
  installCometixLine?: string | boolean
  apiConfigs?: string
  apiConfigsFile?: string
}

export interface CodeToolUpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  skipPrompt?: boolean
}

export interface CodeToolUninstallOptions {
  lang?: SupportedLang
  mode?: 'complete' | 'custom' | 'interactive'
  items?: string[] | string
}

export interface ConfigItem {
  id: string
  name: string
  isActive?: boolean
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion?: string
  latestVersion?: string
}

/**
 * Plugin contract for an agent CLI integration.
 *
 * Phase 1 keeps adapters as thin facades over existing utils/commands.
 * Business logic migrates into adapters incrementally (see docs/adr/001-code-tool-plugin-architecture.md).
 */
export interface CodeToolAdapter {
  readonly id: CodeToolId
  readonly displayName: string
  readonly aliases: readonly string[]
  readonly banner: string
  readonly paths: CodeToolPaths
  /** skills CLI agent identifiers used by workflow/skills install */
  readonly skillsAgents: readonly string[]
  detectInstalled: () => Promise<boolean>
  /**
   * Full initialization. Codex implements this; Claude Code still flows through
   * commands/init.ts until Phase 2 migration.
   */
  init?: (options: CodeToolInitOptions, ctx: CodeToolContext) => Promise<AiOutputLanguage | string | undefined | void>
  update: (options: CodeToolUpdateOptions, ctx: CodeToolContext) => Promise<void>
  uninstall: (options: CodeToolUninstallOptions, ctx: CodeToolContext) => Promise<void>
  backup?: (file: CodeToolConfigFile) => Promise<string | null>
  listConfigurations?: () => Promise<ConfigItem[]>
  switchConfiguration?: (target: string, ctx: CodeToolContext) => Promise<void>
  checkUpdates?: (ctx: CodeToolContext) => Promise<UpdateCheckResult>
}
