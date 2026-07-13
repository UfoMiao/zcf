import type { CodeToolType } from '../constants'
import { CODE_TOOL_ALIASES, CODE_TOOL_TYPES, DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync } from './zcf-config'

/**
 * Resolve code type from parameter, abbreviation, or default config
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    if (normalizedParam in CODE_TOOL_ALIASES)
      return CODE_TOOL_ALIASES[normalizedParam]

    if (isValidCodeType(normalizedParam))
      return normalizedParam as CodeToolType

    const validAbbreviations = Object.keys(CODE_TOOL_ALIASES)
    const validFullTypes = Object.values(CODE_TOOL_ALIASES)
    const validOptions = [...validAbbreviations, ...validFullTypes].join(', ')

    let defaultValue = DEFAULT_CODE_TOOL_TYPE
    try {
      const config = await readZcfConfigAsync()
      if (config?.codeToolType && isValidCodeType(config.codeToolType))
        defaultValue = config.codeToolType
    }
    catch {
      // If config reading fails, use DEFAULT_CODE_TOOL_TYPE
    }

    throw new Error(
      i18n.t('errors:invalidCodeType', { value: codeTypeParam, validOptions, defaultValue }),
    )
  }

  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType && isValidCodeType(config.codeToolType))
      return config.codeToolType
  }
  catch {
    // If config reading fails, continue to fallback
  }

  return DEFAULT_CODE_TOOL_TYPE
}

function isValidCodeType(value: string): value is CodeToolType {
  return (CODE_TOOL_TYPES as readonly string[]).includes(value)
}
