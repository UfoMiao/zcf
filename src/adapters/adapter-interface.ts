import type { AiOutputLanguage, SupportedLang } from '../constants'

/**
 * Unique identifier for an agent adapter.
 */
export type AgentId = string

/**
 * Context passed to adapter lifecycle methods.
 */
export interface AgentContext {
  /** UI / template language */
  lang: SupportedLang
  /** Force overwrite existing files */
  force?: boolean
  /** Non-interactive mode */
  skipPrompt?: boolean
  /** Allow adapters to receive extra context without changing the interface */
  [key: string]: unknown
}

/**
 * Supported configuration file formats.
 */
export type ConfigFileFormat = 'json' | 'toml' | 'markdown' | 'yaml'

/**
 * Merge strategy used by the template engine when writing a config file.
 */
export type ConfigMergeStrategy = 'copy' | 'merge' | 'overwrite' | 'append' | 'skip'

/**
 * Specification of a single configuration file managed by an adapter.
 */
export interface AgentConfigFile {
  /** Logical id, e.g. 'settings', 'claude-md' */
  id: string
  /** Absolute or home-relative destination path */
  path: string
  /** File format used for merge/render logic */
  format: ConfigFileFormat
  /** How the template engine should combine template and existing user content */
  mergeStrategy: ConfigMergeStrategy
  /** Whether this file is a skill manifest (SKILL.md) */
  isSkillManifest?: boolean
}

/**
 * Skill metadata parsed from SKILL.md YAML frontmatter.
 * Index signature allows agent-specific extensions without interface churn.
 */
export interface SkillMeta {
  name: string
  description?: string
  version?: string
  /** Namespace for grouping skills, e.g. 'zcf' for project-internal skills */
  namespace?: string
  /** When true the model should not auto-invoke the skill */
  disableModelInvocation?: boolean
  /** Agent-specific extension fields */
  [key: string]: unknown
}

/**
 * A resolved skill package ready to be rendered to the target directory.
 */
export interface SkillPackage {
  meta: SkillMeta
  /** Markdown body of the skill (the prompt/instruction content) */
  body: string
  /** Source template path */
  sourcePath: string
  /** Destination path after installation */
  targetPath: string
}

/**
 * Skill directory convention for an agent.
 */
export interface AgentSkillSpec {
  /** Root directory where skills are installed, e.g. ~/.claude/skills/ */
  skillsDir: string
  /** Filename used for skill manifests */
  manifestName: 'SKILL.md'
  /** Supported installation scopes */
  scopes: Array<'global' | 'project'>
  /** Optional transformation applied to each skill before rendering */
  transform?: (skill: SkillPackage) => SkillPackage
}

/**
 * Install options passed to adapter.install().
 * Kept intentionally close to InitOptions but independent to avoid cycles.
 */
export interface InstallOptions {
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

/**
 * Update options passed to adapter.update().
 */
export interface UpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  skipPrompt?: boolean
}

/**
 * Uninstall options passed to adapter.uninstall().
 */
export interface UninstallOptions {
  lang?: SupportedLang
  mode?: 'complete' | 'custom' | 'interactive'
  items?: string[] | string
}

/**
 * Result returned by checkUpdates().
 */
export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion?: string
  latestVersion?: string
  message?: string
}

/**
 * Configuration item returned by listConfigurations().
 */
export interface ConfigItem {
  id: string
  name: string
  isActive?: boolean
}

/**
 * Core adapter interface implemented by every agent integration.
 *
 * Phase 0-2 (UFO-131) keeps adapters as thin wrappers over existing utils.
 * Phase 3-4 (UFO-132) migrates business logic into adapter methods.
 */
export interface AgentAdapter {
  /** Canonical agent id, e.g. 'claude-code', 'codex', 'opencode' */
  id: AgentId
  /** Human-readable name */
  displayName: string
  /** Aliases accepted on the CLI, e.g. ['cc'] for claude-code */
  aliases: string[]
  /** Agent home directory, e.g. ~/.claude */
  homeDir: string
  /** Configuration files managed by this adapter */
  configFiles: AgentConfigFile[]
  /** Directory containing agent-specific templates */
  templateDir: string
  /** Skill installation convention */
  skillSpec: AgentSkillSpec

  /** Return true if the agent CLI is installed */
  isInstalled: () => Promise<boolean> | boolean

  /** Full initialization flow */
  install: (options: InstallOptions, ctx: AgentContext) => Promise<void>

  /** Update templates/workflows without full reinstall */
  update: (options: UpdateOptions, ctx: AgentContext) => Promise<void>

  /** Remove agent-specific ZCF-managed configuration */
  uninstall: (options: UninstallOptions, ctx: AgentContext) => Promise<void>

  /**
   * Create a timestamped backup of a configuration file before it is modified.
   *
   * Returns the backup path on success, or null when no backup was needed
   * (e.g. the target file does not exist yet).
   */
  backup: (file: AgentConfigFile) => Promise<string | null>

  /** Optional: list available configurations (providers/profiles) */
  listConfigurations?: () => Promise<ConfigItem[]>

  /** Optional: switch to a named configuration */
  switchConfiguration?: (target: string, ctx: AgentContext) => Promise<void>

  /** Optional: check for agent CLI updates */
  checkUpdates?: (ctx: AgentContext) => Promise<UpdateCheckResult>
}

/**
 * Feature flags an adapter may advertise.
 */
export type AdapterFeature = 'install' | 'update' | 'uninstall' | 'configSwitch' | 'checkUpdates' | 'skills'
