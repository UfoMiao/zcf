import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import { getCodeTool, registerBuiltinCodeTools } from '../code-tools'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType as resolveCodeToolTypeAlias } from '../constants'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { readZcfConfig } from '../utils/zcf-config'

export interface UpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType
}

function resolveCodeToolType(optionValue: unknown, savedValue?: CodeToolType | null): CodeToolType {
  if (optionValue !== undefined) {
    const resolved = resolveCodeToolTypeAlias(optionValue)
    if (resolved !== DEFAULT_CODE_TOOL_TYPE || optionValue === DEFAULT_CODE_TOOL_TYPE)
      return resolved
  }

  if (savedValue && isCodeToolType(savedValue))
    return savedValue

  return DEFAULT_CODE_TOOL_TYPE
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  try {
    if (!options.skipBanner)
      displayBanner(i18n.t('cli:banner.updateSubtitle'))

    const zcfConfig = readZcfConfig()
    const codeToolType = resolveCodeToolType(options.codeType, zcfConfig?.codeToolType)
    options.codeType = codeToolType

    registerBuiltinCodeTools()
    const adapter = getCodeTool(codeToolType)
    const ctx = { lang: (options.configLang || zcfConfig?.preferredLang || 'en') as SupportedLang, skipPrompt: options.skipPrompt }
    await adapter.update(options, ctx)
  }
  catch (error) {
    if (!handleExitPromptError(error))
      handleGeneralError(error)
  }
}
