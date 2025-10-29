/**
 * Types for history clearing functionality
 */

export interface ClearStats {
  historyFileCount: number
  historyFiles: string[]
  projectCount: number
  claudeJsonExists: boolean
  claudeJsonSize: number
}

export interface ClearOptions {
  backupJson?: boolean
  clearProjects?: boolean
}

export interface ClearResult {
  success: boolean
  backupPath?: string
  historyFilesDeleted: number
  projectsCleared: number
  historyItemsCleared: number
  bytesFreed: number
  duration: number
  errors: string[]
}
