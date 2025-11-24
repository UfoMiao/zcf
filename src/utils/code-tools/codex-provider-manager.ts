import type { CodexConfigData, CodexProvider } from './codex'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { backupCodexComplete, readCodexConfig, writeAuthFile, writeCodexConfig } from './codex'

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
  model?: string
}

/**
 * Add a new provider to existing configuration
 * @param provider - The new provider to add
 * @param apiKey - The API key for the provider
 * @param allowOverwrite - Whether to allow overwriting existing provider
 * @returns Operation result
 */
export async function addProviderToExisting(
  provider: CodexProvider,
  apiKey: string,
  allowOverwrite = false,
): Promise<ProviderOperationResult> {
  ensureI18nInitialized()
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.noConfig'),
      }
    }

    // Check for duplicate provider IDs
    const existingProviderIndex = existingConfig.providers.findIndex(p => p.id === provider.id)
    if (existingProviderIndex !== -1 && !allowOverwrite) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.providerExists', { id: provider.id }),
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.backupFailed'),
      }
    }

    // Add or update provider in configuration
    let updatedConfig: CodexConfigData
    if (existingProviderIndex !== -1) {
      // Overwrite existing provider
      const updatedProviders = [...existingConfig.providers]
      updatedProviders[existingProviderIndex] = provider
      updatedConfig = {
        ...existingConfig,
        providers: updatedProviders,
      }
    }
    else {
      // Add new provider
      updatedConfig = {
        ...existingConfig,
        providers: [...existingConfig.providers, provider],
      }
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
      error: error instanceof Error ? error.message : i18n.t('codex:providerManager.unknownError'),
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
  ensureI18nInitialized()
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.noConfig'),
      }
    }

    // Find the provider to edit
    const providerIndex = existingConfig.providers.findIndex(p => p.id === providerId)
    if (providerIndex === -1) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.providerNotFound', { id: providerId }),
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.backupFailed'),
      }
    }

    // Update the provider
    const updatedProvider: CodexProvider = {
      ...existingConfig.providers[providerIndex],
      ...(updates.name && { name: updates.name }),
      ...(updates.baseUrl && { baseUrl: updates.baseUrl }),
      ...(updates.wireApi && { wireApi: updates.wireApi }),
      ...(updates.model && { model: updates.model }),
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
      error: error instanceof Error ? error.message : i18n.t('codex:providerManager.unknownError'),
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
  ensureI18nInitialized()
  try {
    const existingConfig = readCodexConfig()

    if (!existingConfig) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.noConfig'),
      }
    }

    // Validate input
    if (!providerIds || providerIds.length === 0) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.noProvidersSpecified'),
      }
    }

    // Check if all provider IDs exist
    const notFoundProviders = providerIds.filter(
      id => !existingConfig.providers.some(p => p.id === id),
    )
    if (notFoundProviders.length > 0) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.providersNotFound', {
          providers: notFoundProviders.join(', '),
        }),
      }
    }

    // Prevent deletion of all providers
    const remainingProviders = existingConfig.providers.filter(
      p => !providerIds.includes(p.id),
    )
    if (remainingProviders.length === 0) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.cannotDeleteAll'),
      }
    }

    // Create backup
    const backupPath = backupCodexComplete()
    if (!backupPath) {
      return {
        success: false,
        error: i18n.t('codex:providerManager.backupFailed'),
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
      error: error instanceof Error ? error.message : i18n.t('codex:providerManager.unknownError'),
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
  ensureI18nInitialized()
  const errors: string[] = []

  if (!provider.id || typeof provider.id !== 'string' || provider.id.trim() === '') {
    errors.push(i18n.t('codex:providerManager.providerIdRequired'))
  }

  if (!provider.name || typeof provider.name !== 'string' || provider.name.trim() === '') {
    errors.push(i18n.t('codex:providerManager.providerNameRequired'))
  }

  if (!provider.baseUrl || typeof provider.baseUrl !== 'string' || provider.baseUrl.trim() === '') {
    errors.push(i18n.t('codex:providerManager.baseUrlRequired'))
  }

  if (provider.wireApi && !['responses', 'chat'].includes(provider.wireApi)) {
    errors.push(i18n.t('codex:providerManager.wireApiInvalid'))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
