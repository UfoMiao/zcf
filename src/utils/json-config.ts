import dayjs from 'dayjs'
import { join } from 'pathe'
// JSON utilities use English messages
import { copyFile, ensureDir, exists, readFile, writeFile } from './fs-operations'

export interface JsonConfigOptions<T> {
  defaultValue?: T
  pretty?: boolean
  backup?: boolean
  backupDir?: string
  validate?: (data: any) => data is T
  sanitize?: (data: any) => T
}

/**
 * Read JSON configuration file with type safety
 */
export function readJsonConfig<T>(path: string, options: JsonConfigOptions<T> = {}): T | null {
  const { defaultValue = null, validate, sanitize } = options

  if (!exists(path)) {
    return defaultValue
  }

  try {
    const content = readFile(path)
    const data = JSON.parse(content)

    // Validate if validator provided
    if (validate && !validate(data)) {
      console.log(`Invalid configuration: ${path}`)
      return defaultValue
    }

    // Sanitize if sanitizer provided
    if (sanitize) {
      return sanitize(data)
    }

    return data as T
  }
  catch (error) {
    console.error(`Failed to parse JSON: ${path}`, error)
    return defaultValue
  }
}

/**
 * Write JSON configuration file
 */
export function writeJsonConfig<T>(path: string, data: T, options: JsonConfigOptions<T> = {}): void {
  const { pretty = true, backup = false, backupDir } = options

  // Backup existing file if requested
  if (backup && exists(path)) {
    backupJsonConfig(path, backupDir)
  }

  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  writeFile(path, content)
}

/**
 * Update JSON configuration file by merging with existing data
 */
export function updateJsonConfig<T>(
  path: string,
  updates: Partial<T>,
  options: JsonConfigOptions<T> = {},
): T {
  const existing = readJsonConfig<T>(path, options)
  const merged = { ...(existing || {}), ...updates } as T
  writeJsonConfig(path, merged, options)
  return merged
}

/**
 * Backup JSON configuration file
 */
export function backupJsonConfig(path: string, backupDir?: string): string | null {
  if (!exists(path)) {
    return null
  }

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const fileName = path.split('/').pop() || 'config.json'
  const baseDir = backupDir || join(path, '..', 'backup')
  const backupPath = join(baseDir, `${fileName}.backup_${timestamp}`)

  try {
    ensureDir(baseDir)
    copyFile(path, backupPath)
    return backupPath
  }
  catch (error) {
    console.error('Failed to backup config', error)
    return null
  }
}

/**
 * Check if JSON file is valid
 */
export function isValidJsonFile(path: string): boolean {
  if (!exists(path)) {
    return false
  }

  try {
    const content = readFile(path)
    JSON.parse(content)
    return true
  }
  catch {
    return false
  }
}

/**
 * Merge multiple JSON configuration files
 */
export function mergeJsonConfigs<T>(paths: string[], options: JsonConfigOptions<T> = {}): T | null {
  const configs = paths
    .map(path => readJsonConfig<T>(path, options))
    .filter(config => config !== null)

  if (configs.length === 0) {
    return options.defaultValue || null
  }

  // Simple merge - later configs override earlier ones
  return Object.assign({}, ...configs) as T
}
