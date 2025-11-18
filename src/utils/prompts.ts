import type { AiOutputLanguage, SupportedLang } from '../constants'
import type { ZcfTomlConfig } from '../types/toml-config'
import type { ZcfConfig } from './zcf-config'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { AI_OUTPUT_LANGUAGES, getAiOutputLanguageLabel, LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'
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
  skipPrompt?: boolean,
): Promise<AiOutputLanguage | string> {
  ensureI18nInitialized()

  // Priority 1: Command line option
  if (commandLineOption) {
    return commandLineOption
  }

  // Priority 2: Check saved config
  if (savedConfig?.aiOutputLang) {
    if (skipPrompt) {
      // Non-interactive mode: return saved config directly
      return savedConfig.aiOutputLang
    }

    // Interactive mode: ask for modification
    const currentLanguageLabel = getAiOutputLanguageLabel(savedConfig.aiOutputLang as AiOutputLanguage) || savedConfig.aiOutputLang
    console.log(ansis.blue(`${i18n.t('language:currentConfigFound')}: ${currentLanguageLabel}`))

    const shouldModify = await promptBoolean({
      message: i18n.t('language:modifyConfigPrompt'),
      defaultValue: false,
    })

    if (!shouldModify) {
      console.log(ansis.gray(`✔ ${i18n.t('language:aiOutputLangHint')}: ${currentLanguageLabel}`))
      return savedConfig.aiOutputLang
    }

    // User wants to modify, proceed to language selection
    return await selectAiOutputLanguage(scriptLang)
  }

  // Priority 3: No saved config
  if (skipPrompt) {
    // Non-interactive mode: fallback to script language
    return scriptLang
  }

  // Interactive mode: ask user to select
  return await selectAiOutputLanguage(scriptLang)
}

/**
 * Prompt user to select template language
 */
export async function selectTemplateLanguage(): Promise<SupportedLang> {
  ensureI18nInitialized()

  // Create static language hint keys for i18n-ally compatibility
  const LANG_HINT_KEYS = {
    'zh-CN': i18n.t('language:configLangHint.zh-CN'),
    'en': i18n.t('language:configLangHint.en'),
  } as const

  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.t('language:selectConfigLang'),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map(l => ({
        name: `${LANG_LABELS[l]} - ${LANG_HINT_KEYS[l]}`,
        value: l,
      })),
    ),
  })

  if (!lang) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    process.exit(0)
  }

  return lang
}

/**
 * Resolve template language with priority order
 * Priority: 1. Command line option, 2. Saved template language config, 3. Backward compatibility (preferredLang), 4. Ask user
 */
export async function resolveTemplateLanguage(
  commandLineOption?: SupportedLang,
  savedConfig?: ZcfConfig | null,
  skipPrompt?: boolean,
): Promise<SupportedLang> {
  ensureI18nInitialized()

  // Priority 1: Command line option
  if (commandLineOption) {
    return commandLineOption
  }

  // Priority 2: Check saved template language config
  if (savedConfig?.templateLang) {
    if (skipPrompt) {
      // Non-interactive mode: return saved config directly
      return savedConfig.templateLang
    }

    // Interactive mode: ask for modification
    const currentLanguageLabel = LANG_LABELS[savedConfig.templateLang]
    console.log(ansis.blue(`${i18n.t('language:currentTemplateLanguageFound')}: ${currentLanguageLabel}`))

    const shouldModify = await promptBoolean({
      message: i18n.t('language:modifyTemplateLanguagePrompt'),
      defaultValue: false,
    })

    if (!shouldModify) {
      console.log(ansis.gray(`✔ ${i18n.t('language:selectConfigLang')}: ${currentLanguageLabel}`))
      return savedConfig.templateLang
    }

    // User wants to modify, proceed to language selection
    return await selectTemplateLanguage()
  }

  // Priority 3: Backward compatibility - use preferredLang if templateLang is not set
  if (savedConfig?.preferredLang && !savedConfig?.templateLang) {
    if (skipPrompt) {
      // Non-interactive mode: return fallback directly
      return savedConfig.preferredLang
    }

    // Interactive mode: ask for modification
    console.log(ansis.yellow(`${i18n.t('language:usingFallbackTemplate')}: ${LANG_LABELS[savedConfig.preferredLang]}`))

    const shouldModify = await promptBoolean({
      message: i18n.t('language:modifyTemplateLanguagePrompt'),
      defaultValue: false,
    })

    if (!shouldModify) {
      // First time migration - save the preferred language as template language
      return savedConfig.preferredLang
    }

    // User wants to modify, proceed to language selection
    return await selectTemplateLanguage()
  }

  // Priority 4: No saved config
  if (skipPrompt) {
    // Non-interactive mode: default to English
    return 'en'
  }

  // Interactive mode: ask user to select
  return await selectTemplateLanguage()
}

/**
 * Resolve system prompt style with priority order
 * Priority: 1. Command line option, 2. Saved config, 3. Ask user
 */
export async function resolveSystemPromptStyle(
  availablePrompts: Array<{ id: string, name: string, description: string }>,
  commandLineOption?: string,
  savedConfig?: ZcfTomlConfig | null,
  skipPrompt?: boolean,
): Promise<string> {
  ensureI18nInitialized()

  // Priority 1: Command line option
  if (commandLineOption && availablePrompts.some(p => p.id === commandLineOption)) {
    return commandLineOption
  }

  // Priority 2: Check saved config
  if (savedConfig?.codex?.systemPromptStyle) {
    const currentStyleId = savedConfig.codex.systemPromptStyle
    const currentStyle = availablePrompts.find(p => p.id === currentStyleId)

    if (currentStyle) {
      if (skipPrompt) {
        // Non-interactive mode: return saved config directly
        return currentStyleId
      }

      // Interactive mode: ask for modification
      console.log(ansis.blue(`${i18n.t('language:currentSystemPromptFound')}: ${currentStyle.name}`))

      const shouldModify = await promptBoolean({
        message: i18n.t('language:modifySystemPromptPrompt'),
        defaultValue: false,
      })

      if (!shouldModify) {
        console.log(ansis.gray(`✔ ${i18n.t('language:currentSystemPromptFound')}: ${currentStyle.name}`))
        return currentStyleId
      }
    }
  }

  // Priority 3: No saved config
  if (skipPrompt) {
    // Non-interactive mode: default to engineer-professional
    return 'engineer-professional'
  }

  // Interactive mode: ask user to select
  const { systemPrompt } = await inquirer.prompt<{ systemPrompt: string }>([{
    type: 'list',
    name: 'systemPrompt',
    message: i18n.t('codex:systemPromptPrompt'),
    choices: addNumbersToChoices(availablePrompts.map(style => ({
      name: `${style.name} - ${ansis.gray(style.description)}`,
      value: style.id,
    }))),
    default: 'engineer-professional', // Default to engineer-professional
  }])

  if (!systemPrompt) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    process.exit(0)
  }

  return systemPrompt
}
