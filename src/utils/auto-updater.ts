import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import ora from 'ora'
import { ensureI18nInitialized, format, i18n } from '../i18n'
import { promptBoolean } from './toggle-prompt'
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion } from './version-checker'

const execAsync = promisify(exec)

export async function updateCcr(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCcrVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:ccrNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:ccrUpToDate'), { version: currentVersion || '' })))
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
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCR' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'CCR' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCR' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @musistudio/claude-code-router')
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCR' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCR' }))
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
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkClaudeCodeVersion()
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

    // Perform update using Claude Code's built-in update command
    // This works for all installation methods (npm, Homebrew, etc.)
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'Claude Code' })).start()

    try {
      await execAsync('claude update')
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

export async function updateCometixLine(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCometixLineVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:cometixLineNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:cometixLineUpToDate'), { version: currentVersion || '' })))
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
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCometixLine' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'CCometixLine' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCometixLine' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @cometix/ccline')
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCometixLine' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' }))
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

  const results: Array<{ tool: string, success: boolean, error?: string }> = []

  // Check and update CCR with error handling
  try {
    const success = await updateCcr(false, skipPrompt)
    results.push({ tool: 'CCR', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCR' })}: ${errorMessage}`))
    results.push({ tool: 'CCR', success: false, error: errorMessage })
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

  console.log() // Empty line

  // Check and update CCometixLine with error handling
  try {
    const success = await updateCometixLine(false, skipPrompt)
    results.push({ tool: 'CCometixLine', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' })}: ${errorMessage}`))
    results.push({ tool: 'CCometixLine', success: false, error: errorMessage })
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
