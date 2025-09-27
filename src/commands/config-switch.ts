import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { getCurrentCodexProvider, listCodexProviders, readCodexConfig, switchCodexProvider, switchToOfficialLogin, switchToProvider } from '../utils/code-tools/codex'
import { handleGeneralError } from '../utils/error-handler'
import { addNumbersToChoices } from '../utils/prompt-helpers'

interface ConfigSwitchOptions {
  provider?: string
  list?: boolean
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
      await handleListProviders()
      return
    }

    // Handle direct provider switch
    if (options.provider) {
      await handleDirectSwitch(options.provider)
      return
    }

    // Interactive mode
    await handleInteractiveSwitch()
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
 * Handle --list flag to show available providers
 */
async function handleListProviders(): Promise<void> {
  const providers = await listCodexProviders()
  const currentProvider = await getCurrentCodexProvider()

  console.log(ansis.cyan(i18n.t('codex:listProvidersTitle')))
  console.log('')

  if (providers.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noProvidersAvailable')))
    return
  }

  if (currentProvider) {
    console.log(ansis.green(`${i18n.t('codex:currentProvider', { provider: currentProvider })}`))
    console.log('')
  }

  for (const provider of providers) {
    const marker = currentProvider === provider.id ? ansis.green('● ') : '  '
    console.log(`${marker}${ansis.cyan(provider.id)} - ${provider.name}`)
    console.log(`    ${ansis.gray(provider.baseUrl)}`)
  }
}

/**
 * Handle direct provider switch with specified provider
 * @param providerId - Provider ID to switch to
 */
async function handleDirectSwitch(providerId: string): Promise<void> {
  await switchCodexProvider(providerId)
  // switchCodexProvider already handles success/failure messages
}

/**
 * Handle interactive API configuration selection (includes official login + providers)
 */
async function handleInteractiveSwitch(): Promise<void> {
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
      success = await switchToOfficialLogin()
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
