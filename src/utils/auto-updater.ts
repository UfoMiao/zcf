import ansis from 'ansis'
import ora from 'ora'
import semver from 'semver'
import { exec } from 'tinyexec'
import { version } from '../../package.json'
import { ensureI18nInitialized, format, i18n } from '../i18n'
import { shouldUseSudoForGlobalInstall } from './platform'
import { promptBoolean } from './toggle-prompt'
import { checkClaudeCodeVersion, getLatestVersion, handleDuplicateInstallations } from './version-checker'

/** npm package name of this CLI (used for self-update checks) */
const CCS_PACKAGE_NAME = '@xwm111/ccs'

/**
 * Execute a command with sudo support for Linux non-root users.
 * Checks exit code and throws an error if the command fails.
 * @param command - The command to execute
 * @param args - Command arguments
 * @returns Whether sudo was used
 */
export async function execWithSudoIfNeeded(command: string, args: string[]): Promise<{ usedSudo: boolean }> {
  const needsSudo = shouldUseSudoForGlobalInstall()

  if (needsSudo) {
    console.log(ansis.yellow(`\n${i18n.t('updater:usingSudo')}`))
    const result = await exec('sudo', [command, ...args])
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
    }
    return { usedSudo: true }
  }
  else {
    const result = await exec(command, args)
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
    }
    return { usedSudo: false }
  }
}

/**
 * Check whether a newer version of this CLI (ccs) is published on npm and update it.
 */
export async function updateCcsSelf(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const latestVersion = await getLatestVersion(CCS_PACKAGE_NAME)
    spinner.stop()

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    const needsUpdate = semver.valid(latestVersion) && semver.valid(version)
      ? semver.gt(latestVersion, version)
      : latestVersion !== version

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:ccsUpToDate'), { version })))
      return true
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('updater:currentVersion'), { version })))
    console.log(ansis.cyan(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    if (!skipPrompt) {
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'ccs' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'ccs' })))
    }

    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'ccs' })).start()

    try {
      await execWithSudoIfNeeded('npm', ['install', '-g', `${CCS_PACKAGE_NAME}@latest`])
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'ccs' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'ccs' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function updateClaudeCode(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate, isHomebrew } = await checkClaudeCodeVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:claudeCodeNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:claudeCodeUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.cyan(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'Claude Code' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'Claude Code' })))
    }

    // Perform update using appropriate method based on installation type
    const toolName = isHomebrew ? 'Claude Code (Homebrew)' : 'Claude Code'
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: toolName })).start()

    try {
      if (isHomebrew) {
        // Homebrew installation - use brew upgrade (cask), check exit code
        const result = await exec('brew', ['upgrade', '--cask', 'claude-code'])
        if (result.exitCode !== 0) {
          throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
        }
      }
      else {
        // npm or other installation - use claude update with sudo support for Linux non-root users
        await execWithSudoIfNeeded('claude', ['update'])
      }
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function checkAndUpdateTools(skipPrompt = false): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.t('updater:checkingTools')}\n`))

  // Check for duplicate Claude Code installations first
  try {
    const duplicateResult = await handleDuplicateInstallations(skipPrompt)
    if (duplicateResult.hadDuplicates) {
      console.log() // Empty line after duplicate handling
    }
  }
  catch (error) {
    // Don't fail the entire update process if duplicate detection fails
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(ansis.yellow(`⚠ Duplicate installation check failed: ${errorMessage}`))
  }

  const results: Array<{ tool: string, success: boolean, error?: string }> = []

  // Check and update ccs (this CLI) itself
  try {
    const success = await updateCcsSelf(false, skipPrompt)
    results.push({ tool: 'ccs', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'ccs' })}: ${errorMessage}`))
    results.push({ tool: 'ccs', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update Claude Code with error handling
  try {
    const success = await updateClaudeCode(false, skipPrompt)
    results.push({ tool: 'Claude Code', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' })}: ${errorMessage}`))
    results.push({ tool: 'Claude Code', success: false, error: errorMessage })
  }

  // Summary report
  if (skipPrompt) {
    console.log(ansis.bold.cyan(`\n📋 ${i18n.t('updater:updateSummary')}`))
    for (const result of results) {
      if (result.success) {
        console.log(ansis.green(`✔ ${result.tool}: ${i18n.t('updater:success')}`))
      }
      else {
        console.log(ansis.red(`❌ ${result.tool}: ${i18n.t('updater:failed')} ${result.error ? `(${result.error})` : ''}`))
      }
    }
  }
}
