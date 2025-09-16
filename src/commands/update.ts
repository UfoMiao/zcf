import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { runCodexUpdate } from '../utils/code-tools/codex'
import { updatePromptOnly } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config'

export interface UpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  codeType?: CodeToolType
}

function resolveCodeToolType(optionValue: unknown, savedValue?: CodeToolType | null): CodeToolType {
  if (isCodeToolType(optionValue)) {
    return optionValue
  }

  if (savedValue && isCodeToolType(savedValue)) {
    return savedValue
  }

  return DEFAULT_CODE_TOOL_TYPE
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  try {
    // Display banner
    if (!options.skipBanner) {
      displayBanner(i18n.t('cli:banner.updateSubtitle'))
    }

    // Get configuration
    const zcfConfig = readZcfConfig()
    const codeToolType = resolveCodeToolType(options.codeType, zcfConfig?.codeToolType)
    options.codeType = codeToolType

    if (codeToolType === 'codex') {
      await runCodexUpdate()

      const newPreferredLang = options.configLang || zcfConfig?.preferredLang
      if (newPreferredLang) {
        updateZcfConfig({
          version,
          preferredLang: newPreferredLang,
          codeToolType,
        })
      }
      else {
        updateZcfConfig({
          version,
          codeToolType,
        })
      }
      return
    }

    // Select config language if not provided
    let configLang = options.configLang as SupportedLang
    if (!configLang) {
      // Create static language hint keys for i18n-ally compatibility
      const LANG_HINT_KEYS = {
        'zh-CN': i18n.t('language:configLangHint.zh-CN'),
        'en': i18n.t('language:configLangHint.en'),
      } as const

      const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
        type: 'list',
        name: 'lang',
        message: i18n.t('language:updateConfigLangPrompt'),
        choices: addNumbersToChoices(SUPPORTED_LANGS.map(l => ({
          name: `${LANG_LABELS[l]} - ${LANG_HINT_KEYS[l]}`,
          value: l,
        }))),
      })

      if (!lang) {
        console.log(ansis.yellow(i18n.t('common:cancelled')))
        process.exit(0)
      }

      configLang = lang
    }

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, zcfConfig)

    console.log(ansis.cyan(`\n${i18n.t('configuration:updatingPrompts')}\n`))

    // Execute prompt-only update with AI language
    await updatePromptOnly(aiOutputLang)

    // Select and install workflows
    await selectAndInstallWorkflows(configLang)

    // Check for Claude Code updates (update command always checks interactively)
    await checkClaudeCodeVersionAndPrompt(false)

    // Update zcf config with new version and AI language preference
    updateZcfConfig({
      version,
      aiOutputLang,
      codeToolType,
    })
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
