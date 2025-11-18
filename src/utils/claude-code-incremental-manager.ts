import type { ClaudeCodeProfile } from '../types/claude-code-config'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { ClaudeCodeConfigManager } from './claude-code-config-manager'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'
import { validateApiKey } from './validator'
// Inline i18n helper to avoid extra file
function getAuthTypeLabel(authType: ClaudeCodeProfile['authType']): string {
  ensureI18nInitialized()
  switch (authType) {
    case 'api_key':
      return i18n.t('multi-config:authType.api_key')
    case 'auth_token':
      return i18n.t('multi-config:authType.auth_token')
    case 'ccr_proxy':
      return i18n.t('multi-config:authType.ccr_proxy')
    default:
      return authType
  }
}

/**
 * Configure incremental management interface for existing Claude Code configurations
 */
export async function configureIncrementalManagement(): Promise<void> {
  ensureI18nInitialized()

  const config = ClaudeCodeConfigManager.readConfig()

  if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
    // No existing configurations, add first one
    await handleAddProfile()
    return
  }

  const profiles = Object.values(config.profiles)
  const currentProfile = config.currentProfileId ? config.profiles[config.currentProfileId] : null

  console.log(ansis.cyan(i18n.t('multi-config:incrementalManagementTitle')))
  console.log(ansis.gray(i18n.t('multi-config:currentProfileCount', { count: profiles.length })))

  if (currentProfile) {
    console.log(ansis.gray(i18n.t('multi-config:currentDefaultProfile', { profile: currentProfile.name })))
  }

  const choices = [
    { name: i18n.t('multi-config:addProfile'), value: 'add' },
    { name: i18n.t('multi-config:editProfile'), value: 'edit' },
    { name: i18n.t('multi-config:copyProfile'), value: 'copy' },
    { name: i18n.t('multi-config:deleteProfile'), value: 'delete' },
    { name: i18n.t('common:skip'), value: 'skip' },
  ]

  const { action } = await inquirer.prompt<{ action: 'add' | 'edit' | 'copy' | 'delete' | 'skip' }>([{
    type: 'list',
    name: 'action',
    message: i18n.t('multi-config:selectAction'),
    choices: addNumbersToChoices(choices),
  }])

  if (!action || action === 'skip') {
    console.log(ansis.yellow(i18n.t('common:skip')))
    return
  }

  switch (action) {
    case 'add':
      await handleAddProfile()
      break
    case 'edit':
      await handleEditProfile(profiles)
      break
    case 'copy':
      await handleCopyProfile(profiles)
      break
    case 'delete':
      await handleDeleteProfile(profiles)
      break
  }
}

async function promptContinueAdding(): Promise<boolean> {
  return await promptBoolean({
    message: i18n.t('multi-config:addAnotherProfilePrompt'),
    defaultValue: false,
  })
}

/**
 * Handle adding a new Claude Code profile
 */
