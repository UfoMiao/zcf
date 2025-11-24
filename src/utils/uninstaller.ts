import type { SupportedLang } from '../constants'
import { homedir } from 'node:os'
import { pathExists } from 'fs-extra'
import { join } from 'pathe'
import { exec } from 'tinyexec'
import { ZCF_CONFIG_FILE } from '../constants'
import { i18n } from '../i18n'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { moveToTrash } from './trash'

export type UninstallItem
  = | 'output-styles'
    | 'commands'
    | 'agents'
    | 'claude-md'
    | 'permissions-envs'
    | 'mcps'
    | 'ccr'
    | 'ccline'
    | 'claude-code'
    | 'backups'
    | 'zcf-config'

export interface UninstallResult {
  success: boolean
  removed: string[] // Files/directories moved to trash
  removedConfigs: string[] // Configuration items deleted from config files
  errors: string[] // Error messages
  warnings: string[] // Warning messages
}

/**
 * ZCF Uninstaller - Handles removal of ZCF configurations and tools
 */
export class ZcfUninstaller {
  private _lang: SupportedLang // Reserved for future i18n support
  private conflictResolution = new Map<UninstallItem, UninstallItem[]>()

  constructor(lang: SupportedLang = 'en') {
    this._lang = lang

    // Set up conflict resolution rules
    this.conflictResolution.set('claude-code', ['mcps']) // Claude Code uninstall includes MCP removal

    // Ensure lang parameter is used (future i18n support)
    void this._lang
  }

  /**
   * 1. Remove outputStyle field from settings.json and output-styles directory
   */
  async removeOutputStyles(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const settingsPath = join(homedir(), '.claude', 'settings.json')
      const outputStylesPath = join(homedir(), '.claude', 'output-styles')

      // Remove outputStyle field from settings.json
      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig<any>(settingsPath) || {}

        if (settings.outputStyle) {
          delete settings.outputStyle
          writeJsonConfig(settingsPath, settings)
          result.removedConfigs.push('outputStyle field from settings.json')
        }
      }
      else {
        result.warnings.push(i18n.t('uninstall:settingsJsonNotFound'))
      }

      // Remove output-styles directory
      if (await pathExists(outputStylesPath)) {
        const trashResult = await moveToTrash(outputStylesPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('~/.claude/output-styles/')
      }
      else {
        result.warnings.push(i18n.t('uninstall:outputStylesDirectoryNotFound'))
      }

      result.success = true
    }
    catch (error: any) {
      result.errors.push(`Failed to remove output styles: ${error.message}`)
    }

