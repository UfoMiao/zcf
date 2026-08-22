import type { CodeToolType, SupportedLang } from '../constants'
import type { CodeToolInitOptions } from './types'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { readProviderDefinitions, validateProviderDefinitions } from './provider-profiles'
import { getCodeToolRegistry } from './register-builtins'

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
    await validateProviderDefinitions(definitions)
    await adapter.providers.importDefinitions(definitions, {
      lang: i18n.language as SupportedLang,
      skipPrompt: options.skipPrompt,
    })
    console.log(ansis.green(`✔ ${i18n.t('multi-config:configsAddedSuccessfully')}`))
  }
  catch (error) {
    console.error(ansis.red(`${i18n.t('multi-config:configsFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}
