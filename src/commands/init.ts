import type { CodeToolInitOptions } from '../code-tools'
import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import { getCodeToolRegistry } from '../code-tools'
import {
  validateApiConfigs,
  validateSkipPromptOptions,
} from '../code-tools/claude-code/legacy-init'
import { getCodeToolBanner } from '../code-tools/presentation'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

export type { InitOptions } from '../code-tools/claude-code/legacy-init'
export { validateApiConfigs, validateSkipPromptOptions }
export { handleMultiConfigurations } from '../code-tools/multi-config'

export async function init(options: CodeToolInitOptions & { codeType?: CodeToolType | string } = {}): Promise<void> {
  // Match main: unknown -T prints and falls back to Claude instead of aborting.
  let codeToolType: CodeToolType
  try {
    codeToolType = await resolveCodeType(options.codeType)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${i18n.t('errors:generalError')} ${errorMessage}`))
    codeToolType = DEFAULT_CODE_TOOL_TYPE
  }
  const adapter = getCodeToolRegistry().get(codeToolType)
  await adapter.validateInitOptions(options)

  try {
    if (!options.skipBanner)
      displayBannerWithInfo(getCodeToolBanner(codeToolType))

    await adapter.init(
      { ...options, skipBanner: true },
      {
        lang: i18n.language as SupportedLang,
        force: options.force,
        skipPrompt: options.skipPrompt,
      },
    )
  }
  catch (error) {
    if (!handleExitPromptError(error))
      handleGeneralError(error)
  }
}
