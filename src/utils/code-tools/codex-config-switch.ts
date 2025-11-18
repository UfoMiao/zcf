import type { CodexProvider } from './codex'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CODEX_AUTH_FILE } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { readJsonConfig } from '../json-config'
import { addNumbersToChoices } from '../prompt-helpers'
import { promptBoolean } from '../toggle-prompt'
import { detectConfigManagementMode } from './codex-config-detector'
import { addProviderToExisting, deleteProviders, editExistingProvider } from './codex-provider-manager'

/**
 * Configure incremental management interface for existing Codex configurations
 */
export async function configureIncrementalManagement(): Promise<void> {
  ensureI18nInitialized()

  const managementMode = detectConfigManagementMode()

  if (managementMode.mode !== 'management' || !managementMode.hasProviders) {
    console.log(ansis.yellow(i18n.t('codex:noExistingProviders')))
    return
  }

  console.log(ansis.cyan(i18n.t('codex:incrementalManagementTitle')))
  console.log(ansis.gray(i18n.t('codex:currentProviderCount', { count: managementMode.providerCount })))

  if (managementMode.currentProvider) {
    console.log(ansis.gray(i18n.t('codex:currentDefaultProvider', { provider: managementMode.currentProvider })))
  }

  const choices = [
    { name: i18n.t('codex:addProvider'), value: 'add' },
    { name: i18n.t('codex:editProvider'), value: 'edit' },
    { name: i18n.t('codex:copyProvider'), value: 'copy' },
    { name: i18n.t('codex:deleteProvider'), value: 'delete' },
    { name: i18n.t('common:skip'), value: 'skip' },
  ]

  const { action } = await inquirer.prompt<{ action: 'add' | 'edit' | 'copy' | 'delete' | 'skip' }>([{
    type: 'list',
    name: 'action',
    message: i18n.t('codex:selectAction'),
    choices: addNumbersToChoices(choices),
  }])

  if (!action || action === 'skip') {
    console.log(ansis.yellow(i18n.t('common:skip')))
    return
  }

  switch (action) {
    case 'add':
      await handleAddProvider()
      break
    case 'edit':
      await handleEditProvider(managementMode.providers!)
      break
    case 'copy':
      await handleCopyProvider(managementMode.providers!)
      break
    case 'delete':
      await handleDeleteProvider(managementMode.providers!)
      break
  }
}

/**
 * Handle adding a new provider
 */
