import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'

/**
 * Claude Code installation information
 */
export interface ClaudeCodeInstallation {
  type: 'global' | 'local'
  path: string
  configDir: string
}

/**
 * Codex installation information
 */
export interface CodexInstallation {
  type: 'global' | 'local'
  path: string
  configDir: string
}

/**
 * Claude Code specific configuration
 * Features: Multiple output styles selection
 */
export interface ClaudeCodeConfig {
  enabled: boolean
  outputStyles: string[]
  defaultOutputStyle?: string
  installation: ClaudeCodeInstallation
}

/**
 * Codex specific configuration
 * Features: Single system prompt style selection
 */
export interface CodexConfig {
  enabled: boolean
  systemPromptStyle: string
  installation: CodexInstallation
}

/**
 * General ZCF configuration
 */
export interface GeneralConfig {
  preferredLang: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  currentTool: CodeToolType
}

/**
 * Complete ZCF TOML configuration structure
 */
export interface ZcfTomlConfig {
  version: string
  lastUpdated: string
  general: GeneralConfig
  claudeCode: ClaudeCodeConfig
  codex: CodexConfig
}

/**
 * Partial configuration for updates
 */
export type PartialZcfTomlConfig = Partial<ZcfTomlConfig> & {
  general?: Partial<GeneralConfig>
  claudeCode?: Partial<ClaudeCodeConfig>
  codex?: Partial<CodexConfig>
}

/**
 * Migration result from JSON to TOML
 */
export interface TomlConfigMigrationResult {
  migrated: boolean
  source?: string
  target: string
  removed: string[]
  backupPath?: string
}
