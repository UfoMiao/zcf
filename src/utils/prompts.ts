import type { AiOutputLanguage, SupportedLang } from '../constants'
import type { ZcfConfig } from './zcf-config'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { AI_OUTPUT_LANGUAGES, getAiOutputLanguageLabel, LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { addNumbersToChoices } from './prompt-helpers'
import { readZcfConfig, updateZcfConfig } from './zcf-config'

/**
 * Prompt user to select AI output language
 */
export async function selectAiOutputLanguage(
  defaultLang?: AiOutputLanguage | string,
): Promise<AiOutputLanguage | string> {
  ensureI18nInitialized()

  console.log(ansis.dim(`\n  ${i18n.t('language:aiOutputLangHint')}\n`))

  const aiLangChoices = Object.entries(AI_OUTPUT_LANGUAGES).map(([key]) => ({
    title: getAiOutputLanguageLabel(key as AiOutputLanguage),
    value: key,
  }))

  // Set default selection
  const defaultChoice = defaultLang || 'en'

  const { lang } = await inquirer.prompt<{ lang: string }>({
    type: 'list',
    name: 'lang',
    message: i18n.t('language:selectAiOutputLang'),
    choices: addNumbersToChoices(aiLangChoices.map(choice => ({
      name: choice.title,
      value: choice.value,
    }))),
    default: defaultChoice,
  })

  if (!lang) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    process.exit(0)
  }

  const aiOutputLang = lang as AiOutputLanguage

  // If custom language selected, ask for the specific language
  if (aiOutputLang === 'custom') {
    const { customLang } = await inquirer.prompt<{ customLang: string }>({
      type: 'input',
      name: 'customLang',
      message: i18n.t('language:enterCustomLanguage'),
      validate: async value => !!value || i18n.t('language:languageRequired') || 'Language is required',
    })

    if (!customLang) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      process.exit(0)
    }

    return customLang
  }

  return aiOutputLang
}

// Constants for language selection (must be hardcoded bilingual since i18n is not initialized yet)
const LANGUAGE_SELECTION_MESSAGES = {
  selectLanguage: 'Select ZCF display language / 选择ZCF显示语言',
  operationCancelled: 'Operation cancelled / 操作已取消',
} as const

/**
 * Select ZCF display language (for first-time users or when config is not found)
 * Note: Uses hardcoded bilingual messages since i18n is not initialized at this point
 */
export async function selectScriptLanguage(currentLang?: SupportedLang): Promise<SupportedLang> {
  // Try to read from saved config first
  const zcfConfig = readZcfConfig()
  if (zcfConfig?.preferredLang) {
    return zcfConfig.preferredLang
  }

  // If provided as parameter, use it
  if (currentLang) {
    return currentLang
  }

  // Ask user to select
  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: LANGUAGE_SELECTION_MESSAGES.selectLanguage,
    choices: addNumbersToChoices(SUPPORTED_LANGS.map(l => ({
      name: LANG_LABELS[l],
      value: l,
    }))),
  })

  if (!lang) {
    console.log(ansis.yellow(LANGUAGE_SELECTION_MESSAGES.operationCancelled))
    process.exit(0)
  }

  const scriptLang = lang

  // Save the selected language preference
  updateZcfConfig({
    version,
    preferredLang: scriptLang,
  })

  return scriptLang
}

/**
 * Resolve AI output language with priority order
 * Priority: 1. Command line option, 2. Saved config, 3. Ask user
 */
export async function resolveAiOutputLanguage(
  scriptLang: SupportedLang,
  commandLineOption?: AiOutputLanguage | string,
  savedConfig?: ZcfConfig | null,
): Promise<AiOutputLanguage | string> {
  ensureI18nInitialized()

  // Priority 1: Command line option
  if (commandLineOption) {
    return commandLineOption
  }

  // Priority 2: Saved config
  if (savedConfig?.aiOutputLang) {
    console.log(ansis.gray(`✔ ${i18n.t('language:aiOutputLangHint')}: ${savedConfig.aiOutputLang}`))
    return savedConfig.aiOutputLang
  }

  // Priority 3: Ask user
  return await selectAiOutputLanguage(scriptLang)
}