async function handleAddProvider(): Promise<void> {
  // Step 1: Select API provider (custom or preset)
  const { getApiProviders } = await import('../../config/api-providers')
  const apiProviders = getApiProviders('codex')

  const providerChoices = [
    { name: i18n.t('api:customProvider'), value: 'custom' },
    ...apiProviders.map((p: any) => ({ name: p.name, value: p.id })),
  ]

  const { selectedProvider } = await inquirer.prompt<{ selectedProvider: string }>([{
    type: 'list',
    name: 'selectedProvider',
    message: i18n.t('api:selectApiProvider'),
    choices: addNumbersToChoices(providerChoices),
  }])

  let prefilledBaseUrl: string | undefined
  let prefilledWireApi: 'responses' | 'chat' | undefined
  let prefilledModel: string | undefined

  if (selectedProvider !== 'custom') {
    const provider = apiProviders.find((p: any) => p.id === selectedProvider)
    if (provider?.codex) {
      prefilledBaseUrl = provider.codex.baseUrl
      prefilledWireApi = provider.codex.wireApi
      prefilledModel = provider.codex.defaultModel
      console.log(ansis.gray(i18n.t('api:providerSelected', { name: provider.name })))
    }
  }

  const answers = await inquirer.prompt<{
    providerName: string
    baseUrl: string
    wireApi: string
    apiKey: string
  }>([
    {
      type: 'input',
      name: 'providerName',
      message: i18n.t('codex:providerNamePrompt'),
      default: selectedProvider !== 'custom' ? apiProviders.find((p: any) => p.id === selectedProvider)?.name : undefined,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed)
          return i18n.t('codex:providerNameRequired')
        if (!/^[\w\-\s.]+$/.test(trimmed))
          return i18n.t('codex:providerNameInvalid')
        return true
      },
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('codex:providerBaseUrlPrompt'),
      default: prefilledBaseUrl || 'https://api.openai.com/v1',
      when: () => selectedProvider === 'custom',
      validate: input => !!input.trim() || i18n.t('codex:providerBaseUrlRequired'),
    },
    {
      type: 'list',
      name: 'wireApi',
      message: i18n.t('codex:providerProtocolPrompt'),
      choices: [
        { name: i18n.t('codex:protocolResponses'), value: 'responses' },
        { name: i18n.t('codex:protocolChat'), value: 'chat' },
      ],
      default: prefilledWireApi || 'responses',
      when: () => selectedProvider === 'custom',
    },
    {
      type: 'input',
      name: 'apiKey',
      message: selectedProvider !== 'custom'
        ? i18n.t('api:enterProviderApiKey', { provider: apiProviders.find((p: any) => p.id === selectedProvider)?.name || selectedProvider })
        : i18n.t('codex:providerApiKeyPrompt'),
      validate: (input: string) => !!input.trim() || i18n.t('codex:providerApiKeyRequired'),
    },
  ])

  const providerId = answers.providerName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-').replace(/[^a-z0-9\-]/g, '')

  // Check if provider already exists
  const managementMode = detectConfigManagementMode()
  const existingProvider = managementMode.providers?.find((p: any) => p.id === providerId)

  if (existingProvider) {
    const shouldOverwrite = await promptBoolean({
      message: i18n.t('codex:providerDuplicatePrompt', {
        name: existingProvider.name,
        source: i18n.t('codex:existingConfig'),
      }),
      defaultValue: false,
    })

    if (!shouldOverwrite) {
      console.log(ansis.yellow(i18n.t('codex:providerDuplicateSkipped')))
      return
    }
  }

  const provider: CodexProvider = {
    id: providerId,
    name: answers.providerName.trim(),
    baseUrl: selectedProvider === 'custom' ? answers.baseUrl.trim() : prefilledBaseUrl!,
    wireApi: (selectedProvider === 'custom' ? answers.wireApi : prefilledWireApi) as 'responses' | 'chat',
    envKey: `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    requiresOpenaiAuth: true,
    model: prefilledModel || 'gpt-5-codex', // Use provider's default model or fallback
  }

  const result = await addProviderToExisting(provider, answers.apiKey.trim(), true)

  if (result.success) {
    console.log(ansis.green(i18n.t('codex:providerAdded', { name: result.addedProvider?.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }

    // Ask if user wants to set this provider as default
    const setAsDefault = await promptBoolean({
      message: i18n.t('multi-config:setAsDefaultPrompt'),
      defaultValue: true,
    })

    if (setAsDefault) {
      const { switchToProvider } = await import('./codex')
      const switched = await switchToProvider(provider.id)
      if (switched) {
        console.log(ansis.green(i18n.t('multi-config:profileSetAsDefault', { name: provider.name })))
      }
    }
  }
  else {
    console.log(ansis.red(i18n.t('codex:providerAddFailed', { error: result.error })))
  }
}

/**
 * Handle editing an existing provider
 */
async function handleEditProvider(providers: any[]): Promise<void> {
  const choices = providers.map(provider => ({
    name: `${provider.name} (${provider.baseUrl})`,
    value: provider.id,
  }))

  const { selectedProviderId } = await inquirer.prompt<{ selectedProviderId: string }>([{
    type: 'list',
    name: 'selectedProviderId',
    message: i18n.t('codex:selectProviderToEdit'),
    choices: addNumbersToChoices(choices),
  }])

  if (!selectedProviderId) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const provider = providers.find(p => p.id === selectedProviderId)
  if (!provider) {
    console.log(ansis.red(i18n.t('codex:providerNotFound')))
    return
  }

  // Read existing API key from auth.json
  const existingAuth = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
  const existingApiKey = existingAuth[provider.envKey] || ''

  const answers = await inquirer.prompt<{
    providerName: string
    baseUrl: string
    wireApi: string
    apiKey: string
  }>([
    {
      type: 'input',
      name: 'providerName',
      message: i18n.t('codex:providerNamePrompt'),
      default: provider.name,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed)
          return i18n.t('codex:providerNameRequired')
        if (!/^[\w\-\s]+$/.test(trimmed))
          return i18n.t('codex:providerNameInvalid')
        return true
      },
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('codex:providerBaseUrlPrompt'),
      default: provider.baseUrl,
      validate: input => !!input.trim() || i18n.t('codex:providerBaseUrlRequired'),
    },
    {
      type: 'list',
      name: 'wireApi',
      message: i18n.t('codex:providerProtocolPrompt'),
      choices: [
        { name: i18n.t('codex:protocolResponses'), value: 'responses' },
        { name: i18n.t('codex:protocolChat'), value: 'chat' },
      ],
      default: provider.wireApi,
    },
    {
      type: 'input',
      name: 'apiKey',
      message: i18n.t('codex:providerApiKeyPrompt'),
      default: existingApiKey, // Show old API key from auth.json
      validate: (input: string) => !!input.trim() || i18n.t('codex:providerApiKeyRequired'),
    },
  ])

  // Prompt for model configuration
  const { model } = await inquirer.prompt<{ model: string }>([
    {
      type: 'input',
      name: 'model',
      message: i18n.t('codex:providerModelPrompt'),
      default: provider.model || 'gpt-5-codex',
      validate: (input: string) => !!input.trim() || i18n.t('codex:providerModelRequired'),
    },
  ])

  const updates = {
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi as 'responses' | 'chat',
    apiKey: answers.apiKey.trim(),
    model: model.trim(),
  }

  const result = await editExistingProvider(selectedProviderId, updates)

  if (result.success) {
    console.log(ansis.green(i18n.t('codex:providerUpdated', { name: result.updatedProvider?.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }
  }
  else {
    console.log(ansis.red(i18n.t('codex:providerUpdateFailed', { error: result.error })))
  }
}

/**
 * Handle copying an existing provider
 */
async function handleCopyProvider(providers: any[]): Promise<void> {
  const choices = providers.map(provider => ({
    name: `${provider.name} (${provider.baseUrl})`,
    value: provider.id,
  }))

  const { selectedProviderId } = await inquirer.prompt<{ selectedProviderId: string }>([{
    type: 'list',
    name: 'selectedProviderId',
    message: i18n.t('codex:selectProviderToCopy'),
    choices: addNumbersToChoices(choices),
  }])

  if (!selectedProviderId) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const provider = providers.find(p => p.id === selectedProviderId)
  if (!provider) {
    console.log(ansis.red(i18n.t('codex:providerNotFound')))
    return
  }

  console.log(ansis.cyan(`\n${i18n.t('codex:copyingProvider', { name: provider.name })}`))

  // Read existing API key from auth.json
  const existingAuth = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
  const existingApiKey = existingAuth[provider.envKey] || ''

  // Prepare copied provider with -copy suffix
  const copiedName = `${provider.name}-copy`

  const answers = await inquirer.prompt<{
    providerName: string
    baseUrl: string
    wireApi: string
    apiKey: string
  }>([
    {
      type: 'input',
      name: 'providerName',
      message: i18n.t('codex:providerNamePrompt'),
      default: copiedName,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed)
          return i18n.t('codex:providerNameRequired')
        if (!/^[\w\-\s.]+$/.test(trimmed))
          return i18n.t('codex:providerNameInvalid')
        return true
      },
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('codex:providerBaseUrlPrompt'),
      default: provider.baseUrl,
      validate: input => !!input.trim() || i18n.t('codex:providerBaseUrlRequired'),
    },
    {
      type: 'list',
      name: 'wireApi',
      message: i18n.t('codex:providerProtocolPrompt'),
      choices: [
        { name: i18n.t('codex:protocolResponses'), value: 'responses' },
        { name: i18n.t('codex:protocolChat'), value: 'chat' },
      ],
      default: provider.wireApi,
    },
    {
      type: 'input',
      name: 'apiKey',
      message: i18n.t('codex:providerApiKeyPrompt'),
      default: existingApiKey, // Show old API key from auth.json
      validate: (input: string) => !!input.trim() || i18n.t('codex:providerApiKeyRequired'),
    },
  ])

  // Prompt for model configuration
  const { model } = await inquirer.prompt<{ model: string }>([
    {
      type: 'input',
      name: 'model',
      message: i18n.t('codex:providerModelPrompt'),
      default: provider.model || 'gpt-5-codex',
      validate: (input: string) => !!input.trim() || i18n.t('codex:providerModelRequired'),
    },
  ])

  const providerId = answers.providerName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-').replace(/[^a-z0-9\-]/g, '')

  const copiedProvider: CodexProvider = {
    id: providerId,
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi as 'responses' | 'chat',
    envKey: `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    requiresOpenaiAuth: provider.requiresOpenaiAuth ?? true,
    model: model.trim(),
  }

  const result = await addProviderToExisting(copiedProvider, answers.apiKey.trim(), false)

  if (result.success) {
    console.log(ansis.green(i18n.t('codex:providerCopied', { name: result.addedProvider?.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }

    // Ask if user wants to set this provider as default
    const setAsDefault = await promptBoolean({
      message: i18n.t('multi-config:setAsDefaultPrompt'),
      defaultValue: false,
    })

    if (setAsDefault) {
      const { switchToProvider } = await import('./codex')
      const switched = await switchToProvider(copiedProvider.id)
      if (switched) {
        console.log(ansis.green(i18n.t('multi-config:profileSetAsDefault', { name: copiedProvider.name })))
      }
    }
  }
  else {
    console.log(ansis.red(i18n.t('codex:providerCopyFailed', { error: result.error })))
  }
}

/**
 * Handle deleting providers
 */
async function handleDeleteProvider(providers: any[]): Promise<void> {
  const choices = providers.map(provider => ({
    name: `${provider.name} (${provider.baseUrl})`,
    value: provider.id,
  }))

  const { selectedProviderIds } = await inquirer.prompt<{ selectedProviderIds: string[] }>({
    type: 'checkbox',
    name: 'selectedProviderIds',
    message: i18n.t('codex:selectProvidersToDelete'),
    choices,
    validate: (input: unknown) => {
      const selected = input as string[]
      if (!selected || selected.length === 0) {
        return i18n.t('codex:selectAtLeastOne')
      }
      if (selected.length === providers.length) {
        return i18n.t('codex:cannotDeleteAll')
      }
      return true
    },
  })

  if (!selectedProviderIds || selectedProviderIds.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  // Show confirmation
  const selectedNames = selectedProviderIds.map(id =>
    providers.find(p => p.id === id)?.name || id,
  ).join(', ')

  const confirmDelete = await promptBoolean({
    message: i18n.t('codex:confirmDeleteProviders', { providers: selectedNames }),
    defaultValue: false,
  })

  if (!confirmDelete) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const result = await deleteProviders(selectedProviderIds)

  if (result.success) {
    console.log(ansis.green(i18n.t('codex:providersDeleted', { count: selectedProviderIds.length })))
    if (result.newDefaultProvider) {
      console.log(ansis.cyan(i18n.t('codex:newDefaultProvider', { provider: result.newDefaultProvider })))
    }
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }
  }
  else {
    console.log(ansis.red(i18n.t('codex:providersDeleteFailed', { error: result.error })))
  }
}

export default { configureIncrementalManagement }
