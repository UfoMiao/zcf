import type { CodeToolType } from '../constants'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { ClaudeCodeConfigManager } from '../utils/claude-code-config-manager'
import { listCodexProviders, readCodexConfig, switchToOfficialLogin as switchCodexOfficialLogin, switchCodexProvider, switchToProvider } from '../utils/code-tools/codex'
import { handleGeneralError } from '../utils/error-handler'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { readZcfConfig } from '../utils/zcf-config'

interface ConfigSwitchOptions {
  codeType?: CodeToolType // --code-type, -T
  list?: boolean // --list
  target?: string // Positional parameter: profile name or provider name
}

/**
 * Main config-switch command handler
 * @param options - Command options
 */
export async function configSwitchCommand(options: ConfigSwitchOptions): Promise<void> {
  try {
    ensureI18nInitialized()

    // Handle --list flag
    if (options.list) {
      await handleList(options.codeType)
      return
    }

    // Handle direct switch
    if (options.target) {
      const resolvedCodeType = resolveCodeType(options.codeType)
      await handleDirectSwitch(resolvedCodeType, options.target)
      return
    }

    // Interactive mode
    await handleInteractiveSwitch(options.codeType)
  }
  catch (error) {
    // In test environment, re-throw the error instead of calling handleGeneralError
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      throw error
    }
    handleGeneralError(error)
  }
}

/**
 * Resolve code type with priority: parameter > ZCF config > default value (claude-code)
 * @param codeType - Code type from command line parameter (supports short aliases like 'cc', 'cx')
 */
function resolveCodeType(codeType?: unknown): CodeToolType {
  // First try to use the parameter value (supports short aliases)
  if (codeType !== undefined) {
    const resolved = resolveCodeToolType(codeType)
    return resolved
  }

  // Fall back to ZCF config
  const zcfConfig = readZcfConfig()
  if (zcfConfig?.codeToolType && isCodeToolType(zcfConfig.codeToolType)) {
    return zcfConfig.codeToolType
  }

  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Handle --list flag to show available configurations
 */
async function handleList(codeType?: CodeToolType): Promise<void> {
  const targetCodeType = resolveCodeType(codeType)

  if (targetCodeType === 'claude-code') {
    await listClaudeCodeProfiles()
  }
  else if (targetCodeType === 'codex') {
    await listCodexProvidersWithDisplay()
  }
}

/**
 * List available Codex providers with display
 */
async function listCodexProvidersWithDisplay(): Promise<void> {
  const providers = await listCodexProviders()
  const existingConfig = readCodexConfig()
  const currentProvider = existingConfig?.modelProvider
  const isCommented = existingConfig?.modelProviderCommented

  if (!providers || providers.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noProvidersAvailable')))
    return
  }

  console.log(ansis.bold(i18n.t('codex:listProvidersTitle')))
  console.log()

  if (currentProvider && !isCommented) {
    console.log(ansis.cyan(i18n.t('codex:currentProvider', { provider: currentProvider })))
    console.log()
  }

  providers.forEach((provider: any) => {
    const isCurrent = currentProvider === provider.id && !isCommented
    const status = isCurrent ? ansis.green('● ') : '  '
    const current = isCurrent ? ansis.yellow(` (${i18n.t('common:current')})`) : ''

    console.log(`${status}${ansis.white(provider.name)}${current}`)
    console.log(`    ${ansis.cyan(`ID: ${provider.id}`)} ${ansis.gray(`(${provider.baseUrl})`)}`)
    if (provider.envKey) {
      console.log(`    ${ansis.gray(`Env: ${provider.envKey}`)}`)
    }
    console.log()
  })
}

/**
 * List available Claude Code profiles
 */
async function listClaudeCodeProfiles(): Promise<void> {
  const config = ClaudeCodeConfigManager.readConfig()

  if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
    console.log(ansis.yellow(i18n.t('multi-config:noClaudeCodeProfilesAvailable')))
    return
  }

  console.log(ansis.bold(i18n.t('multi-config:availableClaudeCodeProfiles')))
  console.log()

  const currentProfileId = config.currentProfileId

  Object.values(config.profiles).forEach((profile: any) => {
    const isCurrent = profile.id === currentProfileId
    const status = isCurrent ? ansis.green('● ') : '  '
    const current = isCurrent ? ansis.yellow(i18n.t('common:current')) : ''

    console.log(`${status}${ansis.white(profile.name)}${current}`)
    console.log(`    ${ansis.cyan(`ID: ${profile.id}`)} ${ansis.gray(`(${profile.authType})`)}`)
    console.log()
  })
}

