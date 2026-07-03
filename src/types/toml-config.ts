import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { ClaudeCodeProfile } from './claude-code-config'
import type { CodeBuddyProfile } from './codebuddy-config'

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
  envKeyMigrated?: boolean // Whether env_key to temp_env_key migration has been completed
}

/**
 * CodeBuddy specific configuration
 * Features: API profile management (uses CodeBuddyProfile)
 */
export interface CodeBuddyConfig {
  enabled: boolean
  currentProfile?: string
  profiles?: Record<string, CodeBuddyProfile>
  version?: string
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
  codebuddy?: CodeBuddyConfig
}

/**
 * Partial configuration for updates
 */
export type PartialZcfTomlConfig = Partial<ZcfTomlConfig> & {
  general?: Partial<GeneralConfig>
  claudeCode?: Partial<ClaudeCodeConfig>
  codex?: Partial<CodexConfig>
  codebuddy?: Partial<CodeBuddyConfig>
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
