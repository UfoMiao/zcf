import type { CodeToolType, SupportedLang } from '../constants'
import { getCodeToolRegistry } from '../code-tools'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Tool update scheduler that manages updates for different code tools
 */
export class ToolUpdateScheduler {
  /**
   * Update tools based on code type
   * @param codeType - The code tool type to update
   * @param skipPrompt - Whether to skip interactive prompts
   */
  async updateByCodeType(codeType: CodeToolType, skipPrompt: boolean = false): Promise<void> {
    // Ensure i18n is initialized before any operations
    await ensureI18nInitialized()

    const adapter = getCodeToolRegistry().get(codeType)
    if (!adapter.updateTools) {
      throw new Error(i18n.t('errors:unsupportedCodeToolCapability', {
        tool: i18n.t(adapter.definition.displayNameKey),
        capability: 'tool-update',
      }))
    }
    await adapter.updateTools(skipPrompt, {
      lang: i18n.language as SupportedLang,
      skipPrompt,
    })
  }
}
