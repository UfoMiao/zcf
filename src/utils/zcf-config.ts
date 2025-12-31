import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type {
  PartialZcfTomlConfig,
  ZcfTomlConfig,
} from '../types/toml-config'
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { dirname } from 'pathe'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, LEGACY_ZCF_CONFIG_FILES, SUPPORTED_LANGS, ZCF_CONFIG_DIR, ZCF_CONFIG_FILE } from '../constants'
import { ensureDir, exists, readFile, writeFile } from './fs-operations'
import { readJsonConfig } from './json-config'
import { batchEditToml, parseToml, stringifyToml } from './toml-edit'

// Legacy interfaces for backward compatibility
export interface ZcfConfig {
  version: string
  preferredLang: SupportedLang
  templateLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  outputStyles?: string[]
  defaultOutputStyle?: string
  codeToolType: CodeToolType
  lastUpdated: string
}

export interface ZcfConfigMigrationResult {
  migrated: boolean
  source?: string
  target: string
  removed: string[]
}

function isSupportedLang(value: any): value is SupportedLang {
  return SUPPORTED_LANGS.includes(value as SupportedLang)
}

function sanitizePreferredLang(lang: any): SupportedLang {
  return isSupportedLang(lang) ? lang : 'en'
}

function sanitizeCodeToolType(codeTool: any): CodeToolType {
  return isCodeToolType(codeTool) ? codeTool : DEFAULT_CODE_TOOL_TYPE
}

/**
 * Read TOML configuration from file
 * @param configPath - Path to the TOML configuration file
 * @returns Parsed TOML configuration or null if not found/invalid
 */
function readTomlConfig(configPath: string): ZcfTomlConfig | null {
  try {
    if (!exists(configPath)) {
      return null
    }

    const content = readFile(configPath)
    const parsed = parseToml<ZcfTomlConfig>(content)
    return parsed
  }
  catch {
    // Handle parsing errors gracefully
    return null
  }
}

/**
 * Update top-level TOML fields (version, lastUpdated) in content string
 * Since editToml only supports nested paths with dots, we handle top-level
 * fields manually using string operations to preserve formatting.
 *
 * This function:
 * - Updates existing top-level fields if they exist
 * - Adds missing top-level fields at the beginning of the file
 * - Preserves comments and formatting
 */
