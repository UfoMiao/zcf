import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import { getCodeToolRegistry } from '../code-tools'
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
  // First try to use the option value (supports short aliases)
  if (optionValue !== undefined) {
    const resolved = resolveCodeToolTypeAlias(optionValue)
    if (resolved !== DEFAULT_CODE_TOOL_TYPE || optionValue === DEFAULT_CODE_TOOL_TYPE) {
      return resolved
    }
  }

  // Fall back to saved value
  if (savedValue && isCodeToolType(savedValue)) {
    return savedValue
  }

  return DEFAULT_CODE_TOOL_TYPE
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  try {
    const zcfConfig = readZcfConfig()
    const codeToolType = resolveCodeToolType(options.codeType, zcfConfig?.codeToolType)
    options.codeType = codeToolType

    if (!options.skipBanner) {
      displayBanner(i18n.t('cli:banner.updateSubtitle'))
    }

    const adapter = getCodeToolRegistry().get(codeToolType)
    await adapter.update(options, {
      lang: i18n.language as SupportedLang,
      skipPrompt: options.skipPrompt,
    })
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