async function handleAddProfile(): Promise<void> {
  console.log(ansis.cyan(`\n${i18n.t('multi-config:addingNewProfile')}`))

  // Step 1: Select API provider (custom or preset)
  const { getApiProviders } = await import('../config/api-providers')
  const providers = getApiProviders('claude-code')

  const providerChoices = [
    { name: i18n.t('api:customProvider'), value: 'custom' },
    ...providers.map((p: any) => ({ name: p.name, value: p.id })),
  ]

  const { selectedProvider } = await inquirer.prompt<{ selectedProvider: string }>([{
    type: 'list',
    name: 'selectedProvider',
    message: i18n.t('api:selectApiProvider'),
    choices: addNumbersToChoices(providerChoices),
  }])

  let prefilledBaseUrl: string | undefined
  let prefilledAuthType: 'api_key' | 'auth_token' | undefined
  let prefilledDefaultModels: string[] | undefined

  if (selectedProvider !== 'custom') {
    const provider = providers.find((p: any) => p.id === selectedProvider)
    if (provider?.claudeCode) {
      prefilledBaseUrl = provider.claudeCode.baseUrl
      prefilledAuthType = provider.claudeCode.authType
      prefilledDefaultModels = provider.claudeCode.defaultModels
      console.log(ansis.gray(i18n.t('api:providerSelected', { name: provider.name })))
    }
  }

  const answers = await inquirer.prompt<{
    profileName: string
    authType: 'api_key' | 'auth_token' | 'ccr_proxy'
    apiKey: string
    baseUrl: string
    setAsDefault: boolean
  }>([
    {
      type: 'input',
      name: 'profileName',
      message: i18n.t('multi-config:profileNamePrompt'),
      default: selectedProvider !== 'custom' ? providers.find((p: any) => p.id === selectedProvider)?.name : undefined,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:profileNameRequired')
        }
        if (!/^[\w\-\s.\u4E00-\u9FA5]+$/.test(trimmed)) {
          return i18n.t('multi-config:profileNameInvalid')
        }
        return true
      },
    },
    {
      type: 'list',
      name: 'authType',
      message: i18n.t('multi-config:authTypePrompt'),
      choices: [
        { name: i18n.t('multi-config:authType.api_key'), value: 'api_key' },
        { name: i18n.t('multi-config:authType.auth_token'), value: 'auth_token' },
      ],
      default: prefilledAuthType || 'api_key',
      when: () => selectedProvider === 'custom', // Only ask if custom
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('multi-config:baseUrlPrompt'),
      default: prefilledBaseUrl || 'https://api.anthropic.com',
      when: (answers: any) => selectedProvider === 'custom' && answers.authType !== 'ccr_proxy',
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:baseUrlRequired')
        }
        // Basic URL validation
        try {
          // eslint-disable-next-line no-new
          new URL(trimmed)
          return true
        }
        catch {
          return i18n.t('multi-config:baseUrlInvalid')
        }
      },
    },
    {
      type: 'input',
      name: 'apiKey',
      message: selectedProvider !== 'custom'
        ? i18n.t('api:enterProviderApiKey', { provider: providers.find((p: any) => p.id === selectedProvider)?.name || selectedProvider })
        : i18n.t('multi-config:apiKeyPrompt'),
      when: (answers: any) => selectedProvider === 'custom' ? answers.authType !== 'ccr_proxy' : true,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:apiKeyRequired')
        }

        // Validate API key format
        const validation = validateApiKey(trimmed)
        if (!validation.isValid) {
          return validation.error || 'Invalid API key format'
        }

        return true
      },
    },
  ])

  // For custom provider, prompt for model configuration
  let modelConfig: { primaryModel: string, fastModel: string } | null = null
  if (selectedProvider === 'custom') {
    const { promptCustomModels } = await import('./features')
    modelConfig = await promptCustomModels()
  }

  // Continue with setAsDefault prompt
  const setAsDefault = await promptBoolean({
    message: i18n.t('multi-config:setAsDefaultPrompt'),
    defaultValue: true,
  })

  // Create profile object
  const profileName = answers.profileName.trim()
  const profileId = ClaudeCodeConfigManager.generateProfileId(profileName)
  const profile: ClaudeCodeProfile = {
    id: profileId,
    name: profileName,
    authType: selectedProvider === 'custom' ? answers.authType : prefilledAuthType!,
  }

  if (profile.authType !== 'ccr_proxy') {
    profile.apiKey = answers.apiKey.trim()
    profile.baseUrl = selectedProvider === 'custom' ? answers.baseUrl.trim() : prefilledBaseUrl!
  }

  // Add model configuration if provided
  if (modelConfig) {
    if (modelConfig.primaryModel.trim()) {
      profile.primaryModel = modelConfig.primaryModel.trim()
    }
    if (modelConfig.fastModel.trim()) {
      profile.fastModel = modelConfig.fastModel.trim()
    }
  }
  else if (prefilledDefaultModels?.length) {
    if (prefilledDefaultModels[0]?.trim()) {
      profile.primaryModel = prefilledDefaultModels[0].trim()
    }
    if (prefilledDefaultModels[1]?.trim()) {
      profile.fastModel = prefilledDefaultModels[1].trim()
    }
  }

  const existingProfile = ClaudeCodeConfigManager.getProfileByName(profile.name)
  if (existingProfile) {
    const overwrite = await promptBoolean({
      message: i18n.t('multi-config:profileDuplicatePrompt', {
        name: profile.name,
        source: i18n.t('multi-config:existingConfig'),
      }),
      defaultValue: false,
    })

    if (!overwrite) {
      console.log(ansis.yellow(i18n.t('multi-config:profileDuplicateSkipped', { name: profile.name })))
      const shouldContinue = await promptContinueAdding()
      if (shouldContinue) {
        await handleAddProfile()
      }
      return
    }

    const updateResult = await ClaudeCodeConfigManager.updateProfile(existingProfile.id!, {
      name: profile.name,
      authType: profile.authType,
      apiKey: profile.apiKey,
      baseUrl: profile.baseUrl,
      primaryModel: profile.primaryModel,
      fastModel: profile.fastModel,
    })

    if (updateResult.success) {
      console.log(ansis.green(i18n.t('multi-config:profileUpdated', { name: profile.name })))
      if (updateResult.backupPath) {
        console.log(ansis.gray(i18n.t('common:backupCreated', { path: updateResult.backupPath })))
      }

      if (setAsDefault) {
        const switchResult = await ClaudeCodeConfigManager.switchProfile(existingProfile.id!)
        if (switchResult.success) {
          console.log(ansis.green(i18n.t('multi-config:profileSetAsDefault', { name: profile.name })))
          await ClaudeCodeConfigManager.applyProfileSettings({ ...profile, id: existingProfile.id! })
        }
      }
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:profileUpdateFailed', { error: updateResult.error || '' })))
    }
  }
  else {
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (result.success) {
      const runtimeProfile = result.addedProfile || { ...profile, id: profileId }
      console.log(ansis.green(i18n.t('multi-config:profileAdded', { name: runtimeProfile.name })))
      if (result.backupPath) {
        console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
      }

      if (setAsDefault) {
        const switchResult = await ClaudeCodeConfigManager.switchProfile(runtimeProfile.id!)
        if (switchResult.success) {
          console.log(ansis.green(i18n.t('multi-config:profileSetAsDefault', { name: runtimeProfile.name })))
          await ClaudeCodeConfigManager.applyProfileSettings(runtimeProfile)
        }
      }
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:profileAddFailed', { error: result.error })))
    }
  }

  const shouldContinue = await promptContinueAdding()
  if (shouldContinue) {
    await handleAddProfile()
  }
}

