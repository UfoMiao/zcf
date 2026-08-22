import type { CodeToolType, SupportedLang } from '../constants'
import type { UninstallItem } from '../utils/uninstaller'
import ansis from 'ansis'
import { getCodeToolRegistry } from '../code-tools'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { readZcfConfig } from '../utils/zcf-config'

export interface UninstallOptions {
  lang?: SupportedLang
  codeType?: CodeToolType | string
  mode?: 'complete' | 'custom' | 'interactive'
  items?: UninstallItem[] | string
}

export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  try {
    let codeToolType: CodeToolType
    try {
      codeToolType = await resolveCodeType(options.codeType)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(ansis.red(`${i18n.t('errors:generalError')} ${errorMessage}`))
      const savedCodeToolType = readZcfConfig()?.codeToolType
      codeToolType = savedCodeToolType && getCodeToolRegistry().has(savedCodeToolType)
        ? savedCodeToolType
        : DEFAULT_CODE_TOOL_TYPE
    }

    const adapter = getCodeToolRegistry().get(codeToolType)
    await adapter.uninstall(options, {
      lang: options.lang || (i18n.language as SupportedLang) || 'en',
    })
  }
  catch (error) {
    if (!handleExitPromptError(error))
      handleGeneralError(error)
  }
}
