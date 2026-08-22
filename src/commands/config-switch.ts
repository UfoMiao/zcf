import type { CodeToolType, SupportedLang } from '../constants'
import process from 'node:process'
import { getCodeToolRegistry } from '../code-tools'
import { DEFAULT_CODE_TOOL_TYPE, resolveCodeToolType } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { handleGeneralError } from '../utils/error-handler'
import { readZcfConfig } from '../utils/zcf-config'

interface ConfigSwitchOptions {
  codeType?: CodeToolType
  list?: boolean
  target?: string
}

export async function configSwitchCommand(options: ConfigSwitchOptions): Promise<void> {
  try {
    ensureI18nInitialized()
    const registry = getCodeToolRegistry()
    const savedCodeToolType = readZcfConfig()?.codeToolType
    const codeToolType = options.codeType !== undefined
      ? resolveCodeToolType(options.codeType)
      : savedCodeToolType && registry.has(savedCodeToolType)
        ? savedCodeToolType
        : DEFAULT_CODE_TOOL_TYPE
    const adapter = registry.get(codeToolType)
    const capability = adapter.configurations

    if (!capability) {
      throw new Error(i18n.t('errors:unsupportedCodeToolCapability', {
        tool: i18n.t(adapter.definition.displayNameKey),
        capability: 'configurations',
      }))
    }

    const ctx = { lang: i18n.language as SupportedLang }
    if (options.list) {
      if (capability.displayList)
        await capability.displayList(ctx)
      else
        await capability.list(ctx)
      return
    }

    if (options.target) {
      await capability.switch(options.target, ctx)
      return
    }

    if (capability.interactiveSwitch) {
      await capability.interactiveSwitch(ctx)
      return
    }

    await capability.list(ctx)
  }
  catch (error) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST)
      throw error
    handleGeneralError(error)
  }
}