function updateTopLevelTomlFields(content: string, version: string, lastUpdated: string): string {
  let result = content

  // Update or add version field
  // Match version field at the start of a line (allowing leading whitespace)
  const versionRegex = /^(\s*)version\s*=\s*["'][^"']*["']/m
  const versionMatch = result.match(versionRegex)
  if (versionMatch) {
    // Update existing version, preserving indentation
    const indent = versionMatch[1] || ''
    result = result.replace(versionRegex, `${indent}version = "${version}"`)
  }
  else {
    // Add version at the beginning (before first section or at start)
    // Find the first non-comment, non-blank line or first section
    const firstContentMatch = result.match(/^(\s*)(?!#|\[)/m)
    if (firstContentMatch) {
      // Insert before first content line, preserving any leading comments
      const insertPos = firstContentMatch.index || 0
      result = `${result.slice(0, insertPos)}version = "${version}"\n${result.slice(insertPos)}`
    }
    else {
      // File is empty or only has comments/sections, add at the very beginning
      result = `version = "${version}"\n${result}`
    }
  }

  // Update or add lastUpdated field
  // Match lastUpdated field at the start of a line (allowing leading whitespace)
  const lastUpdatedRegex = /^(\s*)lastUpdated\s*=\s*["'][^"']*["']/m
  const lastUpdatedMatch = result.match(lastUpdatedRegex)
  if (lastUpdatedMatch) {
    // Update existing lastUpdated, preserving indentation
    const indent = lastUpdatedMatch[1] || ''
    result = result.replace(lastUpdatedRegex, `${indent}lastUpdated = "${lastUpdated}"`)
  }
  else {
    // Add lastUpdated after version (or at beginning if version doesn't exist)
    const versionLineMatch = result.match(/^(\s*)version\s*=\s*["'][^"']*["']/m)
    if (versionLineMatch) {
      // Find the end of the version line (including newline)
      const versionEnd = (versionLineMatch.index || 0) + versionLineMatch[0].length
      // Check if there's already a newline after version
      const hasNewline = result[versionEnd] === '\n'
      const newline = hasNewline ? '' : '\n'
      result = `${result.slice(0, versionEnd)}${newline}lastUpdated = "${lastUpdated}"\n${result.slice(versionEnd)}`
    }
    else {
      // No version field, add lastUpdated at the beginning
      const firstContentMatch = result.match(/^(\s*)(?!#|\[)/m)
      if (firstContentMatch) {
        const insertPos = firstContentMatch.index || 0
        result = `${result.slice(0, insertPos)}lastUpdated = "${lastUpdated}"\n${result.slice(insertPos)}`
      }
      else {
        result = `lastUpdated = "${lastUpdated}"\n${result}`
      }
    }
  }

  return result
}

/**
 * Write TOML configuration to file with format preservation
 * @param configPath - Path to the TOML configuration file
 * @param config - Configuration object to write
 *
 * If the file exists, uses incremental editing to preserve user comments,
 * formatting, and any unmanaged fields. If the file doesn't exist, creates
 * a new file with the full configuration.
 *
 * Top-level fields (version, lastUpdated) are updated after incremental editing
 * using string operations since editToml only supports nested paths with dots.
 */
function writeTomlConfig(configPath: string, config: ZcfTomlConfig): void {
  try {
    // Ensure parent directory exists
    const configDir = dirname(configPath)
    ensureDir(configDir)

    // Check if file exists for incremental editing
    if (exists(configPath)) {
      const existingContent = readFile(configPath)

      // Build edits for section fields only (editToml requires nested paths with dots)
      const edits: Array<[string, unknown]> = [
        // General section
        ['general.preferredLang', config.general.preferredLang],
        ['general.currentTool', config.general.currentTool],
      ]

      // Optional general fields
      if (config.general.templateLang !== undefined) {
        edits.push(['general.templateLang', config.general.templateLang])
      }
      if (config.general.aiOutputLang !== undefined) {
        edits.push(['general.aiOutputLang', config.general.aiOutputLang])
      }

      // Claude Code section
      edits.push(
        ['claudeCode.enabled', config.claudeCode.enabled],
        ['claudeCode.outputStyles', config.claudeCode.outputStyles],
        ['claudeCode.defaultOutputStyle', config.claudeCode.defaultOutputStyle],
        ['claudeCode.installType', config.claudeCode.installType],
        ['claudeCode.currentProfile', config.claudeCode.currentProfile],
        ['claudeCode.profiles', config.claudeCode.profiles],
      )

      // Optional Claude Code fields
      if (config.claudeCode.version !== undefined) {
        edits.push(['claudeCode.version', config.claudeCode.version])
      }

      // Codex section
      edits.push(
        ['codex.enabled', config.codex.enabled],
        ['codex.systemPromptStyle', config.codex.systemPromptStyle],
      )

      try {
        // Apply incremental edits preserving user customizations
        let updatedContent = batchEditToml(existingContent, edits)

        // Update top-level fields (version, lastUpdated) which cannot be edited incrementally
        updatedContent = updateTopLevelTomlFields(
          updatedContent,
          config.version,
          config.lastUpdated,
        )

        writeFile(configPath, updatedContent)
      }
      catch {
        // Fall back to full stringify if incremental editing fails
        const tomlContent = stringifyToml(config as unknown as Record<string, unknown>)
        writeFile(configPath, tomlContent)
      }
    }
    else {
      // Create new file with full configuration
      const tomlContent = stringifyToml(config as unknown as Record<string, unknown>)
      writeFile(configPath, tomlContent)
    }
  }
  catch {
    // Silently fail if cannot write config - user's system may have permission issues
    // The app should still work without saved preferences
  }
}

/**
 * Create default TOML configuration
 * @param preferredLang - Preferred language for the configuration
 * @param claudeCodeInstallType - Claude Code installation type (global or local)
 * @returns Default configuration structure
 */
function createDefaultTomlConfig(preferredLang: SupportedLang = 'en', claudeCodeInstallType: 'global' | 'local' = 'global'): ZcfTomlConfig {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    general: {
      preferredLang,
      templateLang: preferredLang, // Default templateLang to preferredLang for new installations
      aiOutputLang: preferredLang === 'zh-CN' ? 'zh-CN' : undefined,
      currentTool: DEFAULT_CODE_TOOL_TYPE,
    },
    claudeCode: {
      enabled: true,
      outputStyles: ['engineer-professional'],
      defaultOutputStyle: 'engineer-professional',
      installType: claudeCodeInstallType,
      currentProfile: '',
      profiles: {},
    },
    codex: {
      enabled: false,
      systemPromptStyle: 'engineer-professional',
    },
  }
}

/**
 * Migrate from legacy JSON config to TOML format
 * @param jsonConfig - Legacy JSON configuration
 * @returns Migrated TOML configuration
 */
function migrateFromJsonConfig(jsonConfig: any): ZcfTomlConfig {
  // Extract install type from old installation config
  const claudeCodeInstallType = jsonConfig.claudeCodeInstallation?.type || 'global'
  const defaultConfig = createDefaultTomlConfig('en', claudeCodeInstallType)

  // Map JSON fields to TOML structure
  const tomlConfig: ZcfTomlConfig = {
    version: jsonConfig.version || defaultConfig.version,
    lastUpdated: jsonConfig.lastUpdated || new Date().toISOString(),
    general: {
      preferredLang: jsonConfig.preferredLang || defaultConfig.general.preferredLang,
      templateLang: jsonConfig.templateLang || jsonConfig.preferredLang || defaultConfig.general.preferredLang, // Backward compatibility: use preferredLang as default
      aiOutputLang: jsonConfig.aiOutputLang || defaultConfig.general.aiOutputLang,
      currentTool: jsonConfig.codeToolType || defaultConfig.general.currentTool,
    },
    claudeCode: {
      enabled: jsonConfig.codeToolType === 'claude-code',
      outputStyles: jsonConfig.outputStyles || defaultConfig.claudeCode.outputStyles,
      defaultOutputStyle: jsonConfig.defaultOutputStyle || defaultConfig.claudeCode.defaultOutputStyle,
      installType: claudeCodeInstallType,
      currentProfile: jsonConfig.currentProfileId || defaultConfig.claudeCode.currentProfile,
      profiles: jsonConfig.claudeCode?.profiles || {},
    },
    codex: {
      enabled: jsonConfig.codeToolType === 'codex',
      systemPromptStyle: jsonConfig.systemPromptStyle || defaultConfig.codex.systemPromptStyle,
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
function updateTomlConfig(configPath: string, updates: PartialZcfTomlConfig): ZcfTomlConfig {
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

/**
 * Convert TOML config to legacy ZcfConfig format for backward compatibility
 */
function convertTomlToLegacyConfig(tomlConfig: ZcfTomlConfig): ZcfConfig {
  return {
    version: tomlConfig.version,
    preferredLang: tomlConfig.general.preferredLang,
    templateLang: tomlConfig.general.templateLang,
    aiOutputLang: tomlConfig.general.aiOutputLang,
    outputStyles: tomlConfig.claudeCode.outputStyles,
    defaultOutputStyle: tomlConfig.claudeCode.defaultOutputStyle,
    codeToolType: tomlConfig.general.currentTool,
    lastUpdated: tomlConfig.lastUpdated,
  }
}

/**
 * Convert legacy ZcfConfig to TOML format
 */
function convertLegacyToTomlConfig(legacyConfig: ZcfConfig): ZcfTomlConfig {
  return migrateFromJsonConfig(legacyConfig)
}

function normalizeZcfConfig(config: Partial<ZcfConfig> | null): ZcfConfig | null {
  if (!config) {
    return null
  }

  return {
    version: typeof config.version === 'string' ? config.version : '1.0.0',
    preferredLang: sanitizePreferredLang(config.preferredLang),
    templateLang: config.templateLang ? sanitizePreferredLang(config.templateLang) : undefined,
    aiOutputLang: config.aiOutputLang,
    outputStyles: Array.isArray(config.outputStyles) ? config.outputStyles : undefined,
    defaultOutputStyle: typeof config.defaultOutputStyle === 'string' ? config.defaultOutputStyle : undefined,
    codeToolType: sanitizeCodeToolType(config.codeToolType),
    lastUpdated: typeof config.lastUpdated === 'string' ? config.lastUpdated : new Date().toISOString(),
  }
}

export function migrateZcfConfigIfNeeded(): ZcfConfigMigrationResult {
  const target = ZCF_CONFIG_FILE
  const removed: string[] = []
  const targetExists = existsSync(target)
  const legacySources = LEGACY_ZCF_CONFIG_FILES.filter(path => existsSync(path))

  if (!targetExists && legacySources.length > 0) {
    const source = legacySources[0]
    if (!existsSync(ZCF_CONFIG_DIR)) {
      mkdirSync(ZCF_CONFIG_DIR, { recursive: true })
    }

    try {
      renameSync(source, target)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EXDEV') {
        throw error
      }

      // Fallback for Windows when rename cannot cross devices
      copyFileSync(source, target)
      rmSync(source, { force: true })
    }

    for (const leftover of legacySources.slice(1)) {
      try {
        rmSync(leftover, { force: true })
        removed.push(leftover)
      }
      catch {
        // ignore cleanup failure
      }
    }

    return { migrated: true, source, target, removed }
  }

  if (targetExists && legacySources.length > 0) {
    for (const source of legacySources) {
      try {
        rmSync(source, { force: true })
        removed.push(source)
      }
      catch {
        // ignore cleanup failure
      }
    }
    return { migrated: false, target, removed }
  }

  return { migrated: false, target, removed }
}

export function readZcfConfig(): ZcfConfig | null {
  migrateZcfConfigIfNeeded()

  // First, try to read TOML config
  const tomlConfig = readTomlConfig(ZCF_CONFIG_FILE)
  if (tomlConfig) {
    return convertTomlToLegacyConfig(tomlConfig)
  }

  // Fallback to legacy JSON config reading for backward compatibility
  const raw = readJsonConfig<Partial<ZcfConfig>>(ZCF_CONFIG_FILE.replace('.toml', '.json'))
  const normalized = normalizeZcfConfig(raw || null)
  if (normalized) {
    return normalized
  }

  for (const legacyPath of LEGACY_ZCF_CONFIG_FILES) {
    if (existsSync(legacyPath)) {
      const legacyRaw = readJsonConfig<Partial<ZcfConfig>>(legacyPath)
      const legacyNormalized = normalizeZcfConfig(legacyRaw || null)
      if (legacyNormalized) {
        return legacyNormalized
      }
    }
  }

  return null
}

export async function readZcfConfigAsync(): Promise<ZcfConfig | null> {
  return readZcfConfig()
}

export function writeZcfConfig(config: ZcfConfig): void {
  try {
    // Convert legacy config to TOML format and write
    const sanitizedConfig = {
      ...config,
      codeToolType: sanitizeCodeToolType(config.codeToolType),
    }
    const existingTomlConfig = readTomlConfig(ZCF_CONFIG_FILE)
    const tomlConfig = convertLegacyToTomlConfig(sanitizedConfig)

    const nextSystemPromptStyle
      = (sanitizedConfig as any).systemPromptStyle
        || existingTomlConfig?.codex?.systemPromptStyle

    if (nextSystemPromptStyle) {
      tomlConfig.codex.systemPromptStyle = nextSystemPromptStyle
    }

    if (existingTomlConfig?.claudeCode) {
      if (existingTomlConfig.claudeCode.profiles) {
        tomlConfig.claudeCode.profiles = existingTomlConfig.claudeCode.profiles
      }
      if (existingTomlConfig.claudeCode.currentProfile !== undefined) {
        tomlConfig.claudeCode.currentProfile = existingTomlConfig.claudeCode.currentProfile
      }
      if (existingTomlConfig.claudeCode.version) {
        tomlConfig.claudeCode.version = existingTomlConfig.claudeCode.version
      }
    }

    writeTomlConfig(ZCF_CONFIG_FILE, tomlConfig)
  }
  catch {
    // Silently fail if cannot write config - user's system may have permission issues
    // The app should still work without saved preferences
  }
}

export function updateZcfConfig(updates: Partial<ZcfConfig>): void {
  const existingConfig = readZcfConfig()
  const newConfig: ZcfConfig = {
    version: updates.version || existingConfig?.version || '1.0.0',
    preferredLang: updates.preferredLang || existingConfig?.preferredLang || 'en',
    templateLang: updates.templateLang !== undefined ? updates.templateLang : existingConfig?.templateLang,
    aiOutputLang: updates.aiOutputLang || existingConfig?.aiOutputLang,
    outputStyles: updates.outputStyles !== undefined ? updates.outputStyles : existingConfig?.outputStyles,
    defaultOutputStyle: updates.defaultOutputStyle !== undefined ? updates.defaultOutputStyle : existingConfig?.defaultOutputStyle,
    codeToolType: updates.codeToolType || existingConfig?.codeToolType || DEFAULT_CODE_TOOL_TYPE,
    lastUpdated: new Date().toISOString(),
  }
  writeZcfConfig(newConfig)
}

export function getZcfConfig(): ZcfConfig {
  const config = readZcfConfig()
  return config || {
    version: '1.0.0',
    preferredLang: 'en',
    codeToolType: DEFAULT_CODE_TOOL_TYPE,
    lastUpdated: new Date().toISOString(),
  }
}

export async function getZcfConfigAsync(): Promise<ZcfConfig> {
  const config = await readZcfConfigAsync()
  return config || {
    version: '1.0.0',
    preferredLang: 'en',
    codeToolType: DEFAULT_CODE_TOOL_TYPE,
    lastUpdated: new Date().toISOString(),
  }
}

export async function saveZcfConfig(config: ZcfConfig): Promise<void> {
  writeZcfConfig(config)
}

/**
 * Read TOML configuration from default location
 * @returns Parsed TOML configuration or null if not found/invalid
 */
export function readDefaultTomlConfig(): ZcfTomlConfig | null {
  return readTomlConfig(ZCF_CONFIG_FILE)
}

// Export TOML functions for direct usage (migration path)
export { createDefaultTomlConfig, migrateFromJsonConfig, readTomlConfig, updateTomlConfig, writeTomlConfig }
