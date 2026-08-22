import type { CodeToolType, SupportedLang } from '../constants'
import process from 'node:process'
import { getCodeToolRegistry } from '../code-tools'
import { ensureI18nInitialized, i18n } from '../i18n'
import { resolveCodeType } from '../utils/code-type-resolver'
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
    const savedCodeToolType = readZcfConfig()?.codeToolType
    const registry = getCodeToolRegistry()
    const savedType = savedCodeToolType && registry.has(savedCodeToolType)
      ? savedCodeToolType
      : undefined
    const codeToolType = await resolveCodeType(options.codeType ?? savedType)
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
