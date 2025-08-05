import { join } from 'pathe';
import { CLAUDE_DIR, ClAUDE_CONFIG_FILE, I18N } from '../constants';
import type { ClaudeConfiguration, McpServerConfig } from '../types';
import { getMcpCommand, isWindows } from './platform';
import { readJsonConfig, writeJsonConfig, backupJsonConfig } from './json-config';
import { deepClone } from './object-utils';
import { readZcfConfig } from './zcf-config';

export function getMcpConfigPath(): string {
  return ClAUDE_CONFIG_FILE;
}

export function readMcpConfig(): ClaudeConfiguration | null {
  return readJsonConfig<ClaudeConfiguration>(ClAUDE_CONFIG_FILE);
}

export function writeMcpConfig(config: ClaudeConfiguration): void {
  writeJsonConfig(ClAUDE_CONFIG_FILE, config);
}

export function backupMcpConfig(): string | null {
  const backupBaseDir = join(CLAUDE_DIR, 'backup');
  return backupJsonConfig(ClAUDE_CONFIG_FILE, backupBaseDir);
}

export function mergeMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing || { mcpServers: {} };

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Merge new servers into existing config
  Object.assign(config.mcpServers, newServers);

  return config;
}

function applyPlatformCommand(config: McpServerConfig): void {
  if (config.command === 'npx' && isWindows()) {
    const mcpCmd = getMcpCommand();
    config.command = mcpCmd[0];
    config.args = [...mcpCmd.slice(1), ...(config.args || [])];
  }
}

export function buildMcpServerConfig(
  baseConfig: McpServerConfig,
  apiKey?: string,
  placeholder: string = 'YOUR_EXA_API_KEY'
): McpServerConfig {
  // Deep clone the config to avoid mutation
  const config = deepClone(baseConfig);

  // Apply platform-specific command
  applyPlatformCommand(config);

  if (!apiKey) {
    return config;
  }

  // Replace API key placeholder in args if exists
  if (config.args) {
    config.args = config.args.map((arg: string) => arg.replace(placeholder, apiKey));
  }

  // Replace in URL if exists
  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey);
  }

  return config;
}

export function fixWindowsMcpConfig(config: ClaudeConfiguration): ClaudeConfiguration {
  if (!isWindows() || !config.mcpServers) {
    return config;
  }

  const fixed = { ...config };

  // Fix each MCP server configuration
  for (const [, serverConfig] of Object.entries(fixed.mcpServers)) {
    if (serverConfig && typeof serverConfig === 'object' && 'command' in serverConfig) {
      applyPlatformCommand(serverConfig);
    }
  }

  return fixed;
}

export function addCompletedOnboarding(): void {
  try {
    // Read existing config or create new one
    let config = readMcpConfig();
    if (!config) {
      config = { mcpServers: {} };
    }

    // Add hasCompletedOnboarding flag
    config.hasCompletedOnboarding = true;

    // Fix Windows config if needed
    config = fixWindowsMcpConfig(config);

    // Write updated config
    writeMcpConfig(config);
  } catch (error) {
    console.error(I18N[readZcfConfig()?.preferredLang || 'en'].failedToAddOnboardingFlag, error);
    throw error;
  }
}
