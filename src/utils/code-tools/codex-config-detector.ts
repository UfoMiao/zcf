import type { CodexConfigData, CodexProvider } from './codex'
import { readCodexConfig } from './codex'

export interface ConfigManagementMode {
  mode: 'initial' | 'management'
  hasProviders: boolean
  providerCount: number
  currentProvider?: string | null
  providers?: CodexProvider[]
  isUnmanaged?: boolean
  error?: string
}

/**
 * Detect the current configuration state and determine appropriate management mode
 * @returns Configuration management mode information
 */
export function detectConfigManagementMode(): ConfigManagementMode {
  try {
    const config = readCodexConfig()

    if (!config || !config.providers || config.providers.length === 0) {
      return {
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
      }
    }

    return {
      mode: 'management',
      hasProviders: true,
      providerCount: config.providers.length,
      currentProvider: config.modelProvider,
      providers: config.providers,
      isUnmanaged: config.managed === false ? true : undefined,
    }
  }
  catch (error) {
    return {
      mode: 'initial',
      hasProviders: false,
      providerCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Determine if configuration should show management options
 * @param config - The codex configuration data
 * @returns Whether to show management mode
 */
export function shouldShowManagementMode(config: CodexConfigData | null): boolean {
  if (!config || !config.providers || config.providers.length === 0) {
    return false
  }
  return true
}

/**
 * Get available management actions based on current configuration
 * @param config - The codex configuration data
 * @returns Array of available management actions
 */
export function getAvailableManagementActions(config: CodexConfigData): string[] {
  const actions: string[] = []

  if (config.providers.length > 0) {
    actions.push('add', 'edit', 'delete', 'switch')
  }

  return actions
}
