import type { CodeToolInitOptions } from '../code-tools'
import type { CodeToolType, SupportedLang } from '../constants'
import { getCodeToolRegistry } from '../code-tools'
import {
  validateApiConfigs,
  validateSkipPromptOptions,
} from '../code-tools/claude-code/legacy-init'
import { getCodeToolBanner } from '../code-tools/presentation'
import { readProviderDefinitions } from '../code-tools/provider-profiles'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

export type { InitOptions } from '../code-tools/claude-code/legacy-init'
export { validateApiConfigs, validateSkipPromptOptions }

export async function handleMultiConfigurations(
  options: CodeToolInitOptions,
  codeToolType: CodeToolType,
): Promise<void> {
  try {
    const adapter = getCodeToolRegistry().get(codeToolType)
    if (!adapter.providers) {
      throw new Error(i18n.t('errors:unsupportedCodeToolCapability', {
        tool: i18n.t(adapter.definition.displayNameKey),
        capability: 'providers',
      }))
    }

    const definitions = readProviderDefinitions(options)
    await validateApiConfigs(definitions)
    await adapter.providers.importDefinitions(definitions, {
      lang: i18n.language as SupportedLang,
      skipPrompt: options.skipPrompt,
    })
  }
  catch (error) {
    console.error(i18n.t('multi-config:configsFailed', {
      error: error instanceof Error ? error.message : String(error),
    }))
    throw error
  }
}

export async function init(options: CodeToolInitOptions & { codeType?: CodeToolType | string } = {}): Promise<void> {
  // Validate before banner, install prompts, or any other side effect — both
  // interactive and skip-prompt entry points share this adapter contract.
  const codeToolType = await resolveCodeType(options.codeType)
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
