import type { SupportedLang } from '../../constants'
import { pathExists } from 'fs-extra'
import { join } from 'pathe'
import { CODEX_AGENTS_FILE, CODEX_AUTH_FILE, CODEX_CONFIG_FILE, CODEX_DIR, CODEX_PROMPTS_DIR } from '../../constants'
import { i18n } from '../../i18n'
import { moveToTrash } from '../trash'

export type CodexUninstallItem
  = 'config'
    | 'auth'
    | 'system-prompt'
    | 'workflow'
    | 'cli-package'
    | 'api-config'
    | 'mcp-config'
    | 'backups'

export interface CodexUninstallResult {
  success: boolean
  removed: string[] // Files/directories moved to trash
  removedConfigs: string[] // Configuration items deleted from config files
  errors: string[] // Error messages
  warnings: string[] // Warning messages
}

/**
 * Codex Uninstaller - Handles removal of Codex configurations and tools
 */
export class CodexUninstaller {
  private _lang: SupportedLang
  private conflictResolution = new Map<CodexUninstallItem, CodexUninstallItem[]>()

  private readonly CODEX_BACKUP_DIR = join(CODEX_DIR, 'backup')

  constructor(lang: SupportedLang = 'en') {
    this._lang = lang
    this.conflictResolution.set('cli-package', ['config', 'auth'])
    this.conflictResolution.set('config', ['api-config', 'mcp-config'])
    void this._lang
  }

