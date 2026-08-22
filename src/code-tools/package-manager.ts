import type { CodeToolDefinition } from './types'
import { exec } from 'tinyexec'
import { i18n } from '../i18n'
import { commandExists } from '../utils/platform'

export async function detectCodeTool(definition: CodeToolDefinition): Promise<boolean> {
  return commandExists(definition.installation.command)
}

function assertPackageCommandSucceeded(
  result: { exitCode?: number | null },
  method: string,
  definition: CodeToolDefinition,
): void {
  if (result.exitCode === 0)
    return

  throw new Error(i18n.t('errors:packageUpdateFailed', {
    tool: i18n.t(definition.displayNameKey),
    method,
    code: result.exitCode ?? 'unknown',
  }))
}

export async function updateCodeToolPackage(definition: CodeToolDefinition): Promise<void> {
  if (definition.installation.homebrewCask) {
    let ownedByHomebrew = false
    try {
      const listed = await exec('brew', ['list', '--cask', definition.installation.homebrewCask])
      ownedByHomebrew = listed.exitCode === 0
    }
    catch {
      // Fall back to npm when Homebrew is unavailable or does not own the package.
    }

    if (ownedByHomebrew) {
      const upgraded = await exec('brew', ['upgrade', '--cask', definition.installation.homebrewCask])
      assertPackageCommandSucceeded(upgraded, 'homebrew', definition)
      return
    }
  }

  const installed = await exec('npm', ['install', '-g', `${definition.installation.npmPackage}@latest`])
  assertPackageCommandSucceeded(installed, 'npm', definition)
}
