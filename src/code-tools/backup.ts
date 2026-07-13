import type { CodeToolConfigFile } from './types'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { copyFile, ensureDir, exists } from '../utils/fs-operations'

/**
 * Create a timestamped backup of a configuration file under `<homeDir>/backup/`.
 */
export function createTimestampedBackup(file: CodeToolConfigFile, homeDir: string): string | null {
  const targetPath = file.path
  if (!exists(targetPath))
    return null

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const fileName = targetPath.split('/').pop() || 'config'
  const backupDir = join(homeDir, 'backup')
  const backupPath = join(backupDir, `${fileName}.backup_${timestamp}`)

  ensureDir(backupDir)
  copyFile(targetPath, backupPath)
  return backupPath
}