  /**
   * Remove config file (config.toml)
   */
  async removeConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        const trashResult = await moveToTrash(CODEX_CONFIG_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('config.toml')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove config: ${error.message}`)
    }

    return result
  }

  /**
   * Remove auth file (auth.json)
   */
  async removeAuth(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_AUTH_FILE)) {
        const trashResult = await moveToTrash(CODEX_AUTH_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('auth.json')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:authNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove auth: ${error.message}`)
    }

    return result
  }

  /**
   * Remove system prompt file (AGENTS.md)
   */
  async removeSystemPrompt(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_AGENTS_FILE)) {
        const trashResult = await moveToTrash(CODEX_AGENTS_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('AGENTS.md')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:systemPromptNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove system prompt: ${error.message}`)
    }

    return result
  }

  /**
   * Remove workflow directory (prompts/)
   */
  async removeWorkflow(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_PROMPTS_DIR)) {
        const trashResult = await moveToTrash(CODEX_PROMPTS_DIR)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('prompts/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:workflowNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove workflow: ${error.message}`)
    }

    return result
  }

  /**
   * Uninstall Codex CLI package
   */
  async uninstallCliPackage(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Use the unified uninstallCodeTool function which handles different install methods
      const { uninstallCodeTool } = await import('../installer')
      const success = await uninstallCodeTool('codex')

      if (success) {
        result.removed.push('@openai/codex')
        result.success = true
      }
      else {
        result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:codex'), message: '' }))
      }
    }
    catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('not installed')) {
        result.warnings.push(i18n.t('codex:packageNotFound'))
        result.success = true
      }
      else {
        result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:codex'), message: `: ${error.message}` }))
      }
    }

    return result
  }

  /**
   * Remove API configuration from config.toml
   */
  async removeApiConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        // Read current config content
        const { readFileSync, writeFileSync } = await import('node:fs')
        const content = readFileSync(CODEX_CONFIG_FILE, 'utf-8')

        // Remove model_provider setting and all [model_providers.xxx] sections
        const lines = content.split('\n')
        const newLines: string[] = []
        let inProviderSection = false
        let configModified = false

        for (const line of lines) {
          // Check if entering a [model_providers.xxx] section
          if (line.trim().match(/^\[model_providers\./)) {
            inProviderSection = true
            configModified = true
            continue
          }

          // Check if leaving the provider section (next section starts)
          if (inProviderSection && line.trim().startsWith('[') && !line.trim().match(/^\[model_providers\./)) {
            inProviderSection = false
          }

          // Skip lines inside provider sections
          if (inProviderSection) {
            continue
          }

          // Skip model_provider line
          if (line.trim().startsWith('model_provider')) {
            configModified = true
            continue
          }

          newLines.push(line)
        }

        if (configModified) {
          writeFileSync(CODEX_CONFIG_FILE, newLines.join('\n'))
          result.removedConfigs.push(i18n.t('codex:apiConfigRemoved'))
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove API config: ${error.message}`)
    }

    return result
  }

  /**
   * Remove backup directory (~/.codex/backup/)
   */
  async removeBackups(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(this.CODEX_BACKUP_DIR)) {
        const trashResult = await moveToTrash(this.CODEX_BACKUP_DIR)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move backup directory to trash')
        }
        result.removed.push('backup/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:backupNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove backups: ${error.message}`)
    }

    return result
  }

  /**
   * Remove MCP configuration from config.toml
   */
  async removeMcpConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        // Read current config content
        const { readFileSync, writeFileSync } = await import('node:fs')
        const content = readFileSync(CODEX_CONFIG_FILE, 'utf-8')

        // Remove MCP service sections: [mcp_servers.xxx] (env is inline now)
        const lines = content.split('\n')
        const newLines: string[] = []
        let inMcpSection = false
        let configModified = false

        for (const line of lines) {
          // Check if entering a MCP section
          if (line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = true
            configModified = true
            continue
          }

          // Check if leaving the MCP section (next section starts)
          if (inMcpSection && line.trim().startsWith('[') && !line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = false
          }

          // Skip lines inside MCP sections
          if (inMcpSection) {
            continue
          }

          newLines.push(line)
        }

        if (configModified) {
          writeFileSync(CODEX_CONFIG_FILE, newLines.join('\n'))
          result.removedConfigs.push(i18n.t('codex:mcpConfigRemoved'))
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove MCP config: ${error.message}`)
    }

    return result
  }

  /**
   * Complete uninstall - remove all directories and packages
   */
  async completeUninstall(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: true,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove entire .codex directory
      if (await pathExists(CODEX_DIR)) {
        const trashResult = await moveToTrash(CODEX_DIR)
        if (!trashResult[0]?.success) {
          result.warnings.push(`Failed to move ~/.codex/ to trash: ${trashResult[0]?.error || 'Unknown error'}`)
        }
        result.removed.push('~/.codex/')
      }

      // Use existing uninstallCliPackage method to avoid code duplication
      const cliUninstallResult = await this.uninstallCliPackage()

      // Merge results from CLI package uninstall
      result.removed.push(...cliUninstallResult.removed)
      result.removedConfigs.push(...cliUninstallResult.removedConfigs)
      result.errors.push(...cliUninstallResult.errors)
      result.warnings.push(...cliUninstallResult.warnings)

      // Overall success is true only if both operations succeeded
      result.success = result.success && cliUninstallResult.success
    }
    catch (error: any) {
      result.errors.push(`Complete uninstall failed: ${error.message}`)
      result.success = false
    }

    return result
  }

  /**
   * Custom uninstall with conflict resolution
   */
  async customUninstall(selectedItems: CodexUninstallItem[]): Promise<CodexUninstallResult[]> {
    // Resolve conflicts
    const resolvedItems = this.resolveConflicts(selectedItems)

    const results: CodexUninstallResult[] = []

    for (const item of resolvedItems) {
      try {
        const result = await this.executeUninstallItem(item)
        results.push(result)
      }
      catch (error: any) {
        results.push({
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [`Failed to execute ${item}: ${error.message}`],
          warnings: [],
        })
      }
    }

    return results
  }

  /**
   * Resolve conflicts between uninstall items
   */
  private resolveConflicts(items: CodexUninstallItem[]): CodexUninstallItem[] {
    const resolved = [...items]

    for (const [primary, conflicts] of this.conflictResolution) {
      if (resolved.includes(primary)) {
        // Remove conflicting items
        conflicts.forEach((conflict) => {
          const index = resolved.indexOf(conflict)
          if (index > -1) {
            resolved.splice(index, 1)
          }
        })
      }
    }

    return resolved
  }

  /**
   * Execute uninstall for a specific item
   */
  private async executeUninstallItem(item: CodexUninstallItem): Promise<CodexUninstallResult> {
    switch (item) {
      case 'config':
        return await this.removeConfig()
      case 'auth':
        return await this.removeAuth()
      case 'system-prompt':
        return await this.removeSystemPrompt()
      case 'workflow':
        return await this.removeWorkflow()
      case 'cli-package':
        return await this.uninstallCliPackage()
      case 'api-config':
        return await this.removeApiConfig()
      case 'mcp-config':
        return await this.removeMcpConfig()
      case 'backups':
        return await this.removeBackups()
      default:
        return {
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [`Unknown uninstall item: ${item}`],
          warnings: [],
        }
    }
  }
}
