import type { AiOutputLanguage, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import { LEGACY_ZCF_CONFIG_FILE, ZCF_CONFIG_FILE } from '../constants'
import { readJsonConfig, writeJsonConfig } from './json-config'

export interface ZcfConfig {
  version: string
  preferredLang: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  outputStyles?: string[]
  defaultOutputStyle?: string
  lastUpdated: string
}

export function readZcfConfig(): ZcfConfig | null {
  // Try new location first
  let config = readJsonConfig<ZcfConfig>(ZCF_CONFIG_FILE)

  // If not found, try legacy location (for backward compatibility)
  if (!config && existsSync(LEGACY_ZCF_CONFIG_FILE)) {
    config = readJsonConfig<ZcfConfig>(LEGACY_ZCF_CONFIG_FILE)
  }

  return config
}

export async function readZcfConfigAsync(): Promise<ZcfConfig | null> {
  return readZcfConfig()
}

export function writeZcfConfig(config: ZcfConfig): void {
  try {
    // Always write to new location
    writeJsonConfig(ZCF_CONFIG_FILE, config)
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
    lastUpdated: new Date().toISOString(),
  }
  writeZcfConfig(newConfig)
}

export async function getZcfConfig(): Promise<ZcfConfig> {
  const config = await readZcfConfigAsync()
  return config || {
    version: '1.0.0',
    preferredLang: 'en',
    lastUpdated: new Date().toISOString(),
  }
}

export async function saveZcfConfig(config: ZcfConfig): Promise<void> {
  writeZcfConfig(config)
}
