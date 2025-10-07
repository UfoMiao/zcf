import type { CodeToolType } from '../constants'
import { ensureI18nInitialized } from '../i18n'
import { checkAndUpdateTools } from './auto-updater'
import { runCodexUpdate } from './code-tools/codex'

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

    switch (codeType) {
      case 'claude-code':
        await this.updateClaudeCodeTools(skipPrompt)
        break
      case 'codex':
        await this.updateCodexTools(skipPrompt)
        break
      default:
        throw new Error(`Unsupported code type: ${codeType}`)
    }
  }

  /**
   * Update Claude Code related tools
   * @param skipPrompt - Whether to skip interactive prompts
   */
  private async updateClaudeCodeTools(skipPrompt: boolean): Promise<void> {
    await checkAndUpdateTools(skipPrompt)
  }

  /**
   * Update Codex tools
   * @param skipPrompt - Whether to skip interactive prompts
   */
  private async updateCodexTools(skipPrompt: boolean): Promise<void> {
    const success = await runCodexUpdate(false, skipPrompt)
    // runCodexUpdate returns boolean, but we don't need to handle the result
    // The function itself handles logging and error reporting
    if (!success) {
      // Don't throw error for unsuccessful updates, as runCodexUpdate handles error reporting
      // This maintains consistency with checkAndUpdateTools behavior
    }
  }
}
