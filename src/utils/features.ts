import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { changeLanguage, ensureI18nInitialized, i18n } from '../i18n'
import { switchToOfficialLogin } from './config'
import { addNumbersToChoices } from './prompt-helpers'
import { updateZcfConfig } from './zcf-config'

async function handleCancellation(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.yellow(i18n.t('common:cancelled')))
}

// Handle official login mode
async function handleOfficialLoginMode(): Promise<void> {
  ensureI18nInitialized()
  const success = switchToOfficialLogin()
  if (success) {
    console.log(ansis.green(`✔ ${i18n.t('api:officialLoginConfigured')}`))
  }
  else {
    console.log(ansis.red(i18n.t('api:officialLoginFailed')))
  }
}

// Handle custom API configuration mode (Claude Code incremental profile management)
async function handleCustomApiMode(): Promise<void> {
  ensureI18nInitialized()
  const { configureIncrementalManagement } = await import('./claude-code-incremental-manager')
  await configureIncrementalManagement()
}

// Handle switch config mode
async function handleSwitchConfigMode(): Promise<void> {
  ensureI18nInitialized()
  const { configSwitchCommand } = await import('../commands/config-switch')
  await configSwitchCommand({})
}

// Configure API: official login / custom profiles / switch between profiles
export async function configureApiFeature(): Promise<void> {
  ensureI18nInitialized()

  const { mode } = await inquirer.prompt<{ mode: string }>({
    type: 'list',
    name: 'mode',
    message: i18n.t('api:apiModePrompt'),
    choices: addNumbersToChoices([
      { name: i18n.t('api:apiModeOfficial'), value: 'official' },
      { name: i18n.t('api:apiModeCustom'), value: 'custom' },
      { name: i18n.t('api:apiModeSwitch'), value: 'switch' },
      { name: i18n.t('api:apiModeSkip'), value: 'skip' },
    ]),
  })

  if (!mode || mode === 'skip') {
    await handleCancellation()
    return
  }

  switch (mode) {
    case 'official':
      await handleOfficialLoginMode()
      break
    case 'custom':
      await handleCustomApiMode()
      break
    case 'switch':
      await handleSwitchConfigMode()
      break
    default:
      await handleCancellation()
      break
  }
}

// Prompt for custom model names (used by incremental profile management)
export async function promptCustomModels(
  defaultPrimaryModel?: string,
  defaultHaikuModel?: string,
  defaultSonnetModel?: string,
  defaultOpusModel?: string,
): Promise<{ primaryModel: string, haikuModel: string, sonnetModel: string, opusModel: string }> {
  const { primaryModel } = await inquirer.prompt<{ primaryModel: string }>({
    type: 'input',
    name: 'primaryModel',
    message: `${i18n.t('configuration:enterPrimaryModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultPrimaryModel || '',
  })

  const { haikuModel } = await inquirer.prompt<{ haikuModel: string }>({
    type: 'input',
    name: 'haikuModel',
    message: `${i18n.t('configuration:enterHaikuModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultHaikuModel || '',
  })

  const { sonnetModel } = await inquirer.prompt<{ sonnetModel: string }>({
    type: 'input',
    name: 'sonnetModel',
    message: `${i18n.t('configuration:enterSonnetModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultSonnetModel || '',
  })

  const { opusModel } = await inquirer.prompt<{ opusModel: string }>({
    type: 'input',
    name: 'opusModel',
    message: `${i18n.t('configuration:enterOpusModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultOpusModel || '',
  })

  return { primaryModel, haikuModel, sonnetModel, opusModel }
}

// Change script (interface) language
export async function changeScriptLanguageFeature(currentLang: SupportedLang): Promise<SupportedLang> {
  ensureI18nInitialized()

  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.t('language:selectScriptLang'),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map(l => ({
        name: LANG_LABELS[l],
        value: l,
      })),
    ),
    default: SUPPORTED_LANGS.indexOf(currentLang),
  })

  if (!lang) {
    return currentLang
  }

  updateZcfConfig({ preferredLang: lang })

  await changeLanguage(lang)

  console.log(ansis.green(`✔ ${i18n.t('language:languageChanged') || 'Language changed'}`))

  return lang
}
