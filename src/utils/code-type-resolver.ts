import type { CodeToolType } from '../constants'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { readZcfConfigAsync } from './zcf-config'

/**
 * Code type abbreviation mapping
 */
const CODE_TYPE_ABBREVIATIONS: Record<string, CodeToolType> = {
  cc: 'claude-code',
  cx: 'codex',
} as const

/**
 * Resolve code type from parameter, abbreviation, or default config
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  // If parameter is provided, resolve it
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    // Check if it's an abbreviation
    if (normalizedParam in CODE_TYPE_ABBREVIATIONS) {
      return CODE_TYPE_ABBREVIATIONS[normalizedParam]
    }

    // Check if it's a valid full code type
    if (isValidCodeType(normalizedParam)) {
      return normalizedParam as CodeToolType
    }

    // Invalid code type
    throw new Error(`Invalid code type: "${codeTypeParam}". Valid types are: claude-code, codex, cc, cx`)
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
  return ['claude-code', 'codex'].includes(value)
}
