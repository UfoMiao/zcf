import type { CodexProvider } from './codex'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { addNumbersToChoices } from '../prompt-helpers'
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
    { name: i18n.t('codex:deleteProvider'), value: 'delete' },
    { name: i18n.t('common:back'), value: 'back' },
  ]

  const { action } = await inquirer.prompt<{ action: 'add' | 'edit' | 'delete' | 'back' }>([{
    type: 'list',
    name: 'action',
    message: i18n.t('codex:selectAction'),
    choices: addNumbersToChoices(choices),
  }])

  if (!action || action === 'back') {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  switch (action) {
    case 'add':
      await handleAddProvider()
      break
    case 'edit':
      await handleEditProvider(managementMode.providers!)
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
      default: 'https://api.openai.com/v1',
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
      default: 'responses',
    },
    {
      type: 'password',
      name: 'apiKey',
      message: i18n.t('codex:providerApiKeyPrompt') + i18n.t('common:inputHidden'),
      validate: input => !!input.trim() || i18n.t('codex:providerApiKeyRequired'),
    },
  ])

  const providerId = answers.providerName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
  const provider: CodexProvider = {
    id: providerId,
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi as 'responses' | 'chat',
    envKey: `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    requiresOpenaiAuth: true,
  }

  const result = await addProviderToExisting(provider, answers.apiKey.trim())

  if (result.success) {
    console.log(ansis.green(i18n.t('codex:providerAdded', { name: result.addedProvider?.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
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
      type: 'password',
      name: 'apiKey',
      message: i18n.t('codex:providerApiKeyPrompt') + i18n.t('common:inputHidden'),
      validate: input => !!input.trim() || i18n.t('codex:providerApiKeyRequired'),
    },
  ])

  const updates = {
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi as 'responses' | 'chat',
    apiKey: answers.apiKey.trim(),
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

  const { confirmDelete } = await inquirer.prompt<{ confirmDelete: boolean }>([{
    type: 'confirm',
    name: 'confirmDelete',
    message: i18n.t('codex:confirmDeleteProviders', { providers: selectedNames }),
    default: false,
  }])

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
