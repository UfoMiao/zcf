import type { ClaudeConfiguration, McpServerConfig } from '../../types'
import { join } from 'pathe'
import { CODEBUDDY_DIR, CODEBUDDY_MCP_FILE, CODEBUDDY_SETTINGS_FILE } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { backupJsonConfig, readJsonConfig, writeJsonConfig } from '../json-config'
import { deepClone } from '../object-utils'
import { getMcpCommand, isWindows } from '../platform'

// -- MCP config (reads/writes ~/.codebuddy/.mcp.json) --

export function getMcpConfigPath(): string {
  return CODEBUDDY_MCP_FILE
}

export function readMcpConfig(): ClaudeConfiguration | null {
  return readJsonConfig<ClaudeConfiguration>(CODEBUDDY_MCP_FILE)
}

export function writeMcpConfig(config: ClaudeConfiguration): void {
  writeJsonConfig(CODEBUDDY_MCP_FILE, config)
}

export function backupMcpConfig(): string | null {
  const backupBaseDir = join(CODEBUDDY_DIR, 'backup')
  return backupJsonConfig(CODEBUDDY_MCP_FILE, backupBaseDir)
}

export function mergeMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing || { mcpServers: {} }

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  Object.assign(config.mcpServers, newServers)
  return config
}

function applyPlatformCommand(config: McpServerConfig): void {
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command)
    if (mcpCmd[0] === 'cmd') {
      config.command = mcpCmd[0]
      config.args = [...mcpCmd.slice(1), ...(config.args || [])]
    }
  }
}

export function buildMcpServerConfig(
  baseConfig: McpServerConfig,
  apiKey?: string,
  placeholder: string = 'YOUR_EXA_API_KEY',
  envVarName?: string,
): McpServerConfig {
  const config = deepClone(baseConfig)
  applyPlatformCommand(config)

  if (!apiKey) {
    return config
  }

  if (envVarName && config.env) {
    config.env[envVarName] = apiKey
    return config
  }

  if (config.args) {
    config.args = config.args.map((arg: string) => arg.replace(placeholder, apiKey))
  }

  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey)
  }

  return config
}

export function fixWindowsMcpConfig(config: ClaudeConfiguration): ClaudeConfiguration {
  if (!isWindows() || !config.mcpServers) {
    return config
  }

  const fixed = { ...config }
  for (const [, serverConfig] of Object.entries(fixed.mcpServers)) {
    if (serverConfig && typeof serverConfig === 'object' && 'command' in serverConfig) {
      applyPlatformCommand(serverConfig)
    }
  }

  return fixed
}

export function addCompletedOnboarding(): void {
  try {
    let config = readMcpConfig()
    if (!config) {
      config = { mcpServers: {} }
    }

    if (config.hasCompletedOnboarding === true) {
      return
    }

    config.hasCompletedOnboarding = true
    writeMcpConfig(config)
  }
  catch (error) {
    console.error('Failed to add onboarding flag', error)
    throw error
  }
}

export function ensureApiKeyApproved(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return config
  }

  const truncatedApiKey = apiKey.substring(0, 20)
  const updatedConfig = { ...config }

  if (!updatedConfig.customApiKeyResponses) {
    updatedConfig.customApiKeyResponses = {
      approved: [],
      rejected: [],
    }
  }

  if (!Array.isArray(updatedConfig.customApiKeyResponses.approved)) {
    updatedConfig.customApiKeyResponses.approved = []
  }
  if (!Array.isArray(updatedConfig.customApiKeyResponses.rejected)) {
    updatedConfig.customApiKeyResponses.rejected = []
  }

  const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey)
  if (rejectedIndex > -1) {
    updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1)
  }

  if (!updatedConfig.customApiKeyResponses.approved.includes(truncatedApiKey)) {
    updatedConfig.customApiKeyResponses.approved.push(truncatedApiKey)
  }

  return updatedConfig
}

export function removeApiKeyFromRejected(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  if (!config.customApiKeyResponses || !Array.isArray(config.customApiKeyResponses.rejected)) {
    return config
  }

  const truncatedApiKey = apiKey.substring(0, 20)
  const updatedConfig = { ...config }

  if (updatedConfig.customApiKeyResponses) {
    const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey)
    if (rejectedIndex > -1) {
      updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1)
    }
  }

  return updatedConfig
}

export function manageApiKeyApproval(apiKey: string): void {
  try {
    let config = readMcpConfig()
    if (!config) {
      config = { mcpServers: {} }
    }

    const updatedConfig = ensureApiKeyApproved(config, apiKey)
    writeMcpConfig(updatedConfig)
  }
  catch (error) {
    ensureI18nInitialized()
    console.error(i18n.t('mcp:apiKeyApprovalFailed'), error)
  }
}

// -- Settings (reads/writes ~/.codebuddy/settings.json) --

export function getSettingsPath(): string {
  return CODEBUDDY_SETTINGS_FILE
}

export function readSettings<T = Record<string, unknown>>(): T | null {
  return readJsonConfig<T>(CODEBUDDY_SETTINGS_FILE)
}

export function writeSettings<T = Record<string, unknown>>(settings: T): void {
  writeJsonConfig(CODEBUDDY_SETTINGS_FILE, settings)
}
