import type { SupportedLang } from '../constants'
import type {
  ClaudeCodeInstallation,
  CodexInstallation,
  PartialZcfTomlConfig,
  ZcfTomlConfig,
} from '../types/toml-config'
import { homedir } from 'node:os'
import process from 'node:process'
import { dirname, join } from 'pathe'
import { parse, stringify } from 'smol-toml'
import { CODE_TOOL_TYPES, DEFAULT_CODE_TOOL_TYPE, SUPPORTED_LANGS } from '../constants'
import { ensureDir, exists, readFile, writeFile } from './fs-operations'
import { getPlatform, getTermuxPrefix, isTermux, isWSL } from './platform'

/**
 * Validation result interface
 */
export interface TomlConfigValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Read TOML configuration from file
 * @param configPath - Path to the TOML configuration file
 * @returns Parsed TOML configuration or null if not found/invalid
 */
export function readTomlConfig(configPath: string): ZcfTomlConfig | null {
  try {
    if (!exists(configPath)) {
      return null
    }

    const content = readFile(configPath)
    const parsed = parse(content) as unknown as ZcfTomlConfig
    return parsed
  }
  catch {
    // Handle parsing errors gracefully
    return null
  }
}

/**
 * Write TOML configuration to file
 * @param configPath - Path to the TOML configuration file
 * @param config - Configuration object to write
 */
export function writeTomlConfig(configPath: string, config: ZcfTomlConfig): void {
  try {
    // Ensure parent directory exists
    const configDir = dirname(configPath)
    ensureDir(configDir)

    // Serialize to TOML and write to file
    const tomlContent = stringify(config)
    writeFile(configPath, tomlContent)
  }
  catch {
    // Silently fail if cannot write config - user's system may have permission issues
    // The app should still work without saved preferences
  }
}

/**
 * Validate TOML configuration structure
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateTomlConfig(config: any): TomlConfigValidationResult {
  const errors: string[] = []

  // Check required top-level fields
  if (!config.version) {
    errors.push('Missing required field: version')
  }
  if (!config.lastUpdated) {
    errors.push('Missing required field: lastUpdated')
  }
  if (!config.general) {
    errors.push('Missing required field: general')
  }
  if (!config.claudeCode) {
    errors.push('Missing required field: claudeCode')
  }
  if (!config.codex) {
    errors.push('Missing required field: codex')
  }

  // Validate general section
  if (config.general) {
    if (!config.general.preferredLang) {
      errors.push('Missing required field: general.preferredLang')
    }
    else if (!SUPPORTED_LANGS.includes(config.general.preferredLang)) {
      errors.push(`Invalid preferredLang: ${config.general.preferredLang}`)
    }

    if (!config.general.currentTool) {
      errors.push('Missing required field: general.currentTool')
    }
    else if (!CODE_TOOL_TYPES.includes(config.general.currentTool)) {
      errors.push(`Invalid currentTool: ${config.general.currentTool}`)
    }
  }

  // Validate claudeCode section
  if (config.claudeCode) {
    if (typeof config.claudeCode.enabled !== 'boolean') {
      errors.push('claudeCode.enabled must be a boolean')
    }
    if (!Array.isArray(config.claudeCode.outputStyles)) {
      errors.push('claudeCode.outputStyles must be an array')
    }
    if (!config.claudeCode.installation || typeof config.claudeCode.installation !== 'object') {
      errors.push('claudeCode.installation is required and must be an object')
    }
  }

  // Validate codex section
  if (config.codex) {
    if (typeof config.codex.enabled !== 'boolean') {
      errors.push('codex.enabled must be a boolean')
    }
    if (!config.codex.systemPromptStyle || typeof config.codex.systemPromptStyle !== 'string') {
      errors.push('codex.systemPromptStyle is required and must be a string')
    }
    if (!config.codex.installation || typeof config.codex.installation !== 'object') {
      errors.push('codex.installation is required and must be an object')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Create default TOML configuration
 * @param preferredLang - Preferred language for the configuration
 * @returns Default configuration structure
 */