/**
 * Handle direct configuration switch with specified target
 * @param codeType - Code tool type
 * @param target - Target configuration ID or special value
 */
async function handleDirectSwitch(codeType: CodeToolType, target: string): Promise<void> {
  const resolvedCodeType = resolveCodeType(codeType)

  if (resolvedCodeType === 'claude-code') {
    await handleClaudeCodeDirectSwitch(target)
  }
  else if (resolvedCodeType === 'codex') {
    await switchCodexProvider(target)
    // switchCodexProvider already handles success/failure messages
  }
}

/**
 * Handle direct Claude Code profile switch
 * @param target - Profile ID or special value ('official', 'ccr')
 */
async function handleClaudeCodeDirectSwitch(target: string): Promise<void> {
  if (target === 'official') {
    const result = await ClaudeCodeConfigManager.switchToOfficial()
    if (result.success) {
      try {
        await ClaudeCodeConfigManager.applyProfileSettings(null)
        console.log(ansis.green(i18n.t('multi-config:successfullySwitchedToOfficial')))
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        console.log(ansis.red(reason))
      }
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:failedToSwitchToOfficial', { error: result.error })))
    }
  }
  else if (target === 'ccr') {
    const result = await ClaudeCodeConfigManager.switchToCcr()
    if (result.success) {
      try {
        const profile = ClaudeCodeConfigManager.getProfileById('ccr-proxy')
        await ClaudeCodeConfigManager.applyProfileSettings(profile)
        console.log(ansis.green(i18n.t('multi-config:successfullySwitchedToCcr')))
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        console.log(ansis.red(reason))
      }
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:failedToSwitchToCcr', { error: result.error })))
    }
  }
  else {
    const config = ClaudeCodeConfigManager.readConfig()
    if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
      console.log(ansis.yellow(i18n.t('multi-config:noClaudeCodeProfilesAvailable')))
      return
    }

    const normalizedTarget = target.trim()
    let resolvedId = normalizedTarget
    let resolvedProfile = config.profiles[normalizedTarget]

    if (!resolvedProfile) {
      const match = Object.entries(config.profiles)
        .find(([, profile]) => profile.name === normalizedTarget)

      if (match) {
        resolvedId = match[0]
        resolvedProfile = match[1]
      }
    }

    if (!resolvedProfile) {
      console.log(ansis.red(i18n.t('multi-config:profileNameNotFound', { name: target })))
      return
    }

    const result = await ClaudeCodeConfigManager.switchProfile(resolvedId)
    if (result.success) {
      try {
        await ClaudeCodeConfigManager.applyProfileSettings({ ...resolvedProfile, id: resolvedId })
        console.log(ansis.green(i18n.t('multi-config:successfullySwitchedToProfile', { name: resolvedProfile.name })))
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        console.log(ansis.red(reason))
      }
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:failedToSwitchToProfile', { error: result.error })))
    }
  }
}

/**
 * Handle interactive API configuration selection (includes official login + providers)
 */
async function handleInteractiveSwitch(codeType?: CodeToolType): Promise<void> {
  const resolvedCodeType = resolveCodeType(codeType)

  if (resolvedCodeType === 'claude-code') {
    await handleClaudeCodeInteractiveSwitch()
  }
  else if (resolvedCodeType === 'codex') {
    await handleCodexInteractiveSwitch()
  }
}

/**
 * Handle interactive Claude Code configuration selection
 */
