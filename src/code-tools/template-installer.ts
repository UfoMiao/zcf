import type { CodeToolDefinition } from './types'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join } from 'pathe'
import { copyFile } from '../utils/fs-operations'

function getPackageRoot(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  return dirname(distDir)
}

/**
 * Install only missing common templates, preserving all existing user files.
 */
export function installMissingCommonTemplates(definition: CodeToolDefinition): string[] {
  if (!definition.paths.templateDir)
    return []

  const installed: string[] = []
  const commonTemplateDir = join(getPackageRoot(), definition.paths.templateDir, 'common')

  for (const configFile of definition.paths.configFiles) {
    const sourcePath = join(commonTemplateDir, basename(configFile.path))
    if (!existsSync(sourcePath) || existsSync(configFile.path))
      continue

    copyFile(sourcePath, configFile.path)
    installed.push(configFile.path)
  }

  if (definition.paths.memoryFile) {
    const sourcePath = join(
      getPackageRoot(),
      definition.paths.templateDir,
      basename(definition.paths.memoryFile),
    )
    if (existsSync(sourcePath) && !existsSync(definition.paths.memoryFile)) {
      copyFile(sourcePath, definition.paths.memoryFile)
      installed.push(definition.paths.memoryFile)
    }
  }

  return installed
}
