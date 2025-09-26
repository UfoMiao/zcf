import type { CodexConfigData, CodexProvider } from './codex'
import { backupCodexComplete, readCodexConfig, writeAuthFile, writeCodexConfig } from './codex'

// Constants for error messages
const ERROR_MESSAGES = {
  NO_CONFIG: 'No existing configuration found',
  BACKUP_FAILED: 'Failed to create backup',
  PROVIDER_EXISTS: (id: string) => `Provider with ID "${id}" already exists`,
  PROVIDER_NOT_FOUND: (id: string) => `Provider with ID "${id}" not found`,
  NO_PROVIDERS_SPECIFIED: 'No providers specified for deletion',
  PROVIDERS_NOT_FOUND: (providers: string[]) => `Some providers not found: ${providers.join(', ')}`,
  CANNOT_DELETE_ALL: 'Cannot delete all providers. At least one provider must remain.',
} as const

export interface ProviderOperationResult {
  success: boolean
  backupPath?: string
  error?: string
  addedProvider?: CodexProvider
  updatedProvider?: CodexProvider
  deletedProviders?: string[]
  remainingProviders?: CodexProvider[]
  newDefaultProvider?: string
}

export interface ProviderUpdateData {
  name?: string
  baseUrl?: string
  wireApi?: 'responses' | 'chat'
  apiKey?: string
}

/**
 * Add a new provider to existing configuration
 * @param provider - The new provider to add
 * @param apiKey - The API key for the provider
 * @returns Operation result
 */
export async function addProviderToExisting(
  provider: CodexProvider,
  apiKey: string,
): Promise<ProviderOperationResult> {
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_CONFIG,
      }
    }

    // Check for duplicate provider IDs
    const existingProvider = existingConfig.providers.find(p => p.id === provider.id)
    if (existingProvider) {
      return {
        success: false,
        error: ERROR_MESSAGES.PROVIDER_EXISTS(provider.id),
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: ERROR_MESSAGES.BACKUP_FAILED,
      }
    }

    // Add provider to existing configuration
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      providers: [...existingConfig.providers, provider],
    }

    // Write updated configuration
    writeCodexConfig(updatedConfig)

    // Write API key to auth file
    const authEntries: Record<string, string> = {}
    authEntries[provider.envKey] = apiKey
    writeAuthFile(authEntries)

    return {
      success: true,
      backupPath,
      addedProvider: provider,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Edit an existing provider configuration
 * @param providerId - ID of the provider to edit
 * @param updates - Updates to apply to the provider
 * @returns Operation result
 */
export async function editExistingProvider(
  providerId: string,
  updates: ProviderUpdateData,
): Promise<ProviderOperationResult> {
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_CONFIG,
      }
    }

    // Find the provider to edit
    const providerIndex = existingConfig.providers.findIndex(p => p.id === providerId)
    if (providerIndex === -1) {
      return {
        success: false,
        error: ERROR_MESSAGES.PROVIDER_NOT_FOUND(providerId),
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: ERROR_MESSAGES.BACKUP_FAILED,
      }
    }

    // Update the provider
    const updatedProvider: CodexProvider = {
      ...existingConfig.providers[providerIndex],
      ...(updates.name && { name: updates.name }),
      ...(updates.baseUrl && { baseUrl: updates.baseUrl }),
      ...(updates.wireApi && { wireApi: updates.wireApi }),
    }

    // Update configuration
    const updatedProviders = [...existingConfig.providers]
    updatedProviders[providerIndex] = updatedProvider

    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      providers: updatedProviders,
    }

    // Write updated configuration
    writeCodexConfig(updatedConfig)

    // Update API key if provided
    if (updates.apiKey) {
      const authEntries: Record<string, string> = {}
      authEntries[updatedProvider.envKey] = updates.apiKey
      writeAuthFile(authEntries)
    }

    return {
      success: true,
      backupPath,
      updatedProvider,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete selected providers from configuration
 * @param providerIds - Array of provider IDs to delete
 * @returns Operation result
 */
export async function deleteProviders(
  providerIds: string[],
): Promise<ProviderOperationResult> {
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_CONFIG,
      }
    }

    // Validate input
    if (!providerIds || providerIds.length === 0) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_PROVIDERS_SPECIFIED,
      }
    }

    // Check if all provider IDs exist
    const notFoundProviders = providerIds.filter(
      id => !existingConfig.providers.some(p => p.id === id),
    )
    if (notFoundProviders.length > 0) {
      return {
        success: false,
        error: ERROR_MESSAGES.PROVIDERS_NOT_FOUND(notFoundProviders),
      }
    }

    // Prevent deletion of all providers
    const remainingProviders = existingConfig.providers.filter(
      p => !providerIds.includes(p.id),
    )
    if (remainingProviders.length === 0) {
      return {
        success: false,
        error: ERROR_MESSAGES.CANNOT_DELETE_ALL,
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: ERROR_MESSAGES.BACKUP_FAILED,
      }
    }

    // Determine new default provider if current default is being deleted
    let newDefaultProvider = existingConfig.modelProvider
    if (providerIds.includes(existingConfig.modelProvider || '')) {
      newDefaultProvider = remainingProviders[0].id
    }

    // Update configuration
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      modelProvider: newDefaultProvider,
      providers: remainingProviders,
    }

    // Write updated configuration
    writeCodexConfig(updatedConfig)

    const result: ProviderOperationResult = {
      success: true,
      backupPath,
      deletedProviders: providerIds,
      remainingProviders,
    }

    // Include new default provider if it changed
    if (newDefaultProvider !== existingConfig.modelProvider) {
      result.newDefaultProvider = newDefaultProvider || undefined
    }

    return result
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate provider data before operations
 * @param provider - Provider data to validate
 * @returns Validation result
 */
export function validateProviderData(provider: Partial<CodexProvider>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!provider.id || typeof provider.id !== 'string' || provider.id.trim() === '') {
    errors.push('Provider ID is required')
  }

  if (!provider.name || typeof provider.name !== 'string' || provider.name.trim() === '') {
    errors.push('Provider name is required')
  }

  if (!provider.baseUrl || typeof provider.baseUrl !== 'string' || provider.baseUrl.trim() === '') {
    errors.push('Base URL is required')
  }

  if (provider.wireApi && !['responses', 'chat'].includes(provider.wireApi)) {
    errors.push('Wire API must be either "responses" or "chat"')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