/**
 * Handle editing an existing Claude Code profile
 */
async function handleEditProfile(profiles: ClaudeCodeProfile[]): Promise<void> {
  const choices = profiles.map(profile => ({
    name: `${profile.name} (${getAuthTypeLabel(profile.authType)})`,
    value: profile.id,
  }))

  const { selectedProfileId } = await inquirer.prompt<{ selectedProfileId: string }>([{
    type: 'list',
    name: 'selectedProfileId',
    message: i18n.t('multi-config:selectProfileToEdit'),
    choices: addNumbersToChoices(choices),
  }])

  if (!selectedProfileId) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)
  if (!selectedProfile) {
    console.log(ansis.red(i18n.t('multi-config:profileNotFound')))
    return
  }

  console.log(ansis.cyan(`\n${i18n.t('multi-config:editingProfile', { name: selectedProfile.name })}`))

  const answers = await inquirer.prompt<{
    profileName: string
    apiKey: string
    baseUrl: string
  }>([
    {
      type: 'input',
      name: 'profileName',
      message: i18n.t('multi-config:profileNamePrompt'),
      default: selectedProfile.name,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:profileNameRequired')
        }
        if (!/^[\w\-\s\u4E00-\u9FA5]+$/.test(trimmed)) {
          return i18n.t('multi-config:profileNameInvalid')
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('multi-config:baseUrlPrompt'),
      default: selectedProfile.baseUrl || 'https://api.anthropic.com',
      when: () => selectedProfile.authType !== 'ccr_proxy',
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:baseUrlRequired')
        }
        try {
          // eslint-disable-next-line no-new
          new URL(trimmed)
          return true
        }
        catch {
          return i18n.t('multi-config:baseUrlInvalid')
        }
      },
    },
    {
      type: 'input',
      name: 'apiKey',
      message: i18n.t('multi-config:apiKeyPrompt'),
      default: selectedProfile.apiKey,
      when: () => selectedProfile.authType !== 'ccr_proxy',
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:apiKeyRequired')
        }

        const validation = validateApiKey(trimmed)
        if (!validation.isValid) {
          return validation.error || 'Invalid API key format'
        }

        return true
      },
    },
  ])

  // Prompt for model configuration (for non-CCR profiles)
  let modelConfig: { primaryModel: string, fastModel: string } | null = null
  if (selectedProfile.authType !== 'ccr_proxy') {
    const { promptCustomModels } = await import('./features')
    modelConfig = await promptCustomModels(
      selectedProfile.primaryModel,
      selectedProfile.fastModel,
    )
  }

  // Update profile data
  const updateData: Partial<ClaudeCodeProfile> = {
    name: answers.profileName.trim(),
  }

  if (selectedProfile.authType !== 'ccr_proxy') {
    updateData.apiKey = answers.apiKey.trim()
    updateData.baseUrl = answers.baseUrl.trim()

    // Add model configuration if provided
    if (modelConfig) {
      if (modelConfig.primaryModel.trim()) {
        updateData.primaryModel = modelConfig.primaryModel.trim()
      }
      if (modelConfig.fastModel.trim()) {
        updateData.fastModel = modelConfig.fastModel.trim()
      }
    }
  }

  const result = await ClaudeCodeConfigManager.updateProfile(selectedProfile.id!, updateData)

  if (result.success) {
    console.log(ansis.green(i18n.t('multi-config:profileUpdated', { name: updateData.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }

    // If this is the current profile, apply changes
    const currentConfig = ClaudeCodeConfigManager.readConfig()
    if (currentConfig?.currentProfileId === selectedProfile.id) {
      const updatedProfile = ClaudeCodeConfigManager.getProfileById(selectedProfile.id!)
      if (updatedProfile) {
        await ClaudeCodeConfigManager.applyProfileSettings(updatedProfile)
        console.log(ansis.green(i18n.t('multi-config:settingsApplied')))
      }
    }
  }
  else {
    console.log(ansis.red(i18n.t('multi-config:profileUpdateFailed', { error: result.error })))
  }
}

/**
 * Handle copying an existing Claude Code profile
 */
async function handleCopyProfile(profiles: ClaudeCodeProfile[]): Promise<void> {
  const choices = profiles.map(profile => ({
    name: `${profile.name} (${getAuthTypeLabel(profile.authType)})`,
    value: profile.id,
  }))

  const { selectedProfileId } = await inquirer.prompt<{ selectedProfileId: string }>([{
    type: 'list',
    name: 'selectedProfileId',
    message: i18n.t('multi-config:selectProfileToCopy'),
    choices: addNumbersToChoices(choices),
  }])

  if (!selectedProfileId) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)
  if (!selectedProfile) {
    console.log(ansis.red(i18n.t('multi-config:profileNotFound')))
    return
  }

  console.log(ansis.cyan(`\n${i18n.t('multi-config:copyingProfile', { name: selectedProfile.name })}`))

  // Prepare copied profile with -copy suffix
  const copiedName = `${selectedProfile.name}-copy`

  // Build prompt questions based on authType
  const questions: any[] = [
    {
      type: 'input',
      name: 'profileName',
      message: i18n.t('multi-config:profileNamePrompt'),
      default: copiedName,
      validate: (input: string) => {
        const trimmed = input.trim()
        if (!trimmed) {
          return i18n.t('multi-config:profileNameRequired')
        }
        if (!/^[\w\-\s.\u4E00-\u9FA5]+$/.test(trimmed)) {
          return i18n.t('multi-config:profileNameInvalid')
        }
        return true
      },
    },
  ]

  // Only add baseUrl and apiKey questions for non-CCR profiles
  if (selectedProfile.authType !== 'ccr_proxy') {
    questions.push(
      {
        type: 'input',
        name: 'baseUrl',
        message: i18n.t('multi-config:baseUrlPrompt'),
        default: selectedProfile.baseUrl || 'https://api.anthropic.com',
        validate: (input: string) => {
          const trimmed = input.trim()
          if (!trimmed) {
            return i18n.t('multi-config:baseUrlRequired')
          }
          try {
            // eslint-disable-next-line no-new
            new URL(trimmed)
            return true
          }
          catch {
            return i18n.t('multi-config:baseUrlInvalid')
          }
        },
      },
      {
        type: 'input',
        name: 'apiKey',
        message: i18n.t('multi-config:apiKeyPrompt'),
        default: selectedProfile.apiKey,
        validate: (input: string) => {
          const trimmed = input.trim()
          if (!trimmed) {
            return i18n.t('multi-config:apiKeyRequired')
          }

          const validation = validateApiKey(trimmed)
          if (!validation.isValid) {
            return validation.error || 'Invalid API key format'
          }

          return true
        },
      },
    )
  }

  const answers = await inquirer.prompt<{
    profileName: string
    apiKey?: string
    baseUrl?: string
  }>(questions)

  // Prompt for model configuration (for non-CCR profiles)
  let modelConfig: { primaryModel: string, fastModel: string } | null = null
  if (selectedProfile.authType !== 'ccr_proxy') {
    const { promptCustomModels } = await import('./features')
    modelConfig = await promptCustomModels(
      selectedProfile.primaryModel,
      selectedProfile.fastModel,
    )
  }

  // Ask if set as default
  const setAsDefault = await promptBoolean({
    message: i18n.t('multi-config:setAsDefaultPrompt'),
    defaultValue: false,
  })

  // Create copied profile object
  const profileName = answers.profileName.trim()
  const profileId = ClaudeCodeConfigManager.generateProfileId(profileName)
  const copiedProfile: ClaudeCodeProfile = {
    id: profileId,
    name: profileName,
    authType: selectedProfile.authType,
  }

  if (selectedProfile.authType !== 'ccr_proxy') {
    copiedProfile.apiKey = answers.apiKey!.trim()
    copiedProfile.baseUrl = answers.baseUrl!.trim()

    // Add model configuration if provided
    if (modelConfig) {
      if (modelConfig.primaryModel.trim()) {
        copiedProfile.primaryModel = modelConfig.primaryModel.trim()
      }
      if (modelConfig.fastModel.trim()) {
        copiedProfile.fastModel = modelConfig.fastModel.trim()
      }
    }
  }

  // Add the copied profile
  const result = await ClaudeCodeConfigManager.addProfile(copiedProfile)

  if (result.success) {
    const runtimeProfile = result.addedProfile || { ...copiedProfile, id: profileId }
    console.log(ansis.green(i18n.t('multi-config:profileCopied', { name: runtimeProfile.name })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }

    if (setAsDefault) {
      const switchResult = await ClaudeCodeConfigManager.switchProfile(runtimeProfile.id!)
      if (switchResult.success) {
        console.log(ansis.green(i18n.t('multi-config:profileSetAsDefault', { name: runtimeProfile.name })))
        await ClaudeCodeConfigManager.applyProfileSettings(runtimeProfile)
      }
    }
  }
  else {
    console.log(ansis.red(i18n.t('multi-config:profileCopyFailed', { error: result.error })))
  }
}

/**
 * Handle deleting Claude Code profiles
 */
async function handleDeleteProfile(profiles: ClaudeCodeProfile[]): Promise<void> {
  if (profiles.length <= 1) {
    console.log(ansis.yellow(i18n.t('multi-config:cannotDeleteLast')))
    return
  }

  const choices = profiles.map(profile => ({
    name: `${profile.name} (${getAuthTypeLabel(profile.authType)})`,
    value: profile.id,
  }))

  const { selectedProfileIds } = await inquirer.prompt<{ selectedProfileIds: string[] }>({
    type: 'checkbox',
    name: 'selectedProfileIds',
    message: i18n.t('multi-config:selectProfilesToDelete'),
    choices: addNumbersToChoices(choices),
    validate: (input: readonly any[]) => {
      if (input.length === 0) {
        return i18n.t('multi-config:selectAtLeastOne')
      }
      if (input.length >= profiles.length) {
        return i18n.t('multi-config:cannotDeleteAll')
      }
      return true
    },
  })

  if (!selectedProfileIds || selectedProfileIds.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const selectedNames = selectedProfileIds.map(id =>
    profiles.find(p => p.id === id)?.name || id,
  )

  const confirmed = await promptBoolean({
    message: i18n.t('multi-config:confirmDeleteProfiles', { providers: selectedNames.join(', ') }),
    defaultValue: false,
  })

  if (!confirmed) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const result = await ClaudeCodeConfigManager.deleteProfiles(selectedProfileIds)

  if (result.success) {
    console.log(ansis.green(i18n.t('multi-config:profilesDeleted', { count: selectedProfileIds.length })))
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t('common:backupCreated', { path: result.backupPath })))
    }

    if (result.newCurrentProfileId) {
      const newProfile = ClaudeCodeConfigManager.getProfileById(result.newCurrentProfileId)
      if (newProfile) {
        console.log(ansis.cyan(i18n.t('multi-config:newDefaultProfile', { profile: newProfile.name })))
        await ClaudeCodeConfigManager.applyProfileSettings(newProfile)
      }
    }
  }
  else {
    console.log(ansis.red(i18n.t('multi-config:profilesDeleteFailed', { error: result.error })))
  }
}