export function createDefaultTomlConfig(preferredLang: SupportedLang = 'en'): ZcfTomlConfig {
  // Use the proper platform utilities
  const platform = getPlatform()
  const isTermuxEnv = isTermux()
  const isWSLEnv = isWSL()
  const termuxPrefix = isTermuxEnv ? getTermuxPrefix() : undefined

  // Determine executable extension
  const exeExt = platform === 'windows' ? '.exe' : ''

  // Determine binary installation paths
  let claudeCodePath: string
  let codexPath: string
  let userHome: string

  if (isTermuxEnv) {
    // Termux specific paths
    const currentTermuxPrefix = termuxPrefix || '/data/data/com.termux/files/usr'
    claudeCodePath = join(currentTermuxPrefix, 'bin', `claude-code${exeExt}`)
    codexPath = join(currentTermuxPrefix, 'bin', `codex${exeExt}`)
    userHome = process.env.HOME || currentTermuxPrefix
  }
  else if (platform === 'windows') {
    // Windows specific paths
    claudeCodePath = `claude-code${exeExt}` // Rely on PATH resolution
    codexPath = `codex${exeExt}`
    userHome = process.env.USERPROFILE || process.env.HOME || homedir()
  }
  else {
    // Unix-like systems (macOS, Linux, WSL)
    claudeCodePath = `/usr/local/bin/claude-code${exeExt}`
    codexPath = `/usr/local/bin/codex${exeExt}`
    userHome = process.env.HOME || homedir()
  }

  // Platform-specific config directories
  let claudeConfigDir: string
  let codexConfigDir: string

  if (platform === 'windows' && !isWSLEnv) {
    // Windows uses AppData
    const appData = process.env.APPDATA || join(userHome, 'AppData', 'Roaming')
    claudeConfigDir = join(appData, 'Claude')
    codexConfigDir = join(appData, 'Codex')
  }
  else if (isTermuxEnv) {
    // Termux uses PREFIX-based paths
    claudeConfigDir = join(userHome, '.claude')
    codexConfigDir = join(userHome, '.codex')
  }
  else {
    // Unix-like systems (macOS, Linux, WSL)
    claudeConfigDir = join(userHome, '.claude')
    codexConfigDir = join(userHome, '.codex')
  }

  const defaultClaudeCodeInstallation: ClaudeCodeInstallation = {
    type: 'global',
    path: claudeCodePath,
    configDir: claudeConfigDir,
  }

  const defaultCodexInstallation: CodexInstallation = {
    type: 'global',
    path: codexPath,
    configDir: codexConfigDir,
  }

  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    general: {
      preferredLang,
      aiOutputLang: preferredLang === 'zh-CN' ? 'zh-CN' : undefined,
      currentTool: DEFAULT_CODE_TOOL_TYPE,
    },
    claudeCode: {
      enabled: true,
      outputStyles: ['engineer-professional'],
      defaultOutputStyle: 'engineer-professional',
      installation: defaultClaudeCodeInstallation,
    },
    codex: {
      enabled: false,
      systemPromptStyle: 'engineer-professional',
      installation: defaultCodexInstallation,
    },
  }
}

/**
 * Migrate from legacy JSON config to TOML format
 * @param jsonConfig - Legacy JSON configuration
 * @returns Migrated TOML configuration
 */
export function migrateFromJsonConfig(jsonConfig: any): ZcfTomlConfig {
  const defaultConfig = createDefaultTomlConfig()

  // Map JSON fields to TOML structure
  const tomlConfig: ZcfTomlConfig = {
    version: jsonConfig.version || defaultConfig.version,
    lastUpdated: jsonConfig.lastUpdated || new Date().toISOString(),
    general: {
      preferredLang: jsonConfig.preferredLang || defaultConfig.general.preferredLang,
      aiOutputLang: jsonConfig.aiOutputLang || defaultConfig.general.aiOutputLang,
      currentTool: jsonConfig.codeToolType || defaultConfig.general.currentTool,
    },
    claudeCode: {
      enabled: jsonConfig.codeToolType === 'claude-code',
      outputStyles: jsonConfig.outputStyles || defaultConfig.claudeCode.outputStyles,
      defaultOutputStyle: jsonConfig.defaultOutputStyle || defaultConfig.claudeCode.defaultOutputStyle,
      installation: jsonConfig.claudeCodeInstallation || defaultConfig.claudeCode.installation,
    },
    codex: {
      enabled: jsonConfig.codeToolType === 'codex',
      systemPromptStyle: jsonConfig.systemPromptStyle || defaultConfig.codex.systemPromptStyle,
      installation: jsonConfig.codexInstallation || defaultConfig.codex.installation,
    },
  }

  return tomlConfig
}

/**
 * Update partial TOML configuration
 * @param configPath - Path to the configuration file
 * @param updates - Partial updates to apply
 * @returns Updated configuration
 */
export function updateTomlConfig(configPath: string, updates: PartialZcfTomlConfig): ZcfTomlConfig {
  const existingConfig = readTomlConfig(configPath) || createDefaultTomlConfig()

  // Deep merge updates with existing configuration
  const updatedConfig: ZcfTomlConfig = {
    version: updates.version || existingConfig.version,
    lastUpdated: new Date().toISOString(),
    general: {
      ...existingConfig.general,
      ...updates.general,
    },
    claudeCode: {
      ...existingConfig.claudeCode,
      ...updates.claudeCode,
    },
    codex: {
      ...existingConfig.codex,
      ...updates.codex,
    },
  }

  writeTomlConfig(configPath, updatedConfig)
  return updatedConfig
}
