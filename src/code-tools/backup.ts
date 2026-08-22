import type { CodeToolConfigFile } from './types'
import dayjs from 'dayjs'
import { basename, join } from 'pathe'
import { copyFile, ensureDir, exists } from '../utils/fs-operations'

/**
 * Create a timestamped backup under the code tool's own backup directory.
 */
export function createTimestampedBackup(file: CodeToolConfigFile, homeDir: string): string | null {
  if (!exists(file.path))
    return null

  const backupDir = join(homeDir, 'backup')
  const backupPath = join(
    backupDir,
    `${basename(file.path) || 'config'}.backup_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`,
  )

  ensureDir(backupDir)
  copyFile(file.path, backupPath)
  return backupPath
}