async function handleClaudeCodeInteractiveSwitch(): Promise<void> {
  const config = ClaudeCodeConfigManager.readConfig()

  if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
    console.log(ansis.yellow(i18n.t('multi-config:noClaudeCodeProfilesAvailable')))
    return
  }

  const currentProfileId = config.currentProfileId

  // Create configuration choices (official login + CCR + profiles)
  const createClaudeCodeChoices = (profiles: Record<string, any>, currentProfileId?: string): Array<{ name: string, value: string }> => {
    const choices: Array<{ name: string, value: string }> = []

    // Add official login option first
    const isOfficialMode = !currentProfileId || currentProfileId === 'official'
    choices.push({
      name: isOfficialMode
        ? `${ansis.green('● ')}${i18n.t('codex:useOfficialLogin')} ${ansis.yellow(`(${i18n.t('common:current')})`)}`
        : `  ${i18n.t('codex:useOfficialLogin')}`,
      value: 'official',
    })

    // Add CCR option
    const isCcrMode = currentProfileId === 'ccr-proxy'
    choices.push({
      name: isCcrMode
        ? `${ansis.green('● ')}${i18n.t('multi-config:ccrProxyOption')} ${ansis.yellow(`(${i18n.t('common:current')})`)}`
        : `  ${i18n.t('multi-config:ccrProxyOption')}`,
      value: 'ccr',
    })

    // Add profile options
    Object.values(profiles)
      .filter((profile: any) => profile.id !== 'ccr-proxy')
      .forEach((profile: any) => {
        const isCurrent = profile.id === currentProfileId
        choices.push({
          name: isCurrent
            ? `${ansis.green('● ')}${profile.name} ${ansis.yellow('(current)')}`
            : `  ${profile.name}`,
          value: profile.id,
        })
      })

    return choices
  }

  const choices = createClaudeCodeChoices(config.profiles, currentProfileId)

  try {
    const { selectedConfig } = await inquirer.prompt<{ selectedConfig: string }>([{
      type: 'list',
      name: 'selectedConfig',
      message: i18n.t('multi-config:selectClaudeCodeConfiguration'),
      choices: addNumbersToChoices(choices),
    }])

    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t('multi-config:cancelled')))
      return
    }

    await handleClaudeCodeDirectSwitch(selectedConfig)
  }
  catch (error: any) {
    // Handle user exit (Ctrl+C)
    if (error.name === 'ExitPromptError') {
      console.log(ansis.cyan(`\n${i18n.t('common:goodbye')}`))
      return
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Handle interactive Codex configuration selection
 */
async function handleCodexInteractiveSwitch(): Promise<void> {
  const providers = await listCodexProviders()

  if (!providers || providers.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noProvidersAvailable')))
    return
  }

  const existingConfig = readCodexConfig()
  const currentProvider = existingConfig?.modelProvider
  const isCommented = existingConfig?.modelProviderCommented

  // Create API configuration choices (official login + providers)
  const createApiConfigChoices = (providers: any[], currentProvider?: string | null, isCommented?: boolean): Array<{ name: string, value: string }> => {
    const choices: Array<{ name: string, value: string }> = []

    // Add official login option first
    const isOfficialMode = !currentProvider || isCommented
    choices.push({
      name: isOfficialMode
        ? `${ansis.green('● ')}${i18n.t('codex:useOfficialLogin')} ${ansis.yellow('(当前)')}`
        : `  ${i18n.t('codex:useOfficialLogin')}`,
      value: 'official',
    })

    // Add provider options
    providers.forEach((provider: any) => {
      const isCurrent = currentProvider === provider.id && !isCommented
      choices.push({
        name: isCurrent
          ? `${ansis.green('● ')}${provider.name} - ${ansis.gray(provider.id)} ${ansis.yellow('(当前)')}`
          : `  ${provider.name} - ${ansis.gray(provider.id)}`,
        value: provider.id,
      })
    })

    return choices
  }

  const choices = createApiConfigChoices(providers, currentProvider, isCommented)

  try {
    const { selectedConfig } = await inquirer.prompt<{ selectedConfig: string }>([{
      type: 'list',
      name: 'selectedConfig',
      message: i18n.t('codex:apiConfigSwitchPrompt'),
      choices: addNumbersToChoices(choices),
    }])

    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    let success = false
    if (selectedConfig === 'official') {
      success = await switchCodexOfficialLogin()
    }
    else {
      success = await switchToProvider(selectedConfig)
    }

    if (!success) {
      console.log(ansis.red(i18n.t('common:operationFailed')))
    }
  }
  catch (error: any) {
    // Handle user exit (Ctrl+C)
    if (error.name === 'ExitPromptError') {
      console.log(ansis.cyan(`\n${i18n.t('common:goodbye')}`))
      return
    }
    // Re-throw other errors
    throw error
  }
}
