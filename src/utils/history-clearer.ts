/**
 * History Clearer Module
 *
 * Provides functionality to clear Claude's history data including:
 * - History files and directories
 * - Project history in ~/.claude.json
 *
 * Based on the backup and清理 strategy from aaa.py
 */

import type { ClearOptions, ClearResult, ClearStats } from '../types/clear'
import { exec } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import { join } from 'pathe'

export class HistoryClearer {
  private claudeDir: string
  private claudeJsonPath: string

  constructor() {
    this.claudeDir = join(homedir(), '.claude')
    this.claudeJsonPath = join(homedir(), '.claude.json')
  }

  getClaudeJsonPath(): string {
    return this.claudeJsonPath
  }

  /**
   * Scan for history files and directories
   */
  async scanHistoryFiles(): Promise<string[]> {
    try {
      const execAsync = promisify(exec)
      const { stdout } = await execAsync(`find "${this.claudeDir}" -name "*history*" -o -name "*History*" 2>/dev/null`)
      const files = stdout.trim().split('\n').filter(Boolean)
      return files
    }
    catch {
      // If find command fails, return empty array
      return []
    }
  }

  /**
   * Check if ~/.claude.json exists and get its size
   */
  async checkClaudeJson(): Promise<{ exists: boolean, size: number, projectCount: number }> {
    try {
      await access(this.claudeJsonPath)
      const content = await readFile(this.claudeJsonPath, 'utf-8')
      const data = JSON.parse(content)
      const projectCount = data.projects ? Object.keys(data.projects).length : 0
      const stats = await import('node:fs').then(fs => fs.statSync(this.claudeJsonPath))

      return {
        exists: true,
        size: stats.size,
        projectCount,
      }
    }
    catch {
      return {
        exists: false,
        size: 0,
        projectCount: 0,
      }
    }
  }

  /**
   * Create backup of ~/.claude.json (inspired by aaa.py)
   */
  async createClaudeJsonBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
    const backupPath = `${this.claudeJsonPath}.backup.${timestamp}`

    const content = await readFile(this.claudeJsonPath, 'utf-8')
    await writeFile(backupPath, content, 'utf-8')

    return backupPath
  }

  /**
   * Clear history files and directories
   */
  async clearHistoryFiles(filePaths: string[]): Promise<{ deleted: number, errors: string[] }> {
    let deleted = 0
    const errors: string[] = []

    const execAsync = promisify(exec)

    for (const filePath of filePaths) {
      try {
        await execAsync(`rm -rf "${filePath}"`)
        deleted++
      }
      catch (error) {
        errors.push(`Failed to delete ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { deleted, errors }
  }

  /**
   * Clear project history in ~/.claude.json (inspired by aaa.py)
   */
  async clearProjectHistory(): Promise<{ projectsCleared: number, historySizeCleared: number, historyItemsCleared: number }> {
    const content = await readFile(this.claudeJsonPath, 'utf-8')
    const data = JSON.parse(content)

    let projectsCleared = 0
    let historySizeCleared = 0
    let historyItemsCleared = 0

    if (data.projects && typeof data.projects === 'object') {
      for (const [, projectData] of Object.entries(data.projects)) {
        if (typeof projectData === 'object' && projectData !== null && 'history' in projectData) {
          const history = (projectData as any).history

          if (Array.isArray(history)) {
            // Calculate history size before clearing
            const historySize = JSON.stringify(history).length
            historySizeCleared += historySize
            historyItemsCleared += history.length

            // Clear history (set to empty array like aaa.py)
            ;(projectData as any).history = []
            projectsCleared++
          }
        }
      }
    }

    // Write cleaned data back
    await writeFile(this.claudeJsonPath, JSON.stringify(data, null, 2), 'utf-8')

    return {
      projectsCleared,
      historySizeCleared,
      historyItemsCleared,
    }
  }

  /**
   * Get preview of what will be cleared
   */
  async getClearPreview(): Promise<ClearStats> {
    const historyFiles = await this.scanHistoryFiles()
    const claudeJsonInfo = await this.checkClaudeJson()

    return {
      historyFileCount: historyFiles.length,
      historyFiles,
      projectCount: claudeJsonInfo.projectCount,
      claudeJsonExists: claudeJsonInfo.exists,
      claudeJsonSize: claudeJsonInfo.size,
    }
  }

  /**
   * Execute the clearing process
   */
  async executeClear(options: ClearOptions = {}): Promise<ClearResult> {
    const preview = await this.getClearPreview()
    const backupPath = preview.claudeJsonExists && options.backupJson !== false
      ? await this.createClaudeJsonBackup()
      : undefined

    const startTime = Date.now()

    // Clear history files
    const historyResult = preview.historyFileCount > 0
      ? await this.clearHistoryFiles(preview.historyFiles)
      : { deleted: 0, errors: [] }

    // Clear project history
    const projectResult = preview.claudeJsonExists && options.clearProjects !== false
      ? await this.clearProjectHistory()
      : { projectsCleared: 0, historySizeCleared: 0, historyItemsCleared: 0 }

    const endTime = Date.now()

    return {
      success: historyResult.errors.length === 0,
      backupPath,
      historyFilesDeleted: historyResult.deleted,
      projectsCleared: projectResult.projectsCleared,
      historyItemsCleared: projectResult.historyItemsCleared,
      bytesFreed: projectResult.historySizeCleared,
      duration: endTime - startTime,
      errors: historyResult.errors,
    }
  }

  /**
   * Get formatted file size
   */
  formatBytes(bytes: number): string {
    if (bytes === 0)
      return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
  }
}

export const historyClearer = new HistoryClearer()
