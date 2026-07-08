import type { SupportedLang } from '../../constants'
import { join } from 'pathe'
import { OPENCODE_CONFIG_FILE, OPENCODE_DIR } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { updateZcfConfig } from '../zcf-config'

/**
 * OpenCode configuration schema subset managed by ZCF.
 *
 * Field names are aligned with the official OpenCode configuration schema:
 * https://opencode.ai/config.json
 */
export interface OpenCodeConfig {
  $schema?: string
  shell?: string
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  server?: {
    port?: number
    hostname?: string
    mdns?: boolean
    mdnsDomain?: string
    cors?: string[]
  }
  command?: Record<string, {
    template: string
    description?: string
    agent?: string
    model?: string
    variant?: string
    subtask?: boolean
  }>
  skills?: {
    paths?: string[]
    urls?: string[]
  }
  references?: Record<string, unknown>
  watcher?: {
    ignore?: string[]
  }
  snapshot?: boolean
  plugin?: unknown[]
  share?: 'manual' | 'auto' | 'disabled'
  autoupdate?: boolean | 'notify'
  disabled_providers?: string[]
  enabled_providers?: string[]
  /** Model to use in the format provider/model, e.g. anthropic/claude-sonnet-4 */
  model?: string
  /** Small model for lightweight tasks in the format provider/model */
  small_model?: string
  default_agent?: string
  username?: string
  [key: string]: unknown
}

export interface OpenCodeStatus {
  installed: boolean
  configured: boolean
  model?: string
  smallModel?: string
  providers?: string[]
}

export interface OpenCodeModelSwitchResult {
  success: boolean
  model?: string
  smallModel?: string
  backupPath?: string | null
  error?: string
}

/**
 * Read the OpenCode global configuration file.
 * Returns null when the file does not exist or cannot be parsed.
 */
export function readOpenCodeConfig(): OpenCodeConfig | null {
  return readJsonConfig<OpenCodeConfig>(OPENCODE_CONFIG_FILE)
}

/**
 * Write the OpenCode global configuration file.
 */
export function writeOpenCodeConfig(config: OpenCodeConfig): void {
  ensureDir(join(OPENCODE_CONFIG_FILE, '..'))
  writeJsonConfig(OPENCODE_CONFIG_FILE, config)
}

/**
 * Back up the OpenCode configuration file.
 * Returns the backup path or null when there is nothing to back up.
 */
export function backupOpenCodeConfig(): string | null {
  if (!exists(OPENCODE_CONFIG_FILE)) {
    return null
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = join(OPENCODE_DIR, 'backup')
    ensureDir(backupDir)
    const backupPath = join(backupDir, `opencode.json.backup_${timestamp}`)
    const content = readFile(OPENCODE_CONFIG_FILE)
    writeFile(backupPath, content)
    return backupPath
  }
  catch {
    return null
  }
}

/**
 * Check whether OpenCode appears to be configured.
 */
export function isOpenCodeInstalled(): boolean {
  return exists(OPENCODE_CONFIG_FILE)
}

/**
 * Get a brief status of the OpenCode configuration.
 */
export function getOpenCodeStatus(): OpenCodeStatus {
  const config = readOpenCodeConfig()

  if (!config) {
    return {
      installed: isOpenCodeInstalled(),
      configured: false,
    }
  }

  return {
    installed: true,
    configured: !!config.model,
    model: config.model,
    smallModel: config.small_model,
    providers: config.enabled_providers,
  }
}

/**
 * Extract the provider prefix from an OpenCode model string.
 * OpenCode model strings use the form provider/model (e.g. anthropic/claude-sonnet-4).
 */
export function parseOpenCodeModel(model: string): { provider: string, modelName: string } | null {
  const parts = model.trim().split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return null
  }

  return {
    provider: parts[0],
    modelName: parts.slice(1).join('/'),
  }
}

/**
 * Switch the active OpenCode model.
 *
 * Updates the official `model` field and optionally `small_model`.
 * If `enabled_providers` is present in the existing config, it is updated to
 * only the provider derived from the new model so the switch actually takes effect.
 */
export function switchOpenCodeModel(
  model: string,
  options: { smallModel?: string, updateEnabledProviders?: boolean } = {},
): OpenCodeModelSwitchResult {
  ensureI18nInitialized()

  const parsed = parseOpenCodeModel(model)
  if (!parsed) {
    return {
      success: false,
      error: i18n.t('opencode:invalidModelFormat', { model }),
    }
  }

  try {
    const backupPath = backupOpenCodeConfig()
    const existing = readOpenCodeConfig() || {}

    const updates: Partial<OpenCodeConfig> = {
      model: model.trim(),
      enabled_providers: [parsed.provider],
    }

    if (options.smallModel) {
      updates.small_model = options.smallModel.trim()
    }

    writeOpenCodeConfig({ ...existing, ...updates })
    updateZcfConfig({ codeToolType: 'opencode' })

    return {
      success: true,
      model: model.trim(),
      smallModel: updates.small_model,
      backupPath,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t('opencode:switchFailed'),
    }
  }
}

/**
 * Entry point for setting up OpenCode templates and configuration.
 * Currently aligns the active code tool type in ZCF config.
 */
export async function setupOpenCode(_lang: SupportedLang): Promise<void> {
  updateZcfConfig({ codeToolType: 'opencode' })
}

export default {
  readOpenCodeConfig,
  writeOpenCodeConfig,
  backupOpenCodeConfig,
  isOpenCodeInstalled,
  getOpenCodeStatus,
  parseOpenCodeModel,
  switchOpenCodeModel,
  setupOpenCode,
}
