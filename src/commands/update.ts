import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import { version } from '../../package.json'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { runCodexUpdate } from '../utils/code-tools/codex'
import { updatePromptOnly } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
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

    // Use intelligent template language selection
    const { resolveTemplateLanguage } = await import('../utils/prompts')
    const configLang = await resolveTemplateLanguage(
      options.configLang, // Command line option
      zcfConfig,
    )

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, zcfConfig)

    console.log(ansis.cyan(`\n${i18n.t('configuration:updatingPrompts')}\n`))

    // Execute prompt-only update with AI language
    await updatePromptOnly(aiOutputLang)

    // Select and install workflows
    await selectAndInstallWorkflows(configLang)

    // Check for Claude Code updates (update command always checks interactively)
    await checkClaudeCodeVersionAndPrompt(false)

    // Update zcf config with new version, template language, and AI language preference
    updateZcfConfig({
      version,
      templateLang: configLang, // 保存模板语言选择
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
