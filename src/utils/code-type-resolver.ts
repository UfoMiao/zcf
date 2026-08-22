import type { CodeToolType } from '../constants'
import { getCodeToolRegistry } from '../code-tools'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync } from './zcf-config'

/**
 * Resolve code type from parameter, abbreviation, or default config
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  // If parameter is provided, resolve it
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    const registry = getCodeToolRegistry()
    const adapter = registry.resolve(normalizedParam)
    if (adapter)
      return adapter.definition.id

    // Prepare valid options for error message
    const validOptions = registry.list()
      .flatMap(item => [item.definition.id, ...item.definition.aliases])
      .join(', ')

    // Get the actual default value that will be used
    let defaultValue = DEFAULT_CODE_TOOL_TYPE
    try {
      const config = await readZcfConfigAsync()
      if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
        defaultValue = config.codeToolType
      }
    }
    catch {
      // If config reading fails, use DEFAULT_CODE_TOOL_TYPE
    }

    // Use i18n for error message
    throw new Error(
      i18n.t('errors:invalidCodeType', { value: codeTypeParam, validOptions, defaultValue }),
    )
  }

  // No parameter provided, use config default
  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
      return config.codeToolType
    }
  }
  catch {
    // If config reading fails, continue to fallback
  }

  // Fallback to default
  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Check if a value is a valid code tool type
 * @param value - Value to check
 * @returns True if valid code tool type
 */
function isValidCodeType(value: string): value is CodeToolType {
  return getCodeToolRegistry().has(value)
}
