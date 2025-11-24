import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { ClaudeCodeProfile } from './claude-code-config'

/**
 * Claude Code specific configuration
 * Features: Multiple output styles selection
 */
export interface ClaudeCodeConfig {
  enabled: boolean
  outputStyles: string[]
  defaultOutputStyle?: string
  installType: 'global' | 'local'
  installMethod?: 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd' | 'native'
  currentProfile?: string
  profiles?: Record<string, ClaudeCodeProfile>
  version?: string
}

/**
 * Codex specific configuration
 * Features: Single system prompt style selection
 * Note: Codex only supports global installation
 */
export interface CodexConfig {
  enabled: boolean
  systemPromptStyle: string
  installMethod?: 'npm' | 'homebrew' | 'native'
}

/**
 * General ZCF configuration
 */
export interface GeneralConfig {
  preferredLang: SupportedLang
  templateLang?: SupportedLang
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
