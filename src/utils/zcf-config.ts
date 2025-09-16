import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, LEGACY_ZCF_CONFIG_FILES, SUPPORTED_LANGS, ZCF_CONFIG_DIR, ZCF_CONFIG_FILE } from '../constants'
import { readJsonConfig, writeJsonConfig } from './json-config'

export interface ClaudeCodeInstallation {
  type: 'global' | 'local'
  path: string
  configDir: string
}

export interface ZcfConfig {
  version: string
  preferredLang: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  outputStyles?: string[]
  defaultOutputStyle?: string
  claudeCodeInstallation?: ClaudeCodeInstallation
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

function normalizeZcfConfig(config: Partial<ZcfConfig> | null): ZcfConfig | null {
  if (!config) {
    return null
  }

  return {
    version: typeof config.version === 'string' ? config.version : '1.0.0',
    preferredLang: sanitizePreferredLang(config.preferredLang),
    aiOutputLang: config.aiOutputLang,
    outputStyles: Array.isArray(config.outputStyles) ? config.outputStyles : undefined,
    defaultOutputStyle: typeof config.defaultOutputStyle === 'string' ? config.defaultOutputStyle : undefined,
    claudeCodeInstallation: config.claudeCodeInstallation,
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

    renameSync(source, target)

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

  const raw = readJsonConfig<Partial<ZcfConfig>>(ZCF_CONFIG_FILE)
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
    // Always write to new location
    writeJsonConfig(ZCF_CONFIG_FILE, {
      ...config,
      codeToolType: sanitizeCodeToolType(config.codeToolType),
    })
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
    aiOutputLang: updates.aiOutputLang || existingConfig?.aiOutputLang,
    outputStyles: updates.outputStyles !== undefined ? updates.outputStyles : existingConfig?.outputStyles,
    defaultOutputStyle: updates.defaultOutputStyle !== undefined ? updates.defaultOutputStyle : existingConfig?.defaultOutputStyle,
    claudeCodeInstallation: updates.claudeCodeInstallation !== undefined ? updates.claudeCodeInstallation : existingConfig?.claudeCodeInstallation,
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
