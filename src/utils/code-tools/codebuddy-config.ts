import type { ClaudeConfiguration, McpServerConfig } from '../../types'
import { join } from 'pathe'
import { CODEBUDDY_DIR, CODEBUDDY_MCP_FILE, CODEBUDDY_SETTINGS_FILE } from '../../constants'
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