    return result
  }

  /**
   * 2. Remove custom commands directory (commands/zcf/)
   */
  async removeCustomCommands(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const commandsPath = join(homedir(), '.claude', 'commands', 'zcf')

      if (await pathExists(commandsPath)) {
        const trashResult = await moveToTrash(commandsPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('commands/zcf/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:commandsNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove custom commands: ${error.message}`)
    }

    return result
  }

  /**
   * 3. Remove custom agents directory (agents/zcf/)
   */
  async removeCustomAgents(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const agentsPath = join(homedir(), '.claude', 'agents', 'zcf')

      if (await pathExists(agentsPath)) {
        const trashResult = await moveToTrash(agentsPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('agents/zcf/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:agentsNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove custom agents: ${error.message}`)
    }

    return result
  }

  /**
   * 4. Remove global memory file (CLAUDE.md)
   */
  async removeClaudeMd(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const claudeMdPath = join(homedir(), '.claude', 'CLAUDE.md')

      if (await pathExists(claudeMdPath)) {
        const trashResult = await moveToTrash(claudeMdPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('CLAUDE.md')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:claudeMdNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove CLAUDE.md: ${error.message}`)
    }

    return result
  }

  /**
   * 5. Remove permissions and environment variables
   */
  async removePermissionsAndEnvs(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const settingsPath = join(homedir(), '.claude', 'settings.json')

      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig<any>(settingsPath) || {}
        let modified = false

        // Remove permissions
        if (settings.permissions) {
          delete settings.permissions
          result.removedConfigs.push('permissions configuration')
          modified = true
        }

        // Remove environment variables
        if (settings.env) {
          delete settings.env
          result.removedConfigs.push('environment variables')
          modified = true
        }

        if (modified) {
          writeJsonConfig(settingsPath, settings)
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:settingsJsonNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove permissions and envs: ${error.message}`)
    }

    return result
  }

  /**
   * 6. Remove MCP servers from .claude.json (mcpServers field only)
   */
  async removeMcps(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const claudeJsonPath = join(homedir(), '.claude.json')

      if (await pathExists(claudeJsonPath)) {
        const config = readJsonConfig<any>(claudeJsonPath) || {}

        if (config.mcpServers) {
          delete config.mcpServers
          writeJsonConfig(claudeJsonPath, config)
          result.removedConfigs.push('mcpServers from .claude.json')
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:claudeJsonNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove MCP servers: ${error.message}`)
    }

    return result
  }

  /**
   * 7. Uninstall Claude Code Router and remove configuration
   */
  async uninstallCcr(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove CCR directory
      const ccrPath = join(homedir(), '.claude-code-router')

      if (await pathExists(ccrPath)) {
        const trashResult = await moveToTrash(ccrPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('.claude-code-router/')
      }

      // Uninstall npm package
      try {
        await exec('npm', ['uninstall', '-g', '@musistudio/claude-code-router'])
        result.removed.push('@musistudio/claude-code-router package')
        result.success = true
      }
      catch (npmError: any) {
        if (npmError.message.includes('not found') || npmError.message.includes('not installed')) {
          result.warnings.push(i18n.t('uninstall:ccrPackageNotFound'))
          result.success = true
        }
        else {
          result.errors.push(`Failed to uninstall CCR package: ${npmError.message}`)
        }
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to uninstall CCR: ${error.message}`)
    }

    return result
  }

  /**
   * 8. Uninstall CCometixLine
   */
  async uninstallCcline(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      await exec('npm', ['uninstall', '-g', '@cometix/ccline'])
      result.removed.push('@cometix/ccline package')
      result.success = true
    }
    catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('not installed')) {
        result.warnings.push(i18n.t('uninstall:cclinePackageNotFound'))
        result.success = true
      }
      else {
        result.errors.push(`Failed to uninstall CCometixLine: ${error.message}`)
      }
    }

    return result
  }

  /**
   * 9. Uninstall Claude Code and remove entire .claude.json
   */
  async uninstallClaudeCode(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove entire .claude.json file (includes MCP removal)
      const claudeJsonPath = join(homedir(), '.claude.json')

      if (await pathExists(claudeJsonPath)) {
        const trashResult = await moveToTrash(claudeJsonPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('.claude.json (includes MCP configuration)')
      }

      // Use the unified uninstallCodeTool function which handles different install methods
      try {
        const { uninstallCodeTool } = await import('./installer')
        const success = await uninstallCodeTool('claude-code')

        if (success) {
          result.removed.push('@anthropic-ai/claude-code')
          result.success = true
        }
        else {
          result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:claudeCode'), message: '' }))
        }
      }
      catch (npmError: any) {
        if (npmError.message.includes('not found') || npmError.message.includes('not installed')) {
          result.warnings.push(i18n.t('uninstall:claudeCodePackageNotFound'))
          result.success = true
        }
        else {
          result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:claudeCode'), message: `: ${npmError.message}` }))
        }
      }
    }
    catch (error: any) {
      result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:claudeCode'), message: `: ${error.message}` }))
    }

    return result
  }

  /**
   * 10. Remove backup files
   */
  async removeBackups(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const backupPath = join(homedir(), '.claude', 'backup')

      if (await pathExists(backupPath)) {
        const trashResult = await moveToTrash(backupPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push('backup/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:backupsNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove backups: ${error.message}`)
    }

    return result
  }

  /**
   * 11. Remove ZCF preference configuration
   */
  async removeZcfConfig(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const zcfConfigPath = ZCF_CONFIG_FILE
      const relativeName = zcfConfigPath.replace(homedir(), '~')

      if (await pathExists(zcfConfigPath)) {
        const trashResult = await moveToTrash(zcfConfigPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || 'Failed to move to trash')
        }
        result.removed.push(relativeName)
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:zcfConfigNotFound'))
        result.success = true
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to remove ZCF config: ${error.message}`)
    }

    return result
  }

  /**
   * Complete uninstall - remove all directories and packages
   */
  async completeUninstall(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: true,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove all directories
      const directoriesToRemove = [
        { path: join(homedir(), '.claude'), name: '~/.claude/' },
        { path: join(homedir(), '.claude.json'), name: '~/.claude.json' },
        { path: join(homedir(), '.claude-code-router'), name: '~/.claude-code-router/' },
      ]

      for (const dir of directoriesToRemove) {
        try {
          if (await pathExists(dir.path)) {
            const trashResult = await moveToTrash(dir.path)
            if (!trashResult[0]?.success) {
              result.warnings.push(`Failed to move ${dir.name} to trash: ${trashResult[0]?.error || 'Unknown error'}`)
            }
            result.removed.push(dir.name)
          }
        }
        catch (error: any) {
          result.warnings.push(`Failed to remove ${dir.name}: ${error.message}`)
        }
      }

      // Uninstall npm packages
      const packagesToUninstall = [
        '@musistudio/claude-code-router',
        '@cometix/ccline',
        '@anthropic-ai/claude-code',
      ]

      for (const pkg of packagesToUninstall) {
        try {
          await exec('npm', ['uninstall', '-g', pkg])
          result.removed.push(`${pkg} package`)
        }
        catch (error: any) {
          if (error.message.includes('not found') || error.message.includes('not installed')) {
            if (pkg.includes('claude-code-router')) {
              result.warnings.push(i18n.t('uninstall:ccrPackageNotFound'))
            }
            else if (pkg.includes('ccline')) {
              result.warnings.push(i18n.t('uninstall:cclinePackageNotFound'))
            }
            else {
              result.warnings.push(i18n.t('uninstall:claudeCodePackageNotFound'))
            }
          }
          else {
            result.warnings.push(`Failed to uninstall ${pkg}: ${error.message}`)
          }
        }
      }
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
  async customUninstall(selectedItems: UninstallItem[]): Promise<UninstallResult[]> {
    // Resolve conflicts
    const resolvedItems = this.resolveConflicts(selectedItems)

    const results: UninstallResult[] = []

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
  private resolveConflicts(items: UninstallItem[]): UninstallItem[] {
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
  private async executeUninstallItem(item: UninstallItem): Promise<UninstallResult> {
    switch (item) {
      case 'output-styles':
        return await this.removeOutputStyles()
      case 'commands':
        return await this.removeCustomCommands()
      case 'agents':
        return await this.removeCustomAgents()
      case 'claude-md':
        return await this.removeClaudeMd()
      case 'permissions-envs':
        return await this.removePermissionsAndEnvs()
      case 'mcps':
        return await this.removeMcps()
      case 'ccr':
        return await this.uninstallCcr()
      case 'ccline':
        return await this.uninstallCcline()
      case 'claude-code':
        return await this.uninstallClaudeCode()
      case 'backups':
        return await this.removeBackups()
      case 'zcf-config':
        return await this.removeZcfConfig()
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
